"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import SplashScreen from "@/components/SplashScreen";

const AuthContext = createContext({
  user: null,
  allowedUser: null,
  loading: true,
  verifying: false,
  isAllowed: false,
  isAdmin: false,
  signIn: () => {},
  signOut: () => {},
  signInError: null,
  accessDeniedReason: null,
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [allowedUser, setAllowedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [signInError, setSignInError] = useState(null);
  const [accessDeniedReason, setAccessDeniedReason] = useState(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Check if user is in allowed_users and active
  const checkAllowedUser = useCallback(async (sessionUser) => {
    if (!supabase || !sessionUser) {
      setAllowedUser(null);
      return null;
    }
    setVerifying(true);
    // Safety net: if the query takes > 3s the session is probably stale or the
    // Supabase server is taking a cold start. Clear everything and force a fresh
    // sign-in instead of leaving the user on the confusing "Something went wrong"
    // screen.
    const verifyTimeout = setTimeout(() => {
      console.warn("[Auth] checkAllowedUser timed out — clearing session");
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("sb-"))
          .forEach((k) => localStorage.removeItem(k));
      } catch {}
      setUser(null);
      setAllowedUser(null);
      setAccessDeniedReason(null);
      setVerifying(false);
    }, 3000);
    try {
      const { data, error } = await supabase
        .from("allowed_users")
        .select("*")
        .eq("email", sessionUser.email)
        .maybeSingle();

      if (error) {
        console.error("[Auth] Error checking allowed_users:", error);
        setAllowedUser(null);
        setAccessDeniedReason("Database error");
        return null;
      }

      if (!data) {
        setAllowedUser(null);
        setAccessDeniedReason("not_whitelisted");
        return null;
      }

      if (!data.active) {
        setAllowedUser(data);
        setAccessDeniedReason("disabled");
        return data;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setAllowedUser(data);
        setAccessDeniedReason("expired");
        return data;
      }

      setAllowedUser(data);
      setAccessDeniedReason(null);
      return data;
    } catch (e) {
      console.error("[Auth] Exception checking allowed_users:", e);
      setAllowedUser(null);
      setAccessDeniedReason("error");
      return null;
    } finally {
      clearTimeout(verifyTimeout);
      setVerifying(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // If init hangs (Supabase cold start, stale token refresh, PWA cache, etc.)
    // we forcibly clear the stored session and drop the user back to the Sign In
    // screen rather than leaving them stuck on Loading or showing the misleading
    // "Something went wrong" screen.
    const loadingTimeout = setTimeout(() => {
      console.warn("[Auth] init timed out — clearing stale session");
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("sb-"))
          .forEach((k) => localStorage.removeItem(k));
      } catch {}
      setUser(null);
      setAllowedUser(null);
      setAccessDeniedReason(null);
      setVerifying(false);
      setLoading(false);
    }, 3000);

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          await checkAllowedUser(u);
        }
      } catch (e) {
        console.error("[Auth] init error:", e);
      } finally {
        clearTimeout(loadingTimeout);
        setLoading(false);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          await checkAllowedUser(u);
        } else {
          setAllowedUser(null);
          setAccessDeniedReason(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [checkAllowedUser]);

  const signIn = async (email, password) => {
    setSignInError(null);
    if (!supabase || !email || !password) {
      const error = "Missing email or password";
      setSignInError(error);
      return { error };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setSignInError(error.message);
      return { error: error.message };
    }
    return { error: null };
  };

  const signOut = async () => {
    // Clear UI state immediately so the user sees the Sign In screen even if
    // the Supabase signOut() call hangs (stale PWA bundles + old sessions).
    setUser(null);
    setAllowedUser(null);
    setAccessDeniedReason(null);
    setSignInError(null);
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn("[Auth] signOut error:", e);
    }
    // Belt-and-braces: nuke any stale Supabase tokens from storage so the
    // next reload starts clean even if signOut didn't reach the server.
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sb-"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
  };

  const isAllowed = !!(allowedUser && allowedUser.active &&
    (!allowedUser.expires_at || new Date(allowedUser.expires_at) > new Date()));
  const isAdmin = !!(allowedUser && allowedUser.is_admin && isAllowed);

  return (
    <AuthContext.Provider value={{
      user,
      allowedUser,
      loading,
      verifying,
      isAllowed,
      isAdmin,
      signIn,
      signOut,
      signInError,
      accessDeniedReason,
    }}>
      {showSplash && <SplashScreen />}
      {children}
    </AuthContext.Provider>
  );
}
