import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Link } from "react-router-dom";
import ProgressBar from "../components/ProgressBar";
import StatusBadge from "../components/StatusBadge";
import {
  Target, TrendingUp, CheckCircle, Clock, AlertTriangle,
  ArrowRight, ChevronRight, Info, Users, BarChart3
} from "lucide-react";
import { computeScore, getCurrentQuarter } from "../lib/utils";

function FlowStep({ number, title, description, to, buttonLabel, status, disabled }) {
  return (
    <div className={`flex gap-4 p-4 rounded-xl border transition-all ${
      status === "done" ? "bg-emerald-500/5 border-emerald-500/20" :
      status === "active" ? "bg-brand-500/5 border-brand-500/30" :
      "bg-slate-800/20 border-slate-800"
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-display font-700 flex-shrink-0 ${
        status === "done" ? "bg-emerald-500 text-white" :
        status === "active" ? "bg-brand-500 text-white" :
        "bg-slate-700 text-slate-400"
      }`}>
        {status === "done" ? "✓" : number}
      </div>
      <div className="flex-1">
        <p className={`font-display font-600 text-sm ${status === "done" ? "text-emerald-400" : status === "active" ? "text-slate-100" : "text-slate-500"}`}>{title}</p>
        <p className="text-xs text-slate-500 font-body mt-0.5">{description}</p>
        {status === "active" && to && (
          <Link to={to} className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 mt-2 font-body">
            {buttonLabel} <ChevronRight size={11} />
          </Link>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, completed: 0, draft: 0 });
  const [goals, setGoals] = useState([]);
  const [teamStats, setTeamStats] = useState({ members: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const quarter = getCurrentQuarter();

  useEffect(() => {
    if (profile) loadDashboard();
  }, [profile]);

  async function loadDashboard() {
    const { data } = await supabase
      .from("goals").select("*")
      .eq("employee_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5);
    const all = data || [];
    setGoals(all);
    setStats({
      total: all.length,
      approved: all.filter((g) => g.approval_status === "Approved").length,
      pending: all.filter((g) => g.approval_status === "Pending").length,
      completed: all.filter((g) => g.status === "Completed").length,
      draft: all.filter((g) => g.approval_status === "Draft").length,
    });

    if (profile.role === "manager" || profile.role === "admin") {
      const { data: members } = await supabase.from("profiles").select("id").eq("manager_id", profile.id);
      const { count: pendingCount } = await supabase.from("goals").select("id", { count: "exact", head: true }).eq("manager_id", profile.id).eq("approval_status", "Pending");
      setTeamStats({ members: members?.length || 0, pending: pendingCount || 0 });
    }
    setLoading(false);
  }

  const overallScore = goals.filter(g => g.approval_status === "Approved").length
    ? goals.filter(g => g.approval_status === "Approved").reduce((sum, g) => {
        const s = computeScore(g.uom_type, g.target, g.actual_achievement);
        return sum + s * (parseFloat(g.weightage) / 100);
      }, 0)
    : 0;

  // Determine flow step
  const hasDraft = stats.draft > 0;
  const hasPending = stats.pending > 0;
  const hasApproved = stats.approved > 0;
  const hasAchievements = goals.some(g => g.actual_achievement);

  function getEmployeeStep() {
    if (!stats.total) return 1;
    if (hasDraft) return 2;
    if (hasPending) return 3;
    if (hasApproved && !hasAchievements) return 4;
    if (hasApproved && hasAchievements) return 5;
    return 5;
  }
  const step = getEmployeeStep();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="font-display font-800 text-3xl text-slate-100">
          Welcome, {profile?.full_name?.split(" ")[0]} 👋
        </h1>
        <p className="text-slate-500 font-body mt-1 capitalize">
          {profile?.role} · {quarter} is active · FY 2025–26
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Flow Guide */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Info size={14} className="text-brand-400" />
            <p className="text-xs font-display font-600 text-slate-400 uppercase tracking-wider">
              {profile?.role === "employee" ? "Your Journey" : profile?.role === "manager" ? "Manager Actions" : "Admin Controls"}
            </p>
          </div>

          {profile?.role === "employee" && (
            <div className="space-y-2">
              <FlowStep number={1} title="Create Goals" description="Add 1–8 goals. Each needs a thrust area, target, UoM, and weightage (min 10%)." to="/create-goal" buttonLabel="Create a goal →" status={stats.total > 0 ? "done" : "active"} />
              <FlowStep number={2} title="Check Weightage = 100%" description="All goals' weightage must total exactly 100% before you can submit." to="/my-goals" buttonLabel="View & adjust →" status={stats.total > 0 && !hasDraft ? "done" : stats.total > 0 ? "active" : "pending"} />
              <FlowStep number={3} title="Submit for Approval" description="Go to My Goals and click 'Submit for Approval'. Your manager will then review them." to="/my-goals" buttonLabel="Submit now →" status={!hasDraft && hasApproved || !hasDraft && hasPending ? "done" : hasDraft ? "active" : "pending"} />
              <FlowStep number={4} title="Wait for Manager Approval" description="Your manager reviews and approves or returns goals. You'll see the status update." status={hasApproved ? "done" : hasPending ? "active" : "pending"} />
              <FlowStep number={5} title="Log Quarterly Updates" description="Once approved, go to Quarterly Update each quarter to log your actual achievements." to="/quarterly-update" buttonLabel="Log achievements →" status={hasApproved && hasAchievements ? "done" : hasApproved ? "active" : "pending"} />
            </div>
          )}

          {profile?.role === "manager" && (
            <div className="space-y-2">
              <FlowStep number={1} title="Review Team Goals" description={`${teamStats.pending} goal(s) are waiting for your approval.`} to="/approve" buttonLabel="Approve goals →" status={teamStats.pending > 0 ? "active" : "done"} />
              <FlowStep number={2} title="Approve or Return" description="Edit targets/weightage inline, then approve. Approved goals lock for employees." to="/approve" buttonLabel="Go to approvals →" status={teamStats.pending > 0 ? "active" : "done"} />
              <FlowStep number={3} title="Conduct Quarterly Check-ins" description="Each quarter, visit your team dashboard and click Check-in per employee to log comments." to="/team" buttonLabel="View team →" status="active" />
              <FlowStep number={4} title="View Analytics" description="Track team performance, scores, and trends in the analytics dashboard." to="/analytics" buttonLabel="View analytics →" status="active" />
            </div>
          )}

          {profile?.role === "admin" && (
            <div className="space-y-2">
              <FlowStep number={1} title="Configure Cycle" description="Set the financial year, active quarter, and date windows for each phase." to="/cycles" buttonLabel="Open Cycle Manager →" status="active" />
              <FlowStep number={2} title="Manage Users" description="Add employees, assign managers, and set roles. Unlock goals if needed." to="/users" buttonLabel="Manage users →" status="active" />
              <FlowStep number={3} title="Monitor Analytics" description="View org-wide goal completion, scores, and department trends." to="/analytics" buttonLabel="View analytics →" status="active" />
              <FlowStep number={4} title="Audit Trail" description="All system events are logged. Export for compliance." to="/audit" buttonLabel="View audit logs →" status="active" />
            </div>
          )}
        </div>

        {/* Right: Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Score card */}
          <div className="card bg-gradient-to-br from-brand-500/10 to-accent-500/5 border-brand-500/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-400 font-body">Overall Weighted Score</p>
                <p className="font-display font-800 text-5xl text-slate-100 mt-1">
                  {overallScore.toFixed(1)}<span className="text-2xl text-slate-500">%</span>
                </p>
                <p className="text-xs text-slate-500 mt-1 font-body">Based on {goals.filter(g => g.approval_status === "Approved").length} approved goal(s)</p>
              </div>
              <div className={`tag border text-sm font-display font-700 ${overallScore >= 100 ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" : "bg-brand-500/10 text-brand-400 border-brand-500/20"}`}>
                {overallScore >= 100 ? "🎯 Target Met" : hasApproved ? "🚀 In Progress" : "⏳ Awaiting Approval"}
              </div>
            </div>
            {hasApproved && <ProgressBar value={overallScore} max={100} showLabel={false} color={overallScore >= 100 ? "emerald" : "brand"} />}
          </div>

          {/* Stat grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Goals", value: stats.total, icon: Target, color: "text-brand-400", bg: "bg-brand-500/10" },
              { label: "Approved", value: stats.approved, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: "Pending Review", value: stats.pending, icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10" },
              { label: "Drafts", value: stats.draft, icon: TrendingUp, color: "text-slate-400", bg: "bg-slate-700/50" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="card">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                  <Icon size={16} className={color} />
                </div>
                <p className="font-display font-700 text-2xl text-slate-100">{value}</p>
                <p className="text-xs text-slate-500 font-body mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Manager quick stats */}
          {(profile?.role === "manager" || profile?.role === "admin") && teamStats.pending > 0 && (
            <div className="card border-yellow-500/20 bg-yellow-500/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={18} className="text-yellow-400" />
                  <div>
                    <p className="font-display font-600 text-slate-100">{teamStats.pending} goal(s) awaiting your approval</p>
                    <p className="text-xs text-slate-500 font-body mt-0.5">{teamStats.members} team member(s) total</p>
                  </div>
                </div>
                <Link to="/approve" className="btn-primary text-sm flex items-center gap-2">
                  Review Now <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          )}

          {/* Recent goals */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-700 text-lg text-slate-100">Recent Goals</h2>
              <Link to="/my-goals" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-body">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-slate-800/50 rounded-xl animate-pulse" />)}
              </div>
            ) : goals.length === 0 ? (
              <div className="text-center py-10">
                <Target size={32} className="text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 font-body mb-4">No goals yet. Start by creating your first goal.</p>
                <Link to="/create-goal" className="btn-primary inline-flex items-center gap-2">
                  Create First Goal
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {goals.map((goal) => (
                  <div key={goal.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-display font-600 text-slate-200 truncate">{goal.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{goal.thrust_area} · {goal.weightage}%</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <StatusBadge status={goal.approval_status || "Draft"} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}