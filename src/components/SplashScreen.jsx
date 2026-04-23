"use client";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900 overflow-hidden">
      {/* Portrait image for phones */}
      <div
        className="absolute inset-0 bg-cover bg-center md:hidden"
        style={{ backgroundImage: "url('/splash-portrait.jpg')" }}
      />
      {/* Landscape image for tablet/desktop */}
      <div
        className="absolute inset-0 bg-cover bg-center hidden md:block"
        style={{ backgroundImage: "url('/splash.jpg')" }}
      />

      {/* Subtle bottom gradient so the loading dots read cleanly */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-900/80 to-transparent" />

      <div className="absolute inset-x-0 bottom-10 flex justify-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse [animation-delay:0.15s]" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse [animation-delay:0.3s]" />
      </div>
    </div>
  );
}
