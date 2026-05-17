import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { exportToCSV, computeScore, THRUST_AREAS } from "../../lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Download, BarChart3 } from "lucide-react";

const COLORS = ["#0ea5e9", "#f97316", "#10b981", "#a855f7", "#eab308", "#ef4444", "#06b6d4", "#8b5cf6"];

export default function Analytics() {
  const [goals, setGoals] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [{ data: g }, { data: p }] = await Promise.all([
      supabase.from("goals").select("*"),
      supabase.from("profiles").select("*"),
    ]);
    setGoals(g || []);
    setProfiles(p || []);
    setLoading(false);
  }

  // Per thrust area breakdown
  const thrustData = THRUST_AREAS.map((area) => {
    const areaGoals = goals.filter((g) => g.thrust_area === area);
    const approved = areaGoals.filter((g) => g.approval_status === "Approved").length;
    const avg = areaGoals.length
      ? areaGoals.reduce((sum, g) => sum + computeScore(g.uom_type, g.target, g.actual_achievement), 0) / areaGoals.length
      : 0;
    return { name: area.split(" ")[0], total: areaGoals.length, approved, avgScore: Math.round(avg) };
  }).filter((d) => d.total > 0);

  // Status distribution
  const statusData = ["Not Started", "On Track", "At Risk", "Completed"].map((s) => ({
    name: s,
    value: goals.filter((g) => g.status === s).length,
  })).filter((d) => d.value > 0);

  // Per employee scores
  const employeeScores = profiles
    .filter((p) => p.role === "employee")
    .map((p) => {
      const myGoals = goals.filter((g) => g.employee_id === p.id && g.approval_status === "Approved");
      const score = myGoals.length
        ? myGoals.reduce((sum, g) => sum + computeScore(g.uom_type, g.target, g.actual_achievement) * (parseFloat(g.weightage) / 100), 0)
        : 0;
      return { name: p.full_name?.split(" ")[0], score: Math.round(score), goals: myGoals.length };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const customTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-dark-900 border border-slate-700 rounded-xl p-3 text-xs font-body">
          <p className="text-slate-300 font-display font-600">{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  async function exportReport() {
    const report = goals.map((g) => {
      const emp = profiles.find((p) => p.id === g.employee_id);
      return {
        Employee: emp?.full_name || "—",
        Department: emp?.department || "—",
        ThrustArea: g.thrust_area,
        Goal: g.title,
        UoM: g.uom_type,
        Target: g.target,
        Actual: g.actual_achievement || "—",
        Score: computeScore(g.uom_type, g.target, g.actual_achievement).toFixed(0) + "%",
        Status: g.status,
        Weightage: g.weightage + "%",
        ApprovalStatus: g.approval_status,
      };
    });
    exportToCSV(report, "goal_achievement_report.csv");
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
            <BarChart3 size={18} className="text-brand-400" />
          </div>
          <div>
            <h1 className="font-display font-800 text-2xl text-slate-100">Analytics</h1>
            <p className="text-slate-500 text-sm">{goals.length} goals across {profiles.length} users</p>
          </div>
        </div>
        <button onClick={exportReport} className="btn-secondary flex items-center gap-2">
          <Download size={15} />
          Export Achievement Report
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-dark-900 rounded-2xl animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Goals by Thrust Area */}
          <div className="card">
            <h3 className="font-display font-600 text-slate-100 mb-4">Goals by Thrust Area</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={thrustData}>
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip content={customTooltip} />
                <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Total" />
                <Bar dataKey="approved" fill="#10b981" radius={[4, 4, 0, 0]} name="Approved" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status Distribution */}
          <div className="card">
            <h3 className="font-display font-600 text-slate-100 mb-4">Status Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={customTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Employee Scores */}
          <div className="card md:col-span-2">
            <h3 className="font-display font-600 text-slate-100 mb-4">Employee Weighted Scores (Top 10)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={employeeScores} layout="vertical">
                <XAxis type="number" domain={[0, 120]} tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} width={80} />
                <Tooltip content={customTooltip} />
                <Bar dataKey="score" fill="#f97316" radius={[0, 4, 4, 0]} name="Score %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}