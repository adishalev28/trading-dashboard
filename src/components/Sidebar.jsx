"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Grid3x3, List, Calculator, Briefcase, TrendingUp, LogIn, LogOut, Cloud, Mail, Check } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

const navItems = [
  { href: "/overview",   label: "Overview",   Icon: LayoutDashboard },
  { href: "/sectors",    label: "Sectors",    Icon: Grid3x3 },
  { href: "/watchlist",  label: "Watchlist",  Icon: List },
  { href: "/risk",       label: "Risk Calc",  Icon: Calculator },
  { href: "/portfolio",  label: "Portfolio",  Icon: Briefcase },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, loading, signIn, signOut, magicLinkSent } = useAuth();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-slate-950 border-r border-slate-800 flex flex-col z-50 hidden md:flex">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <img src="/icon-192.png" alt="Bullish" className="w-9 h-9 rounded-lg" />
          <div>
            <div className="font-bold text-slate-100 leading-tight text-lg">Bullish</div>
            <div className="text-[10px] text-slate-400 leading-tight">Minervini · Weinstein</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4">
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href || (href === "/overview" && pathname === "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                active
                  ? "bg-slate-800 text-emerald-400 border-l-2 border-emerald-500"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border-l-2 border-transparent"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Auth + Footer */}
      <div className="px-6 py-4 border-t border-slate-800 space-y-3">
        {!loading && (
          user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <Cloud className="w-3 h-3" />
                <span className="truncate">{user.email}</span>
              </div>
              <button
                onClick={signOut}
                className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                <LogOut className="w-3 h-3" />
                Sign out
              </button>
            </div>
          ) : magicLinkSent ? (
            <div className="flex items-center gap-2 text-xs text-emerald-400 px-2 py-2">
              <Check className="w-4 h-4" />
              Check your email!
            </div>
          ) : (
            <form onSubmit={async (e) => { e.preventDefault(); setSending(true); await signIn(email); setSending(false); }} className="space-y-2">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:border-emerald-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={sending || !email}
                className="flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-emerald-400 transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-slate-900 disabled:opacity-50"
              >
                <Mail className="w-3 h-3" />
                {sending ? "Sending..." : "Send magic link"}
              </button>
            </form>
          )
        )}
        <div className="text-[10px] text-slate-500">
          Minervini VCP × Weinstein Stage 2
        </div>
      </div>
    </aside>
  );
}

/** Mobile bottom tab bar — shown < md */
export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-slate-950 border-t border-slate-800 flex md:hidden z-50">
      {navItems.map(({ href, label, Icon }) => {
        const active = pathname === href || (href === "/overview" && pathname === "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 ${
              active ? "text-emerald-400" : "text-slate-500"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
