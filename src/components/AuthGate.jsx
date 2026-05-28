"use client";

import { useAuth } from "@/components/AuthProvider";
import LoginScreen from "@/components/LoginScreen";
import AccessDenied from "@/components/AccessDenied";

/**
 * AuthGate: protects entire app behind authentication + whitelist check.
 *
 * States:
 *   - loading      → show splash/skeleton
 *   - no user      → show LoginScreen
 *   - user but not allowed (disabled / expired / not whitelisted) → AccessDenied
 *   - user + allowed → render children (the actual app)
 */
export default function AuthGate({ children }) {
  const { user, loading, isAllowed, accessDeniedReason } = useAuth();

  // Loading state
  if (loading) {
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
