"use client";

import { useEffect, useRef, useState, useId } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink } from "lucide-react";

const TV_SCRIPT_SRC = "https://s3.tradingview.com/tv.js";

function loadTvScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.TradingView) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${TV_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = TV_SCRIPT_SRC;
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function TradingViewModal({ ticker, companyName, onClose }) {
  const [mounted, setMounted] = useState(false);
  const reactId = useId();
  const containerId = `tv_chart_${reactId.replace(/:/g, "")}`;
  const containerRef = useRef(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!ticker) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [ticker, onClose]);

  useEffect(() => {
    if (!ticker || !containerRef.current) return;
    let cancelled = false;

    loadTvScript()
      .then(() => {
        if (cancelled || !window.TradingView || !containerRef.current) return;
        containerRef.current.innerHTML = "";
        new window.TradingView.widget({
          autosize: true,
          symbol: ticker,
          interval: "D",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: containerId,
          studies: ["MASimple@tv-basicstudies"],
          backgroundColor: "rgba(15, 23, 42, 1)",
          gridColor: "rgba(51, 65, 85, 0.4)",
          hide_side_toolbar: false,
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [ticker, containerId]);

  if (!mounted || !ticker) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${ticker} chart`}
    >
      <div
        className="relative w-full max-w-6xl h-[90vh] sm:h-[85vh] bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-100 font-mono-nums">
                {ticker}
              </span>
              <a
                href={`https://www.tradingview.com/symbols/${ticker}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-emerald-400 transition-colors"
                aria-label="Open full chart on TradingView"
                title="Open full chart on TradingView"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            {companyName && (
              <div className="text-[11px] text-slate-500 truncate">
                {companyName}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div
          ref={containerRef}
          id={containerId}
          className="flex-1 w-full"
        />
      </div>
    </div>,
    document.body
  );
}
