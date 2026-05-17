import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getRoleFromEmail } from "../lib/azure";
import Logo from "../components/Logo";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Processing sign in...");
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      const hashParams = new URLSearchParams(window.location.hash.replace("#", ""));
      const searchParams = new URLSearchParams(window.location.search);

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error") || hashParams.get("error");
      const errorDesc = searchParams.get("error_description") || hashParams.get("error_description");

      if (errorParam) {
        setErrorMsg(`Sign in failed: ${errorDesc || errorParam}`);
        setTimeout(() => navigate("/login"), 3000);
        return;
      }

      let session = null;

      if (accessToken && refreshToken) {
        setStatus("Setting up session...");
        const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error || !data?.session) {
          setErrorMsg("Could not establish session. Please try again.");
          setTimeout(() => navigate("/login"), 3000);
          return;
        }
        session = data.session;
      } else if (code) {
        setStatus("Exchanging authorization code...");
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data?.session) {
          setErrorMsg("Could not exchange code. Please try again.");
          setTimeout(() => navigate("/login"), 3000);
          return;
        }
        session = data.session;
      } else {
        setStatus("Checking session...");
        await new Promise((r) => setTimeout(r, 1000));
        const { data, error } = await supabase.auth.getSession();
        if (error || !data?.session) {
          setErrorMsg("No session found. Please sign in again.");
          setTimeout(() => navigate("/login"), 3000);
          return;
        }
        session = data.session;
      }

      const user = session.user;
      setStatus("Setting up your profile...");

      const role = getRoleFromEmail(user.email);
      await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.preferred_username || user.email.split("@")[0],
        role,
        department: user.user_metadata?.department || null,
      }, { onConflict: "id" });

      setStatus("Done! Taking you to the dashboard...");
      await new Promise((r) => setTimeout(r, 300));
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Callback error:", err);
      setErrorMsg("Something went wrong. Please try again.");
      setTimeout(() => navigate("/login"), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl" />
      </div>

      <div className="card max-w-sm w-full text-center py-12 space-y-6 relative">

        {/* LOGO */}
        <Logo size={56} className="rounded-2xl mx-auto shadow-lg" />

        {errorMsg ? (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>
            <p className="font-display font-600 text-red-400 text-sm px-4">{errorMsg}</p>
            <p className="text-xs text-slate-500 font-body">Redirecting to login...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative w-12 h-12 mx-auto">
              <div className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-accent-500 border-b-transparent rounded-full animate-spin" />
              </div>
            </div>
            <div>
              <p className="font-display font-600 text-slate-100">{status}</p>
              <p className="text-xs text-slate-500 font-body mt-1">Via Microsoft Entra ID</p>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-800 flex items-center justify-center gap-2">
          <svg width="14" height="14" viewBox="0 0 21 21" fill="none">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          <p className="text-xs text-slate-500 font-body">Secured by Microsoft Entra ID</p>
        </div>
      </div>
    </div>
  );
}