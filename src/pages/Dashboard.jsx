import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Link } from "react-router-dom";
import ProgressBar from "../components/ProgressBar";
import StatusBadge from "../components/StatusBadge";
import { Target, TrendingUp, CheckCircle, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { computeScore, getCurrentQuarter } from "../lib/utils";

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, completed: 0 });
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) loadDashboard();
  }, [profile]);

  async function loadDashboard() {
    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("employee_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5);
    setGoals(data || []);
    const all = data || [];
    setStats({
      total: all.length,
      approved: all.filter((g) => g.approval_status === "Approved").length,
      pending: all.filter((g) => g.approval_status === "Pending").length,
      completed: all.filter((g) => g.status === "Completed").length,
    });
    setLoading(false);
  }

  const overallScore = goals.length
    ? goals.reduce((sum, g) => {
        const s = computeScore(g.uom_type, g.target, g.actual_achievement);
        return sum + s * (parseFloat(g.weightage) / 100);
      }, 0)
    : 0;

  const statCards = [
    {
      label: "Total Goals",
      value: stats.total,
      icon: Target,
      color: "text-brand-400",
      bg: "bg-brand-500/10",
    },
    {
      label: "Approved",
      value: stats.approved,
      icon: CheckCircle,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Pending Review",
      value: stats.pending,
      icon: Clock,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: TrendingUp,
      color: "text-accent-400",
      bg: "bg-accent-500/10",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display font-800 text-3xl text-slate-100">
          Welcome, {profile?.full_name?.split(" ")[0]} 👋
        </h1>
        <p className="text-slate-500 font-body mt-1">
          {getCurrentQuarter()} is active — keep your goals on track
        </p>
      </div>

      {/* Overall Score */}
      <div className="card bg-gradient-to-br from-brand-500/10 to-accent-500/5 border-brand-500/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-slate-400 font-body">Overall Weighted Score</p>
            <p className="font-display font-800 text-5xl text-slate-100 mt-1">
              {overallScore.toFixed(1)}
              <span className="text-2xl text-slate-500">%</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-2">Target: 100%</p>
            <div className={`tag border text-lg font-display font-700 ${overallScore >= 100 ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" : "bg-brand-500/10 text-brand-400 border-brand-500/20"}`}>
              {overallScore >= 100 ? "🎯 Achieved" : "🚀 In Progress"}
            </div>
          </div>
        </div>
        <ProgressBar
          value={overallScore}
          max={100}
          showLabel={false}
          color={overallScore >= 100 ? "emerald" : "brand"}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="font-display font-700 text-2xl text-slate-100">{value}</p>
            <p className="text-sm text-slate-500 font-body mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent Goals */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-700 text-lg text-slate-100">Recent Goals</h2>
          <Link
            to="/my-goals"
            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-body"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-10">
            <Target size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 font-body">No goals yet</p>
            <Link to="/create-goal" className="btn-primary mt-4 inline-flex">
              Create Your First Goal
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 transition-all"
              >
                <div className="flex-1">
                  <p className="text-sm font-display font-600 text-slate-200">{goal.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{goal.thrust_area}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-body">{goal.weightage}%</span>
                  <StatusBadge status={goal.approval_status || "Pending"} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}