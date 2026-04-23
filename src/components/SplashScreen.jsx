"use client";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex items-center justify-center">
      <img
        src="/icon-512.png"
        alt="Bullish"
        className="w-32 h-32 rounded-3xl shadow-2xl ring-1 ring-white/10 animate-pulse"
      />
    </div>
  );
}
