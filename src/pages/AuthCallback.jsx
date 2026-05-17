import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getRoleFromEmail } from "../lib/azure";
import { Zap } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Completing sign in...");
  const [errorMsg, setErrorMsg] = useState(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const errorParam = searchParams.get("error");
      const errorDesc = searchParams.get("error_description");

      if (errorParam) {
        setErrorMsg(`Sign in failed: ${errorDesc || errorParam}`);
        setTimeout(() => navigate("/login", { replace: true }), 3000);
        return;
      }

      // With Web platform in Azure, Supabase exchanges the code
      // server-side and sets the session before redirecting here.
      // We just need to read the existing session.
      setStatus("Reading session...");

      // Give Supabase a moment to finish setting the session
      await new Promise((r) => setTimeout(r, 1000));

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        console.error("No session:", error);
        setErrorMsg("Session not found. Please sign in again.");
        setTimeout(() => navigate("/login", { replace: true }), 3000);
        return;
      }

      setStatus("Setting up your profile...");
      const user = session.user;
      const role = getRoleFromEmail(user.email);

      await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        full_name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email.split("@")[0],
        role,
        department: user.user_metadata?.department || null,
      }, { onConflict: "id" });

      setStatus("Done! Taking you to the dashboard...");
      navigate("/", { replace: true });

    } catch (err) {
      console.error("Callback error:", err);
      setErrorMsg("Something went wrong. Please try again.");
      setTimeout(() => navigate("/login", { replace: true }), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl" />
      </div>
      <div className="card max-w-sm w-full text-center py-12 space-y-6 relative">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 items-center justify-center mx-auto shadow-lg shadow-brand-500/25">
          <Zap size={26} className="text-white" />
        </div>

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