import "@/styles/globals.css";
import Sidebar, { MobileTabBar } from "@/components/Sidebar";
import AuthProvider from "@/components/AuthProvider";

export const metadata = {
  title: "בוליש",
  description: "סקרינר מומנטום — Minervini VCP + Weinstein Stage 2",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "בוליש",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" className="h-full">
      <body className="bg-slate-900 text-slate-100 min-h-screen">
        <AuthProvider>
          <Sidebar />
          <MobileTabBar />
          <main className="md:ml-60">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
