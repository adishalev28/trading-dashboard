"use client";

import { useState } from "react";
import { RefreshCw, Check, AlertCircle } from "lucide-react";

/**
 * Refresh Data button — triggers GitHub Actions workflow via /api/refresh
 * Shows status: idle → loading → success/error
 */
export default function RefreshButton() {
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  const handleRefresh = async () => {
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setMessage("Refresh triggered! Data updates in ~2 min.");
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to trigger refresh");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Network error");
    }

    setTimeout(() => {
      setStatus("idle");
      setMessage("");
    }, 8000);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleRefresh}
        disabled={status === "loading"}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
          status === "loading"
            ? "bg-slate-800 border-slate-700 text-slate-400 cursor-wait"
            : status === "success"
            ? "bg-emerald-950 border-emerald-700 text-emerald-400"
            : status === "error"
            ? "bg-rose-950 border-rose-700 text-rose-400"
            : "bg-slate-800 border-slate-700 text-slate-300 hover:border-emerald-700 hover:text-emerald-400"
        }`}
      >
        {status === "loading" && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
        {status === "success" && <Check className="w-3.5 h-3.5" />}
        {status === "error" && <AlertCircle className="w-3.5 h-3.5" />}
        {status === "idle" && <RefreshCw className="w-3.5 h-3.5" />}
        {status === "loading" ? "Refreshing..." : status === "success" ? "Triggered!" : "Refresh Data"}
      </button>
      {message && (
        <span className={`text-[10px] ${status === "error" ? "text-rose-400" : "text-emerald-400"}`}>
          {message}
        </span>
      )}
    </div>
  );
}
