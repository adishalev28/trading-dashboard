"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw, Check, AlertCircle, Clock, Loader2 } from "lucide-react";

const POLL_INTERVAL_MS = 15000;     // Poll workflow status every 15s
const POLL_TIMEOUT_MS = 10 * 60_000; // Stop polling after 10 min (workflow timeout is 25)
const STORAGE_KEY = "refresh_active_run";

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const generated = new Date(dateStr.replace(" ", "T") + "Z");
  const now = new Date();
  const diffMs = now - generated;
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}

function elapsedSince(startedAt) {
  if (!startedAt) return "";
  const diff = Date.now() - new Date(startedAt).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

/**
 * Refresh Data button — triggers GitHub Actions workflow and polls until complete.
 *
 * States:
 *   idle      → grey,   "Refresh Data" / "Updated 23m ago"
 *   running   → orange, "Refreshing... 1m 30s" (animated spinner)
 *   success   → green,  "Just updated ✓" (5 sec, then back to idle)
 *   error     → red,    "Refresh failed" (with click-to-retry)
 *
 * State persists across page reloads via localStorage — if you click refresh
 * and reload the page, the orange "running" state continues until completion.
 */
export default function RefreshButton({ generatedAt }) {
  const [status, setStatus] = useState("idle"); // idle | running | success | error
  const [message, setMessage] = useState("");
  const [activeRun, setActiveRun] = useState(null); // { startedAt, runId } when running
  const pollTimerRef = useRef(null);
  const pollStartRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollStartRef.current = null;
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/refresh/status", { cache: "no-store" });
      const data = await res.json();

      if (data.error) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }, []);

  const startPolling = useCallback((runStartedAt, runId) => {
    stopPolling();
    pollStartRef.current = Date.now();

    const tick = async () => {
      // Timeout safeguard
      if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
        stopPolling();
        setStatus("error");
        setMessage("Timed out waiting for workflow");
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      const data = await checkStatus();
      if (!data) return; // Network blip — keep polling

      // We're tracking the run that was triggered. Ignore older runs.
      // If the API returned a run with id < ours, ignore (shouldn't happen but defensive).
      if (runId && data.runId && data.runId < runId) {
        return;
      }

      if (data.status === "completed") {
        stopPolling();
        localStorage.removeItem(STORAGE_KEY);
        setActiveRun(null);

        if (data.conclusion === "success") {
          setStatus("success");
          setMessage("Data refreshed!");
          // Reload page data — Next.js will refetch the static props
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          setStatus("error");
          setMessage(`Workflow ${data.conclusion || "failed"}`);
          setTimeout(() => {
            setStatus("idle");
            setMessage("");
          }, 8000);
        }
      }
      // queued | in_progress → keep polling, button stays orange
    };

    // Tick immediately, then every interval
    tick();
    pollTimerRef.current = setInterval(tick, POLL_INTERVAL_MS);
  }, [checkStatus, stopPolling]);

  // On mount: resume polling if a run was active when page reloaded.
  // setState in this effect is intentional — we're subscribing to external
  // state (localStorage) on first render.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const { startedAt, runId } = JSON.parse(stored);
      // Stale state safeguard: if older than 30 min, drop it
      if (Date.now() - new Date(startedAt).getTime() > 30 * 60_000) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      setActiveRun({ startedAt, runId });
      setStatus("running");
      startPolling(startedAt, runId);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }

    return () => stopPolling();
  }, [startPolling, stopPolling]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Force re-render every second while running so elapsed time updates
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  const handleRefresh = async () => {
    if (status === "running") return; // No-op if already running

    setStatus("running");
    setMessage("");
    const startedAt = new Date().toISOString();

    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const data = await res.json();

      if (!data.success) {
        setStatus("error");
        setMessage(data.error || "Failed to trigger refresh");
        setTimeout(() => {
          setStatus("idle");
          setMessage("");
        }, 8000);
        return;
      }

      // Trigger accepted. The workflow run isn't queryable for ~2-3 sec —
      // wait briefly, then start polling. Use startedAt as our marker.
      const initialRun = { startedAt, runId: null };
      setActiveRun(initialRun);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialRun));

      setTimeout(() => {
        startPolling(startedAt, null);
      }, 3000);
    } catch (err) {
      setStatus("error");
      setMessage("Network error");
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 8000);
    }
  };

  const age = timeAgo(generatedAt);
  const isStale = (() => {
    if (!generatedAt) return false;
    const generated = new Date(generatedAt.replace(" ", "T") + "Z");
    return (new Date() - generated) > 24 * 60 * 60 * 1000;
  })();

  return (
    <div className="flex items-center gap-3">
      {age && status !== "running" && status !== "success" && (
        <div className={`flex items-center gap-1 text-[11px] ${isStale ? "text-amber-400" : "text-slate-500"}`}>
          <Clock className="w-3 h-3" />
          <span>Updated {age}</span>
          {isStale && <span className="text-amber-500 font-bold">· Stale</span>}
        </div>
      )}
      <button
        onClick={handleRefresh}
        disabled={status === "running"}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
          status === "running"
            ? "bg-amber-950 border-amber-600 text-amber-300 cursor-wait animate-pulse"
            : status === "success"
            ? "bg-emerald-950 border-emerald-600 text-emerald-300"
            : status === "error"
            ? "bg-rose-950 border-rose-700 text-rose-400 hover:border-rose-500"
            : "bg-slate-800 border-slate-700 text-slate-300 hover:border-emerald-700 hover:text-emerald-400"
        }`}
      >
        {status === "running" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {status === "success" && <Check className="w-3.5 h-3.5" />}
        {status === "error" && <AlertCircle className="w-3.5 h-3.5" />}
        {status === "idle" && <RefreshCw className="w-3.5 h-3.5" />}
        {status === "running"
          ? `Refreshing... ${activeRun?.startedAt ? elapsedSince(activeRun.startedAt) : ""}`
          : status === "success"
          ? "Just updated ✓"
          : status === "error"
          ? "Retry"
          : "Refresh Data"}
      </button>
      {message && (
        <span className={`text-[10px] ${status === "error" ? "text-rose-400" : status === "success" ? "text-emerald-400" : "text-amber-400"}`}>
          {message}
        </span>
      )}
    </div>
  );
}
