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

  // Check if user is in allowed_users and active.
  //
  // We deliberately bypass supabase-js for this query and use native fetch +
  // AbortController. Reason: under certain conditions (rapid sign-in events,
  // tab focus changes, parallel auth state subscribers) supabase-js can get
  // into a state where `.from(...).select()` returns a promise that never
  // resolves or rejects — the network request is never even dispatched. We
  // observed this directly: the auth POST succeeded (200) but the follow-up
  // GET to /rest/v1/allowed_users never appeared in the network log, and the
  // promise hung until our timeout fired. Native fetch behaves predictably.
  const checkAllowedUser = useCallback(async (sessionUser, accessToken) => {
    if (!sessionUser?.email) {
      setAllowedUser(null);
      return null;
    }
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("[Auth] Missing Supabase env vars");
      setAllowedUser(null);
      return null;
    }

    const myKey = ++verifyKeyRef.current;
    const isCurrent = () => verifyKeyRef.current === myKey;

    setVerifying(true);

    // If the caller didn't pass a token, try to grab one from the current
    // session. getSession reads from localStorage — no network — so it's safe.
    let token = accessToken;
    if (!token && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;
      } catch {}
    }
    if (!isCurrent()) return null;

    // Hard 10s timeout via AbortController. If supabase-js or the network is
    // genuinely broken, we abort fast and let the UI recover, rather than
    // dragging users through a 15s spinner.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const url =
        `${SUPABASE_URL}/rest/v1/allowed_users` +
        `?select=*&email=eq.${encodeURIComponent(sessionUser.email)}`;
      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: token ? `Bearer ${token}` : `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: "application/json",
        },
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);

      if (!isCurrent()) return null;

      if (!res.ok) {
        console.error("[Auth] allowed_users HTTP", res.status);
        setAllowedUser(null);
        setAccessDeniedReason("Database error");
        return null;
      }

      const rows = await res.json();
      if (!isCurrent()) return null;

      const data = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

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
      clearTimeout(timeoutId);
      if (!isCurrent()) return null;
      if (e?.name === "AbortError") {
        console.warn("[Auth] allowed_users fetch aborted after 10s");
        setAccessDeniedReason("timeout");
      } else {
        console.error("[Auth] allowed_users fetch error:", e);
        setAccessDeniedReason("error");
      }
      setAllowedUser(null);
      return null;
    } finally {
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
          // Pass the access token directly so checkAllowedUser doesn't have
          // to round-trip back through supabase-js to find it.
          await checkAllowedUser(u, session?.access_token);
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
          await checkAllowedUser(u, session?.access_token);
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
