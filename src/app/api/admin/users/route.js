/**
 * Admin API: Create user
 *
 * POST /api/admin/users
 * Body: { email, password, name, expires_at?, is_admin? }
 *
 * Requires:
 *   - Caller must be authenticated as admin (checked via JWT)
 *   - Uses SUPABASE_SERVICE_ROLE_KEY to create auth user
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function badRequest(message) {
  return Response.json({ error: message }, { status: 400 });
}
function forbidden(message) {
  return Response.json({ error: message }, { status: 403 });
}
function serverError(message) {
  return Response.json({ error: message }, { status: 500 });
}

async function verifyAdmin(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const accessToken = authHeader.slice(7);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;

  // Use service role client to verify the user's JWT
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error } = await admin.auth.getUser(accessToken);
  if (error || !user) return null;

  // Check if user is admin in allowed_users
  const { data: allowed, error: allowedError } = await admin
    .from("allowed_users")
    .select("*")
    .eq("email", user.email)
    .maybeSingle();
  if (allowedError || !allowed || !allowed.is_admin || !allowed.active) return null;

  return { user, allowed, admin };
}

export async function POST(request) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return serverError("Server not configured (missing SUPABASE_SERVICE_ROLE_KEY)");
  }

  const auth = await verifyAdmin(request.headers.get("authorization"));
  if (!auth) return forbidden("Admin access required");

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const { email, password, name, expires_at, is_admin, notes } = body || {};
  if (!email || !password) return badRequest("email and password are required");
  if (password.length < 8) return badRequest("password must be at least 8 characters");

  const { admin } = auth;

  // Step 1: create auth user
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email verification
  });
  if (createError) {
    if (createError.message?.includes("already")) {
      return badRequest("A user with this email already exists");
    }
    return serverError(createError.message || "Failed to create auth user");
  }

  // Step 2: insert allowed_users row
  const { data: allowedRow, error: insertError } = await admin
    .from("allowed_users")
    .insert({
      email,
      name: name || null,
      active: true,
      is_admin: !!is_admin,
      expires_at: expires_at || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (insertError) {
    // Rollback: try to delete the auth user we just created
    try { await admin.auth.admin.deleteUser(created.user.id); } catch {}
    return serverError(insertError.message || "Failed to add to whitelist");
  }

  return Response.json({ user: allowedRow }, { status: 201 });
}

export async function DELETE(request) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return serverError("Server not configured");
  }
  const auth = await verifyAdmin(request.headers.get("authorization"));
  if (!auth) return forbidden("Admin access required");

  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  if (!email) return badRequest("Missing email query param");
  if (email === auth.user.email) return badRequest("Cannot delete yourself");

  const { admin } = auth;

  // Step 1: delete allowed_users row
  const { error: deleteAllowedError } = await admin
    .from("allowed_users")
    .delete()
    .eq("email", email);
  if (deleteAllowedError) return serverError(deleteAllowedError.message);

  // Step 2: find auth user and delete (best-effort)
  try {
    const { data: list } = await admin.auth.admin.listUsers();
    const target = list?.users?.find((u) => u.email === email);
    if (target) {
      await admin.auth.admin.deleteUser(target.id);
    }
  } catch (e) {
    console.warn("[admin/users] Could not delete auth user:", e);
  }

  return Response.json({ success: true });
}
