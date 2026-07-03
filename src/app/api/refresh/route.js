/**
 * POST /api/refresh
 *
 * Triggers the GitHub Actions "Refresh Market Data" workflow.
 * Single-user mode: no auth, no quota — just dispatches the workflow.
 */
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

function json(body, status = 200) {
  return Response.json(body, { status });
}

export async function POST() {
  if (!GITHUB_TOKEN) {
    return json({ error: "GITHUB_TOKEN not configured" }, 500);
  }

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
      return json({ error: `GitHub API ${res.status}: ${errorText}` }, 500);
    }
  } catch (err) {
    return json({ error: `Network error: ${err.message}` }, 500);
  }

  return json({
    success: true,
    message: "Data refresh triggered. Updated data will appear in ~2 minutes.",
  });
}
