"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import LoginScreen from "@/components/LoginScreen";
import AccessDenied from "@/components/AccessDenied";

/**
 * AuthGate: protects entire app behind authentication + whitelist check.
 *
 * States:
 *   - loading or verifying → show splash/skeleton
 *   - no user              → show LoginScreen
 *   - user but not allowed → AccessDenied
 *   - user + allowed       → render children
 */
export default function AuthGate({ children }) {
  const { user, loading, verifying, isAllowed, accessDeniedReason } = useAuth();

  // Show different messages depending on how long we've been waiting, so the
  // user knows we're actively working on cold-start cases (Supabase free tier
  // can take 5-15s on the first request after inactivity).
  //
  // Only block the UI on verifying when we don't yet have a known-good
  // allowed user. supabase-js re-fires SIGNED_IN / TOKEN_REFRESHED on tab
  // focus, screen wake, etc., which retriggers checkAllowedUser. If the user
  // is already verified, that's a background refresh — keep showing the app.
  const [waitedSeconds, setWaitedSeconds] = useState(0);
  const isWaiting = loading || (verifying && !isAllowed);
  useEffect(() => {
    if (!isWaiting) {
      setWaitedSeconds(0);
      return;
    }
    const id = setInterval(() => setWaitedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isWaiting]);

  if (isWaiting) {
    const message =
      waitedSeconds < 3
        ? "Loading..."
        : waitedSeconds < 8
        ? "Verifying access..."
        : "Server is waking up (first load can take a few seconds)...";
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin mb-4" />
          <div className="text-slate-400 text-sm">{message}</div>
        </div>
      </div>
    );
  }

  // Not authenticated → show login
  if (!user) {
    return <LoginScreen />;
  }

  // Authenticated but not allowed → show access denied
  if (!isAllowed || accessDeniedReason) {
    return <AccessDenied />;
  }

  // All good → render app
  return children;
}
