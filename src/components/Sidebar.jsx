"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Grid3x3, List, Calculator, Briefcase, TrendingUp } from "lucide-react";

const navItems = [
  { href: "/overview",   label: "Overview",   Icon: LayoutDashboard },
  { href: "/sectors",    label: "Sectors",    Icon: Grid3x3 },
  { href: "/watchlist",  label: "Watchlist",  Icon: List },
  { href: "/risk",       label: "Risk Calc",  Icon: Calculator },
  { href: "/portfolio",  label: "Portfolio",  Icon: Briefcase },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-slate-950 border-r border-slate-800 flex flex-col z-50 hidden md:flex">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-100 leading-tight">TCC</div>
            <div className="text-[10px] text-slate-400 leading-tight">Trading Command Center</div>
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

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-800">
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
