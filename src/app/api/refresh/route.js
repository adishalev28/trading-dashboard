/**
 * POST /api/refresh
 * Triggers the GitHub Actions "Refresh Market Data" workflow
 * which runs fetch_data.py → updates mockData.json → auto-deploys
 */
export async function POST() {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return Response.json(
      { error: "GITHUB_TOKEN not configured" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      "https://api.github.com/repos/adishalev28/trading-dashboard/actions/workflows/refresh-data.yml/dispatches",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main" }),
      }
    );

    if (res.status === 204) {
      return Response.json({
        success: true,
        message: "Data refresh triggered. Updated data will appear in ~2 minutes.",
      });
    }

    const errorText = await res.text();
    return Response.json(
      { error: `GitHub API returned ${res.status}: ${errorText}` },
      { status: res.status }
    );
  } catch (err) {
    return Response.json(
      { error: `Failed to trigger refresh: ${err.message}` },
      { status: 500 }
    );
  }
}
