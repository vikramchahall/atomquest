import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { exportToCSV, computeScore, THRUST_AREAS, UOM_TYPES } from "../../lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from "recharts";
import { Download, BarChart3, TrendingUp, Users, Target, Award } from "lucide-react";

const COLORS = ["#0ea5e9","#f97316","#10b981","#a855f7","#eab308","#ef4444","#06b6d4","#8b5cf6"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-900 border border-slate-700 rounded-xl p-3 text-xs font-body shadow-xl">
      <p className="text-slate-300 font-display font-600 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

function StatCard({ label, value, sub, icon: Icon, color, bg }) {
  return (
    <div className="card">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        <Icon size={18} className={color} />
      </div>
      <p className="font-display font-800 text-3xl text-slate-100">{value}</p>
      <p className="text-sm text-slate-400 font-body mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}

export default function Analytics() {
  const [goals, setGoals] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: g }, { data: p }, { data: c }] = await Promise.all([
      supabase.from("goals").select("*"),
      supabase.from("profiles").select("*"),
      supabase.from("quarterly_checkins").select("*"),
    ]);
    setGoals(g || []);
    setProfiles(p || []);
    setCheckins(c || []);
    setLoading(false);
  }

  // ── Derived data ──────────────────────────────────────────

  const employees = profiles.filter(p => p.role === "employee");
  const managers = profiles.filter(p => p.role === "manager");
  const approvedGoals = goals.filter(g => g.approval_status === "Approved");
  const avgScore = approvedGoals.length
    ? approvedGoals.reduce((s, g) => s + computeScore(g.uom_type, g.target, g.actual_achievement), 0) / approvedGoals.length
    : 0;

  // Thrust area breakdown
  const thrustData = THRUST_AREAS.map(area => {
    const ag = goals.filter(g => g.thrust_area === area);
    const approved = ag.filter(g => g.approval_status === "Approved");
    const avg = approved.length
      ? approved.reduce((s, g) => s + computeScore(g.uom_type, g.target, g.actual_achievement), 0) / approved.length
      : 0;
    return {
      name: area.split(" ").slice(0, 2).join(" "),
      fullName: area,
      total: ag.length,
      approved: approved.length,
      avgScore: Math.round(avg),
    };
  }).filter(d => d.total > 0);

  // Status distribution
  const statusData = ["Not Started", "On Track", "At Risk", "Completed"].map(s => ({
    name: s,
    value: goals.filter(g => g.status === s).length,
  })).filter(d => d.value > 0);

  // UoM distribution
  const uomData = UOM_TYPES.map(u => ({
    name: u.label.split("—")[0].trim(),
    value: goals.filter(g => g.uom_type === u.value).length,
  })).filter(d => d.value > 0);

  // Per-employee scores
  const employeeScores = employees.map(emp => {
    const myGoals = goals.filter(g => g.employee_id === emp.id && g.approval_status === "Approved");
    const score = myGoals.length
      ? myGoals.reduce((s, g) => s + computeScore(g.uom_type, g.target, g.actual_achievement) * (parseFloat(g.weightage) / 100), 0)
      : 0;
    const submitted = goals.filter(g => g.employee_id === emp.id && g.approval_status !== "Draft").length;
    return {
      name: emp.full_name?.split(" ")[0] || "?",
      fullName: emp.full_name,
      score: Math.round(score),
      goals: myGoals.length,
      submitted,
      dept: emp.department || "—",
    };
  }).sort((a, b) => b.score - a.score);

  // Manager effectiveness
  const managerEffectiveness = managers.map(mgr => {
    const team = profiles.filter(p => p.manager_id === mgr.id);
    const teamIds = team.map(t => t.id);
    const totalCheckins = checkins.filter(c => teamIds.includes(c.employee_id) && c.checkin_done).length;
    const pendingApprovals = goals.filter(g => g.manager_id === mgr.id && g.approval_status === "Pending").length;
    const approvedCount = goals.filter(g => g.manager_id === mgr.id && g.approval_status === "Approved").length;
    return {
      name: mgr.full_name?.split(" ")[0] || "?",
      fullName: mgr.full_name,
      teamSize: team.length,
      checkinsDone: totalCheckins,
      pendingApprovals,
      approvedCount,
      rate: team.length > 0 ? Math.round((approvedCount / Math.max(team.length, 1)) * 100) : 0,
    };
  });

  // Department heatmap data
  const departments = [...new Set(profiles.map(p => p.department).filter(Boolean))];
  const deptData = departments.map(dept => {
    const deptEmps = profiles.filter(p => p.department === dept);
    const deptGoals = goals.filter(g => deptEmps.some(e => e.id === g.employee_id) && g.approval_status === "Approved");
    const submitted = goals.filter(g => deptEmps.some(e => e.id === g.employee_id) && g.approval_status !== "Draft").length;
    const avg = deptGoals.length
      ? deptGoals.reduce((s, g) => s + computeScore(g.uom_type, g.target, g.actual_achievement), 0) / deptGoals.length
      : 0;
    return {
      name: dept,
      employees: deptEmps.length,
      goals: deptGoals.length,
      avgScore: Math.round(avg),
      submitted,
    };
  });

  // QoQ simulated trend (using quarters on goals)
  const quarterTrend = ["Q1","Q2","Q3","Q4"].map(q => {
    const qCheckins = checkins.filter(c => c.quarter === q && c.actual_achievement);
    const avgAch = qCheckins.length
      ? qCheckins.reduce((s, c) => {
          const goal = goals.find(g => g.id === c.goal_id);
          if (!goal) return s;
          return s + computeScore(goal.uom_type, goal.target, c.actual_achievement);
        }, 0) / qCheckins.length
      : 0;
    return { quarter: q, avgScore: Math.round(avgAch), checkins: qCheckins.length };
  });

  async function exportReport() {
    const report = goals.map(g => {
      const emp = profiles.find(p => p.id === g.employee_id);
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

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "employees", label: "Employees" },
    { id: "departments", label: "Departments" },
    { id: "managers", label: "Manager Effectiveness" },
    { id: "trends", label: "QoQ Trends" },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
            <BarChart3 size={18} className="text-brand-400" />
          </div>
          <div>
            <h1 className="font-display font-800 text-2xl text-slate-100">Analytics</h1>
            <p className="text-slate-500 text-sm">{goals.length} goals · {profiles.length} users · FY 2025–26</p>
          </div>
        </div>
        <button onClick={exportReport} className="btn-secondary flex items-center gap-2">
          <Download size={15} /> Export Report
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Goals" value={goals.length} sub={`${approvedGoals.length} approved`} icon={Target} color="text-brand-400" bg="bg-brand-500/10" />
        <StatCard label="Avg Score" value={`${avgScore.toFixed(0)}%`} sub="across approved goals" icon={TrendingUp} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Employees" value={employees.length} sub={`${managers.length} managers`} icon={Users} color="text-accent-400" bg="bg-accent-500/10" />
        <StatCard label="Check-ins Done" value={checkins.filter(c => c.checkin_done).length} sub="this cycle" icon={Award} color="text-purple-400" bg="bg-purple-500/10" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-display font-600 transition-all ${activeTab === t.id ? "bg-brand-500 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Thrust area */}
          <div className="card">
            <h3 className="font-display font-600 text-slate-100 mb-1">Goals by Thrust Area</h3>
            <p className="text-xs text-slate-500 font-body mb-4">Total vs approved count</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={thrustData}>
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                <Bar dataKey="total" fill="#0ea5e9" radius={[4,4,0,0]} name="Total" />
                <Bar dataKey="approved" fill="#10b981" radius={[4,4,0,0]} name="Approved" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status pie */}
          <div className="card">
            <h3 className="font-display font-600 text-slate-100 mb-1">Status Distribution</h3>
            <p className="text-xs text-slate-500 font-body mb-4">Goal status breakdown</p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={65} outerRadius={95}
                  dataKey="value" nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                  labelLine={{ stroke: "#334155" }}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* UoM distribution */}
          <div className="card">
            <h3 className="font-display font-600 text-slate-100 mb-1">UoM Distribution</h3>
            <p className="text-xs text-slate-500 font-body mb-4">Breakdown by measurement type</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={uomData} layout="vertical">
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#a855f7" radius={[0,4,4,0]} name="Goals" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Avg score by thrust area */}
          <div className="card">
            <h3 className="font-display font-600 text-slate-100 mb-1">Avg Score by Thrust Area</h3>
            <p className="text-xs text-slate-500 font-body mb-4">Achievement % per category</p>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={thrustData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 9 }} />
                <Radar name="Avg Score" dataKey="avgScore" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.15} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Employees Tab ── */}
      {activeTab === "employees" && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-display font-600 text-slate-100 mb-1">Employee Weighted Scores</h3>
            <p className="text-xs text-slate-500 font-body mb-4">Sorted by performance score (top 15)</p>
            <ResponsiveContainer width="100%" height={Math.max(employeeScores.length * 40, 200)}>
              <BarChart data={employeeScores.slice(0, 15)} layout="vertical">
                <XAxis type="number" domain={[0, 120]} tick={{ fill: "#64748b", fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} width={70} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" radius={[0,4,4,0]} name="Score %" minPointSize={3}>
                  {employeeScores.slice(0,15).map((e, i) => (
                    <Cell key={i} fill={e.score >= 100 ? "#10b981" : e.score >= 75 ? "#0ea5e9" : e.score >= 50 ? "#eab308" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Employee table */}
          <div className="card overflow-hidden p-0">
            <div className="p-4 border-b border-slate-800">
              <h3 className="font-display font-600 text-slate-100">Employee Performance Table</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  {["Employee","Dept","Goals","Score","Submitted"].map(h => (
                    <th key={h} className="text-left text-xs text-slate-500 font-display p-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employeeScores.map((e, i) => (
                  <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-display font-700 ${i === 0 ? "bg-yellow-500" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-amber-700" : "bg-gradient-to-br from-brand-500 to-accent-500"}`}>
                          {i < 3 ? ["🥇","🥈","🥉"][i] : e.name[0]}
                        </div>
                        <span className="text-sm text-slate-200 font-body">{e.fullName}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-400 font-body">{e.dept}</td>
                    <td className="p-4 text-sm font-display font-600 text-slate-300">{e.goals}</td>
                    <td className="p-4">
                      <span className={`font-display font-700 text-sm ${e.score >= 100 ? "text-emerald-400" : e.score >= 75 ? "text-brand-400" : e.score >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                        {e.score}%
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-400 font-body">{e.submitted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Departments Tab ── */}
      {activeTab === "departments" && (
        <div className="space-y-6">
          {/* Heatmap-style grid */}
          <div className="card">
            <h3 className="font-display font-600 text-slate-100 mb-1">Department Heatmap</h3>
            <p className="text-xs text-slate-500 font-body mb-5">Avg achievement score by department</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {deptData.map((d, i) => {
                const intensity = d.avgScore / 100;
                const bg = d.avgScore >= 100 ? "bg-emerald-500/20 border-emerald-500/30" :
                           d.avgScore >= 75 ? "bg-brand-500/20 border-brand-500/30" :
                           d.avgScore >= 50 ? "bg-yellow-500/20 border-yellow-500/30" :
                           d.avgScore > 0 ? "bg-red-500/20 border-red-500/30" : "bg-slate-800/50 border-slate-700";
                const textColor = d.avgScore >= 100 ? "text-emerald-400" :
                                  d.avgScore >= 75 ? "text-brand-400" :
                                  d.avgScore >= 50 ? "text-yellow-400" :
                                  d.avgScore > 0 ? "text-red-400" : "text-slate-500";
                return (
                  <div key={d.name} className={`p-4 rounded-xl border ${bg} text-center`}>
                    <p className="font-display font-700 text-sm text-slate-200 mb-1">{d.name}</p>
                    <p className={`font-display font-800 text-3xl ${textColor}`}>{d.avgScore}%</p>
                    <p className="text-xs text-slate-500 mt-1">{d.employees} emp · {d.goals} goals</p>
                  </div>
                );
              })}
              {deptData.length === 0 && (
                <div className="col-span-4 text-center py-10 text-slate-500 font-body">
                  No department data yet. Assign departments to users first.
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="font-display font-600 text-slate-100 mb-4">Department Comparison</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deptData}>
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                <Bar dataKey="employees" fill="#0ea5e9" radius={[4,4,0,0]} name="Employees" />
                <Bar dataKey="avgScore" fill="#f97316" radius={[4,4,0,0]} name="Avg Score %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Manager Effectiveness Tab ── */}
      {activeTab === "managers" && (
        <div className="space-y-6">
          <div className="card overflow-hidden p-0">
            <div className="p-4 border-b border-slate-800">
              <h3 className="font-display font-600 text-slate-100">Manager Effectiveness Dashboard</h3>
              <p className="text-xs text-slate-500 font-body mt-1">Check-in completion rates and approval stats per L1 manager</p>
            </div>
            {managerEffectiveness.length === 0 ? (
              <div className="p-10 text-center text-slate-500 font-body">No managers found.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    {["Manager","Team Size","Pending Approvals","Goals Approved","Check-ins","Approval Rate"].map(h => (
                      <th key={h} className="text-left text-xs text-slate-500 font-display p-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {managerEffectiveness.map((m, i) => (
                    <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-xs font-display font-700">
                            {m.name[0]}
                          </div>
                          <span className="text-sm text-slate-200 font-body">{m.fullName}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm font-display font-600 text-slate-300">{m.teamSize}</td>
                      <td className="p-4">
                        <span className={`font-display font-700 text-sm ${m.pendingApprovals > 0 ? "text-yellow-400" : "text-emerald-400"}`}>
                          {m.pendingApprovals}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-display font-600 text-slate-300">{m.approvedCount}</td>
                      <td className="p-4 text-sm font-display font-600 text-slate-300">{m.checkinsDone}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-800 rounded-full h-1.5 w-16">
                            <div className="h-1.5 rounded-full bg-brand-500 transition-all" style={{ width: `${Math.min(m.rate, 100)}%` }} />
                          </div>
                          <span className={`text-xs font-display font-700 ${m.rate >= 80 ? "text-emerald-400" : m.rate >= 50 ? "text-brand-400" : "text-yellow-400"}`}>
                            {m.rate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h3 className="font-display font-600 text-slate-100 mb-4">Manager Comparison Chart</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={managerEffectiveness}>
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                <Bar dataKey="approvedCount" fill="#10b981" radius={[4,4,0,0]} name="Approved" />
                <Bar dataKey="pendingApprovals" fill="#eab308" radius={[4,4,0,0]} name="Pending" />
                <Bar dataKey="checkinsDone" fill="#0ea5e9" radius={[4,4,0,0]} name="Check-ins" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── QoQ Trends Tab ── */}
      {activeTab === "trends" && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-display font-600 text-slate-100 mb-1">Quarter-on-Quarter Achievement Trend</h3>
            <p className="text-xs text-slate-500 font-body mb-4">Average achievement score per quarter</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={quarterTrend}>
                <XAxis dataKey="quarter" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis domain={[0, 120]} tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                <Line type="monotone" dataKey="avgScore" stroke="#0ea5e9" strokeWidth={2.5} dot={{ fill: "#0ea5e9", r: 5 }} name="Avg Score %" activeDot={{ r: 7 }} />
                <Line type="monotone" dataKey="checkins" stroke="#f97316" strokeWidth={2} dot={{ fill: "#f97316", r: 4 }} name="Check-ins Logged" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quarterTrend.map(q => (
              <div key={q.quarter} className="card text-center">
                <p className="font-display font-700 text-brand-400 text-xs uppercase tracking-wider">{q.quarter}</p>
                <p className="font-display font-800 text-3xl text-slate-100 mt-2">
                  {q.avgScore > 0 ? `${q.avgScore}%` : "—"}
                </p>
                <p className="text-xs text-slate-500 mt-1">{q.checkins} check-ins</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}