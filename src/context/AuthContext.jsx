import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Get initial session ONCE
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user).then(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    // Listen for changes but NEVER set loading=true here
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (_event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        // loading stays false
        return;
      }
      if (_event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        fetchProfile(session.user);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(authUser) {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
        return;
      }

      // No profile row — create one
      const fallback = {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || authUser.email.split("@")[0],
        role: authUser.user_metadata?.role || "employee",
        manager_id: null,
        department: null,
      };
      await supabase.from("profiles").upsert(fallback, { onConflict: "id" });
      setProfile(fallback);
    } catch (err) {
      console.error("fetchProfile:", err);
      setProfile({
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.email.split("@")[0],
        role: "employee",
        manager_id: null,
        department: null,
      });
    }
  }

  async function signIn(email, password) {
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (!result.error && result.data?.user) {
      setUser(result.data.user);
      await fetchProfile(result.data.user);
    }
    return result;
  }

  async function signOut() {
    setUser(null);
    setProfile(null);
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);