import "@/styles/globals.css";
import Sidebar, { MobileTabBar } from "@/components/Sidebar";

export const metadata = {
  title: "Trading Command Center",
  description: "Momentum screener — Minervini VCP + Weinstein Stage 2",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" className="h-full">
      <body className="bg-slate-900 text-slate-100 min-h-screen">
        <Sidebar />
        <MobileTabBar />
        <main className="md:ml-60">{children}</main>
      </body>
    </html>
  );
}
