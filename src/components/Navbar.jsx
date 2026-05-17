import React from "react";
import { Menu, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getCurrentQuarter } from "../lib/utils";
import NotificationBell from "./NotificationBell";

export default function Navbar({ onToggleSidebar }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const quarter = getCurrentQuarter();

  return (
    <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-dark-950/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="text-slate-400 hover:text-slate-100 transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="tag bg-brand-500/10 text-brand-400 border border-brand-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse-dot" />
          {quarter} Active
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Real notification bell */}
        <NotificationBell />

        <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-display font-600 text-slate-100 leading-none">
              {profile?.full_name || "User"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 capitalize">
              {profile?.role}
            </p>
          </div>

          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-xs font-display font-700">
            {profile?.full_name?.[0] || "U"}
          </div>

          <button
            onClick={handleSignOut}
            className="text-slate-500 hover:text-red-400 transition-colors"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}