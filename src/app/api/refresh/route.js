/**
 * POST /api/refresh
 *
 * Triggers the GitHub Actions "Refresh Market Data" workflow.
 *
 * Auth + rate limit rules:
 *   - Caller must be authenticated and in allowed_users (active=true).
 *   - Admins: unlimited refreshes.
 *   - Non-admins: max DAILY_QUOTA per calendar day (UTC).
 *
 * Each successful trigger is logged to refresh_log for quota tracking.
 *
 * GET /api/refresh — returns current quota state for the caller.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const DAILY_QUOTA = 3; // Non-admin refresh limit per day

function json(body, status = 200) {
  return Response.json(body, { status });
}

async function verifyCaller(authHeader) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return { error: "Server not configured" };
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Authentication required" };
  }
  const accessToken = authHeader.slice(7);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error } = await admin.auth.getUser(accessToken);
  if (error || !user) return { error: "Invalid session" };

  const { data: allowed, error: allowedError } = await admin
    .from("allowed_users")
    .select("*")
    .eq("email", user.email)
    .maybeSingle();
  if (allowedError) return { error: "Could not verify access" };
  if (!allowed) return { error: "Not on whitelist" };
  if (!allowed.active) return { error: "Access disabled" };
  if (allowed.expires_at && new Date(allowed.expires_at) < new Date()) {
    return { error: "Access expired" };
  }
  return { user, allowed, admin };
}

async function countTodayRefreshes(admin, email) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const { count, error } = await admin
    .from("refresh_log")
    .select("*", { count: "exact", head: true })
    .eq("user_email", email)
    .gte("triggered_at", today.toISOString());
  if (error) return null;
  return count ?? 0;
}

export async function GET(request) {
  const verified = await verifyCaller(request.headers.get("authorization"));
  if (verified.error) return json({ error: verified.error }, 401);

  const { allowed, admin } = verified;
  const usedToday = await countTodayRefreshes(admin, verified.user.email);
  const remaining = allowed.is_admin ? "unlimited" : Math.max(0, DAILY_QUOTA - (usedToday ?? 0));

  return json({
    isAdmin: !!allowed.is_admin,
    quota: allowed.is_admin ? null : DAILY_QUOTA,
    usedToday: usedToday ?? 0,
    remaining,
  });
}

export async function POST(request) {
  if (!GITHUB_TOKEN) {
    return json({ error: "GITHUB_TOKEN not configured" }, 500);
  }

  const verified = await verifyCaller(request.headers.get("authorization"));
  if (verified.error) return json({ error: verified.error }, 401);

  const { allowed, admin, user } = verified;

  // Quota check for non-admins
  if (!allowed.is_admin) {
    const usedToday = await countTodayRefreshes(admin, user.email);
    if (usedToday === null) {
      return json({ error: "Could not verify quota. Try again." }, 500);
    }
    if (usedToday >= DAILY_QUOTA) {
      return json({
        error: `Daily refresh quota exceeded (${DAILY_QUOTA}/day). Try again tomorrow.`,
        usedToday,
        quota: DAILY_QUOTA,
        remaining: 0,
      }, 429);
    }
  }

  // Trigger the workflow
  let workflowError = null;
  try {
    const res = await fetch(
      "https://api.github.com/repos/adishalev28/trading-dashboard/actions/workflows/refresh-data.yml/dispatches",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main" }),
      }
    );
    if (res.status !== 204) {
      const errorText = await res.text();
      workflowError = `GitHub API ${res.status}: ${errorText}`;
    }
  } catch (err) {
    workflowError = `Network error: ${err.message}`;
  }

  // Log the attempt (whether success or failure)
  try {
    await admin.from("refresh_log").insert({
      user_email: user.email,
      is_admin: !!allowed.is_admin,
      status: workflowError ? "failed" : "triggered",
      error: workflowError || null,
    });
  } catch (e) {
    console.warn("[refresh] Could not log:", e);
  }

  if (workflowError) {
    return json({ error: workflowError }, 500);
  }

  const usedAfter = allowed.is_admin
    ? null
    : (await countTodayRefreshes(admin, user.email)) ?? 0;
  const remainingAfter = allowed.is_admin
    ? "unlimited"
    : Math.max(0, DAILY_QUOTA - usedAfter);

  return json({
    success: true,
    message: "Data refresh triggered. Updated data will appear in ~2 minutes.",
    quota: allowed.is_admin ? null : DAILY_QUOTA,
    usedToday: usedAfter,
    remaining: remainingAfter,
  });
}
