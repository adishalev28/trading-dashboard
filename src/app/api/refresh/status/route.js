/**
 * GET /api/refresh/status
 * Returns the status of the most recent "Refresh Market Data" workflow run.
 *
 * Response:
 *   { status: "queued" | "in_progress" | "completed",
 *     conclusion: "success" | "failure" | null,
 *     startedAt: ISO string,
 *     runId: number,
 *     htmlUrl: string }
 */
export async function GET() {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return Response.json(
      { error: "GITHUB_TOKEN not configured" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      "https://api.github.com/repos/adishalev28/trading-dashboard/actions/workflows/refresh-data.yml/runs?per_page=1",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      return Response.json(
        { error: `GitHub API returned ${res.status}: ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const latest = data.workflow_runs?.[0];

    if (!latest) {
      return Response.json({ status: "none" });
    }

    return Response.json({
      status: latest.status,             // queued | in_progress | completed
      conclusion: latest.conclusion,     // success | failure | cancelled | null (when running)
      startedAt: latest.run_started_at,
      updatedAt: latest.updated_at,
      runId: latest.id,
      htmlUrl: latest.html_url,
      event: latest.event,               // workflow_dispatch | schedule
    });
  } catch (err) {
    return Response.json(
      { error: `Failed to fetch status: ${err.message}` },
      { status: 500 }
    );
  }
}
