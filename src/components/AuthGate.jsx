"use client";

import { useAuth } from "@/components/AuthProvider";
import LoginScreen from "@/components/LoginScreen";
import AccessDenied from "@/components/AccessDenied";

/**
 * AuthGate: protects entire app behind authentication + whitelist check.
 *
 * States:
 *   - loading or verifying → show splash/skeleton (no premature AccessDenied flash)
 *   - no user              → show LoginScreen
 *   - user but not allowed → AccessDenied
 *   - user + allowed       → render children
 */
export default function AuthGate({ children }) {
  const { user, loading, verifying, isAllowed, accessDeniedReason } = useAuth();

  // Loading or verifying state — show neutral loading screen instead of
  // briefly flashing "Something went wrong" between sign-in and the
  // allowed_users check completing.
  if (loading || verifying) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Loading...</div>
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
