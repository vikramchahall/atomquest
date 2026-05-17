import { supabase } from "./supabase";

const EMAIL_ROLE_MAP = {
  "employee@demo.com": "employee",
  "manager@demo.com": "manager",
  "admin@demo.com": "admin",
};

export function getRoleFromEmail(email = "") {
  if (!email) return "employee";
  const e = email.toLowerCase();
  if (EMAIL_ROLE_MAP[e]) return EMAIL_ROLE_MAP[e];
  if (e.includes("admin") || e.includes("hr")) return "admin";
  if (e.includes("manager") || e.includes("lead")) return "manager";
  return "employee";
}

export async function signInWithAzure() {
  const isLocal = window.location.hostname === "localhost";
  const base = isLocal
    ? "http://localhost:5173"
    : "https://atomquest-ten.vercel.app";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "azure",
    options: {
      scopes: "openid profile email User.Read",
      // Supabase handles the code exchange on its servers,
      // then redirects the user here
      redirectTo: `${base}/auth/callback`,
      queryParams: {
        prompt: "select_account",
      },
    },
  });
  return { data, error };
}