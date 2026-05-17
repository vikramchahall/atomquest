import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import StatusBadge from "../../components/StatusBadge";
import ProgressBar from "../../components/ProgressBar";
import toast from "react-hot-toast";
import { computeScore, STATUS_OPTIONS, getCurrentQuarter } from "../../lib/utils";
import { Save, Info, Lock } from "lucide-react";
import { triggerNotification } from "../../lib/notify";

export default function QuarterlyUpdate() {
  const { profile } = useAuth();
  const [goals, setGoals] = useState([]);
  const [updates, setUpdates] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const quarter = getCurrentQuarter();

  useEffect(() => {
    if (profile) loadGoals();
  }, [profile]);

  async function loadGoals() {
    const { data } = await supabase
      .from("goals").select("*")
      .eq("employee_id", profile.id)
      .eq("approval_status", "Approved")
      .order("created_at");
    setGoals(data || []);
    const init = {};
    (data || []).forEach((g) => {
      init[g.id] = {
        actual_achievement: g.actual_achievement || "",
        status: g.status || "Not Started",
      };
    });
    setUpdates(init);
    setLoading(false);
  }

  function handleChange(goalId, field, value) {
    setUpdates((prev) => ({ ...prev, [goalId]: { ...prev[goalId], [field]: value } }));
  }

 async function saveUpdates() {
  setSaving(true);

  let hasError = false;

  for (const goalId of Object.keys(updates)) {
    const upd = updates[goalId];

    const { error: ge } = await supabase.from("goals").update({
      actual_achievement: upd.actual_achievement,
      status: upd.status,
    }).eq("id", goalId);

    if (ge) {
      hasError = true;
      continue;
    }

    await supabase.from("quarterly_checkins").upsert({
      goal_id: goalId,
      employee_id: profile.id,
      quarter,
      actual_achievement: upd.actual_achievement,
      status: upd.status,
    }, { onConflict: "goal_id,employee_id,quarter" });
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "QUARTERLY_UPDATE",
    entity: "quarterly_checkins",
    details: `${quarter} achievement update submitted by ${profile.full_name}`,
  });

  if (hasError) {
    toast.error("Some updates failed. Please try again.");
  } else {
    toast.success(
      `${quarter} update saved! Your manager can now review your progress.`
    );

    // Notify manager
    if (profile.manager_id) {
      const { data: mgr } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", profile.manager_id)
        .single();

      if (mgr) {
        triggerNotification({
          recipientId: mgr.id,
          recipientEmail: mgr.email,
          recipientName: mgr.full_name,
          eventType: "checkin_done",
          employeeName: profile.full_name,
          link: "/team",
        });
      }
    }
  }

  setSaving(false);
  loadGoals();
}

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (goals.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="font-display font-800 text-2xl text-slate-100">{quarter} — Quarterly Update</h1>
        <div className="card text-center py-16">
          <Lock size={32} className="text-slate-700 mx-auto mb-4" />
          <p className="font-display font-600 text-slate-400 text-lg mb-2">No Approved Goals Found</p>
          <p className="text-slate-500 font-body text-sm">
            You can only log quarterly updates after your manager has approved your goals.
          </p>
          <div className="mt-6 text-left max-w-sm mx-auto p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <p className="text-xs text-slate-400 font-body">
              <strong className="text-slate-300">Steps to get here:</strong><br/>
              1. Create goals (My Goals → Add Goal)<br/>
              2. Submit for approval (My Goals → Submit)<br/>
              3. Manager approves them<br/>
              4. Come back here to log achievements ✓
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalScore = goals.reduce((sum, goal) => {
    const upd = updates[goal.id] || {};
    const s = computeScore(goal.uom_type, goal.target, upd.actual_achievement);
    return sum + s * (parseFloat(goal.weightage) / 100);
  }, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-800 text-2xl text-slate-100">{quarter} — Quarterly Update</h1>
          <p className="text-slate-500 text-sm font-body mt-0.5">
            Log your actual achievements for each approved goal
          </p>
        </div>
        <button onClick={saveUpdates} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
          Save Updates
        </button>
      </div>

      {/* Instructions */}
      <div className="p-4 rounded-xl bg-brand-500/5 border border-brand-500/20 flex gap-3">
        <Info size={15} className="text-brand-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs font-body text-slate-400">
          <p>Enter your <strong className="text-slate-300">Actual Achievement</strong> for each goal. The system auto-calculates your score based on UoM formula. Update your <strong className="text-slate-300">Status</strong> to reflect current state. Click <strong className="text-slate-300">Save Updates</strong> when done — your manager will see this in their check-in view.</p>
        </div>
      </div>

      {/* Live score */}
      <div className="card bg-gradient-to-r from-brand-500/10 to-accent-500/5 border-brand-500/20">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-slate-400">Live Weighted Score</p>
          <p className="font-display font-800 text-2xl text-slate-100">{totalScore.toFixed(1)}%</p>
        </div>
        <ProgressBar value={totalScore} max={100} showLabel={false} color={totalScore >= 100 ? "emerald" : totalScore >= 75 ? "brand" : "yellow"} />
      </div>

      {/* Goal update cards */}
      <div className="space-y-4">
        {goals.map((goal) => {
          const upd = updates[goal.id] || {};
          const score = computeScore(goal.uom_type, goal.target, upd.actual_achievement);
          const hasActual = upd.actual_achievement !== "";

          return (
            <div key={goal.id} className="card space-y-4">
              {/* Goal header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500">{goal.thrust_area}</p>
                  <h3 className="font-display font-600 text-slate-100 mt-0.5">{goal.title}</h3>
                  {goal.description && <p className="text-xs text-slate-500 mt-1">{goal.description}</p>}
                </div>
                <span className="text-sm font-display font-700 text-brand-400 ml-4">{goal.weightage}%</span>
              </div>

              {/* Target / UoM / Score row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/50">
                  <p className="text-xs text-slate-500 mb-1">Target</p>
                  <p className="font-display font-600 text-slate-200">{goal.target}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50">
                  <p className="text-xs text-slate-500 mb-1">UoM</p>
                  <p className="font-body text-slate-300 text-xs leading-tight">{goal.uom_type.replace("_", " ")}</p>
                </div>
                <div className={`p-3 rounded-xl ${score >= 100 ? "bg-emerald-500/10" : hasActual ? "bg-brand-500/10" : "bg-slate-800/50"}`}>
                  <p className="text-xs text-slate-500 mb-1">Score</p>
                  <p className={`font-display font-700 ${score >= 100 ? "text-emerald-400" : hasActual ? "text-brand-400" : "text-slate-500"}`}>
                    {hasActual ? `${score.toFixed(0)}%` : "—"}
                  </p>
                </div>
              </div>

              {/* Input row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Actual Achievement</label>
                  <input
                    type={goal.uom_type === "timeline" ? "date" : "number"}
                    value={upd.actual_achievement || ""}
                    onChange={(e) => handleChange(goal.id, "actual_achievement", e.target.value)}
                    className="input-field"
                    placeholder={goal.uom_type === "zero" ? "Enter 0 if no incidents" : "Enter actual value"}
                  />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select value={upd.status || "Not Started"} onChange={(e) => handleChange(goal.id, "status", e.target.value)} className="input-field">
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Score bar */}
              {hasActual && (
                <div>
                  <ProgressBar value={score} max={150} showLabel={false}
                    color={score >= 100 ? "emerald" : score >= 75 ? "brand" : score >= 50 ? "yellow" : "red"} />
                  <p className="text-xs text-slate-500 mt-1">
                    {score >= 100 ? "🎯 Target achieved!" : score >= 75 ? "🚀 On track" : score >= 50 ? "⚠️ Needs attention" : "🔴 Below target"}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={saveUpdates} disabled={saving} className="btn-primary flex items-center gap-2 w-full justify-center">
        {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
        Save All Updates
      </button>
    </div>
  );
}