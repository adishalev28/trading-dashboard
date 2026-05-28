"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
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

  // Each checkAllowedUser invocation gets a unique key. Only the LATEST call
  // writes back to state — older parallel calls (from onAuthStateChange races
  // when supabase fires SIGNED_IN / TOKEN_REFRESHED / USER_UPDATED at once)
  // resolve quietly and never trip their own timeout cleanup. Without this,
  // a single successful sign-in could be wiped by 3+ stale 15s timeouts.
  const verifyKeyRef = useRef(0);

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
    const myKey = ++verifyKeyRef.current;
    const isCurrent = () => verifyKeyRef.current === myKey;

    setVerifying(true);
    // Safety net: 15 seconds is enough for even the slowest Supabase free-tier
    // cold start. If the query is still hanging after that, the session is
    // probably broken — clear everything and force a fresh sign-in.
    // BUT: only fire if we're still the latest call. A newer checkAllowedUser
    // supersedes us and is responsible for its own outcome.
    const verifyTimeout = setTimeout(() => {
      if (!isCurrent()) return;
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
    }, 15000);
    try {
      const { data, error } = await supabase
        .from("allowed_users")
        .select("*")
        .eq("email", sessionUser.email)
        .maybeSingle();

      if (!isCurrent()) return null; // a newer call superseded us — ignore our result

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
      if (isCurrent()) {
        setAllowedUser(null);
        setAccessDeniedReason("error");
      }
      return null;
    } finally {
      clearTimeout(verifyTimeout);
      if (isCurrent()) setVerifying(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // If init hangs (Supabase cold start, stale token refresh, PWA cache, etc.)
    // we eventually give up so the UI doesn't stay on Loading forever. Cold
    // starts on Supabase's free tier can legitimately take 10-15s, so we let
    // init breathe for 15s before bailing.
    //
    // IMPORTANT: we don't wipe user/allowedUser here. Race conditions in
    // supabase-js can make init()'s await hang even after onAuthStateChange
    // successfully set up the session. Wiping state would kick a logged-in
    // user back to the login screen for no reason. Just stop the spinner.
    const loadingTimeout = setTimeout(() => {
      console.warn("[Auth] init timed out — stopping spinner (session state preserved)");
      setLoading(false);
    }, 15000);

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
