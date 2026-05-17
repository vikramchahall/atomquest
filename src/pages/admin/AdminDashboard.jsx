import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Link } from "react-router-dom";
import ProgressBar from "../../components/ProgressBar";
import { Users, Target, CheckCircle, AlertTriangle, ArrowRight, Shield } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const [{ count: users }, { count: goals }, { count: pending }, { count: approved }] =
      await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("goals").select("id", { count: "exact", head: true }),
        supabase.from("goals").select("id", { count: "exact", head: true }).eq("approval_status", "Pending"),
        supabase.from("goals").select("id", { count: "exact", head: true }).eq("approval_status", "Approved"),
      ]);
    setStats({ users, goals, pending, approved });
    setLoading(false);
  }

  const cards = [
    { label: "Total Users", value: stats.users || 0, icon: Users, color: "text-brand-400", bg: "bg-brand-500/10", to: "/users" },
    { label: "Total Goals", value: stats.goals || 0, icon: Target, color: "text-accent-400", bg: "bg-accent-500/10", to: "/analytics" },
    { label: "Pending Approval", value: stats.pending || 0, icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10", to: "/approve" },
    { label: "Approved Goals", value: stats.approved || 0, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", to: "/analytics" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <Shield size={18} className="text-purple-400" />
        </div>
        <div>
          <h1 className="font-display font-800 text-2xl text-slate-100">Admin Overview</h1>
          <p className="text-slate-500 text-sm">System-wide statistics and controls</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, bg, to }) => (
          <Link key={label} to={to} className="card hover:border-slate-700 transition-all group">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="font-display font-700 text-3xl text-slate-100">{loading ? "—" : value}</p>
            <p className="text-sm text-slate-500 font-body mt-0.5">{label}</p>
            <ArrowRight size={14} className="text-slate-700 group-hover:text-slate-400 mt-2 transition-colors" />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/cycles" className="card hover:border-brand-500/20 transition-all group">
          <h3 className="font-display font-600 text-slate-100 mb-1">Cycle Manager</h3>
          <p className="text-sm text-slate-500 font-body">Configure goal-setting windows and quarterly check-in schedules</p>
          <ArrowRight size={14} className="text-slate-700 group-hover:text-brand-400 mt-3 transition-colors" />
        </Link>
        <Link to="/audit" className="card hover:border-purple-500/20 transition-all group">
          <h3 className="font-display font-600 text-slate-100 mb-1">Audit Trail</h3>
          <p className="text-sm text-slate-500 font-body">View all system events, goal changes, and user actions</p>
          <ArrowRight size={14} className="text-slate-700 group-hover:text-purple-400 mt-3 transition-colors" />
        </Link>
      </div>
    </div>
  );
}