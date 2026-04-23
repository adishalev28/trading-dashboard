"use client";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/splash.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-slate-900/20" />

      <div className="relative z-10 flex flex-col items-center gap-4 px-6 text-center">
        <img
          src="/icon-192.png"
          alt="בוליש"
          className="w-20 h-20 rounded-2xl shadow-2xl ring-1 ring-white/10"
        />
        <div>
          <div className="text-3xl font-bold text-white tracking-tight">בוליש</div>
          <div className="text-sm text-slate-300 mt-1">Minervini VCP · Weinstein Stage 2</div>
        </div>
        <div className="mt-4 flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse [animation-delay:0.15s]" />
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse [animation-delay:0.3s]" />
        </div>
      </div>
    </div>
  );
}
