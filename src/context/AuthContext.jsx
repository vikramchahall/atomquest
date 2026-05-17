import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext({});

const EMAIL_ROLE_MAP = {
  "employee@demo.com": "employee",
  "manager@demo.com": "manager",
  "admin@demo.com": "admin",
};

function deriveRole(email = "") {
  const e = email.toLowerCase();
  if (EMAIL_ROLE_MAP[e]) return EMAIL_ROLE_MAP[e];
  if (e.includes("admin") || e.includes("hr")) return "admin";
  if (e.includes("manager") || e.includes("lead")) return "manager";
  return "employee";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        if (_event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          return;
        }

        if (_event === "SIGNED_IN" && session?.user) {
          setUser(session.user);
          await fetchProfile(session.user);
          return;
        }

        if (_event === "TOKEN_REFRESHED" && session?.user) {
          setUser(session.user);
        }
      }
    );

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

      // First login — create profile
      const fallback = {
        id: authUser.id,
        email: authUser.email,
        full_name:
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          authUser.email.split("@")[0],
        role: deriveRole(authUser.email),
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