"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import SplashScreen from "@/components/SplashScreen";

const AuthContext = createContext({
  user: null,
  allowedUser: null,
  loading: true,
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
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

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
    if (!supabase) return;
    await supabase.auth.signOut();
    setAllowedUser(null);
    setAccessDeniedReason(null);
    setSignInError(null);
  };

  const isAllowed = !!(allowedUser && allowedUser.active &&
    (!allowedUser.expires_at || new Date(allowedUser.expires_at) > new Date()));
  const isAdmin = !!(allowedUser && allowedUser.is_admin && isAllowed);

  return (
    <AuthContext.Provider value={{
      user,
      allowedUser,
      loading,
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
