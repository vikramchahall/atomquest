import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { signInWithAzure } from "../lib/azure";
import toast from "react-hot-toast";
import { Eye, EyeOff, Shield, ChevronRight } from "lucide-react";


import logo from "../assets/logo.png";

function MicrosoftIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 21 21" fill="none">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [azureLoading, setAzureLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const { signIn, signOut, user, profile, loading } = useAuth();
  const navigate = useNavigate();

  // While auth is initializing, show nothing (ProtectedRoute handles the spinner)
  if (loading) return null;

  // Already logged in — show who's signed in with option to switch
  if (user && profile) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl" />
        </div>
        <div className="w-full max-w-md relative">
          <div className="text-center mb-8">
            <img src={logo} alt="Logo" className="w-16 h-16 rounded-2xl mx-auto mb-5 object-contain shadow-2xl" />
            <h1 className="font-display font-800 text-4xl text-slate-100 tracking-tight">
              AtomQuest
            </h1>
          </div>
          <div className="card space-y-4 text-center">
            <p className="text-slate-400 font-body text-sm">Already signed in as</p>
            <div className="py-2">
              <p className="text-slate-100 font-display font-700 text-lg">{profile.full_name}</p>
              <p className="text-slate-500 font-body text-xs mt-1">{profile.email}</p>
              <span className="inline-block mt-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-body capitalize">
                {profile.role}
              </span>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => navigate("/")}
                className="btn-primary w-full"
              >
                Continue to Dashboard →
              </button>
              <button
                onClick={async () => {
                  await signOut();
                  localStorage.clear();
                  sessionStorage.clear();
                }}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-body text-sm transition-all"
              >
                Sign out &amp; switch account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isDisabled = submitting || azureLoading;

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error(error.message || "Sign in failed. Check your credentials.");
      setSubmitting(false);
    } else {
      navigate("/", { replace: true });
    }
  };

  const handleAzureLogin = async () => {
    setAzureLoading(true);
    try {
      const { error } = await signInWithAzure();
      if (error) {
        toast.error("Microsoft sign-in failed: " + error.message);
        setAzureLoading(false);
      }
    } catch (err) {
      toast.error("Microsoft sign-in failed");
      setAzureLoading(false);
    }
  };

  const demoLogins = [
    { label: "Employee", email: "employee@demo.com", password: "demo1234", color: "text-brand-400" },
    { label: "Manager",  email: "manager@demo.com",  password: "demo1234", color: "text-accent-400" },
    { label: "Admin",    email: "admin@demo.com",    password: "demo1234", color: "text-purple-400" },
  ];

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">

          <img
            src={logo}
            alt="AtomQuest Logo"
            className="w-16 h-16 rounded-2xl mx-auto mb-5 object-contain shadow-2xl"
          />
          <h1 className="font-display font-800 text-4xl text-slate-100 tracking-tight">
            AtomQuest
          </h1>
          <p className="text-slate-500 font-body mt-2">
            Goal Setting &amp; Performance Portal
          </p>
        </div>

        <div className="card space-y-5">
          {/* Microsoft SSO */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleAzureLogin}
              disabled={isDisabled}
              className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-100 font-body font-500 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {azureLoading ? (
                <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <MicrosoftIcon />
              )}
              <span>
                {azureLoading ? "Redirecting to Microsoft..." : "Continue with Microsoft"}
              </span>
              {!azureLoading && (
                <ChevronRight size={14} className="text-slate-500 ml-auto group-hover:text-slate-300 transition-colors" />
              )}
            </button>
            <div className="flex items-center justify-center gap-1.5">
              <Shield size={10} className="text-brand-400" />
              <p className="text-xs text-slate-600 font-body">
                Microsoft Entra ID — shows account picker each time
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-xs text-slate-600 font-body px-1">or</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Demo quick access */}
          <div>
            <p className="text-xs text-slate-500 font-body mb-3 text-center">
              Quick Demo Access
            </p>
            <div className="grid grid-cols-3 gap-2">
              {demoLogins.map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => {
                    setEmail(d.email);
                    setPassword(d.password);
                    setShowEmailForm(true);
                  }}
                  disabled={isDisabled}
                  className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl bg-slate-800/60 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition-all disabled:opacity-50"
                >
                  <span className={`font-display font-700 text-sm ${d.color}`}>
                    {d.label}
                  </span>
                  <span className="text-xs text-slate-600 font-body">demo</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-2 font-body text-center">
              Click role → credentials fill → Sign In below
            </p>
          </div>

          {/* Email form */}
          <div
            className={`overflow-hidden transition-all duration-300 ${
              showEmailForm ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <form onSubmit={handleLogin} className="space-y-4 pt-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-xs text-slate-600 font-body">email sign in</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>
              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="input-field"
                  required
                  disabled={isDisabled}
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field pr-10"
                    required
                    disabled={isDisabled}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isDisabled}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {submitting && (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {submitting ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>

          {!showEmailForm && (
            <button
              type="button"
              onClick={() => setShowEmailForm(true)}
              className="w-full text-xs text-slate-600 hover:text-slate-400 font-body transition-colors py-1"
            >
              Sign in with email instead →
            </button>
          )}
        </div>

        <div className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
          <p className="text-xs text-slate-600 font-body text-center leading-relaxed">
            <strong className="text-slate-500">Production flow:</strong> Azure AD
            group claims → automatic role mapping. Demo uses email-based role assignment.
          </p>
        </div>
      </div>
    </div>
  );
}