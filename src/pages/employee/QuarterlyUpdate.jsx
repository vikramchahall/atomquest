import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import StatusBadge from "../../components/StatusBadge";
import ProgressBar from "../../components/ProgressBar";
import toast from "react-hot-toast";
import { computeScore, STATUS_OPTIONS, getCurrentQuarter } from "../../lib/utils";
import { Save } from "lucide-react";

export default function QuarterlyUpdate() {
  const { profile } = useAuth();
  const [goals, setGoals] = useState([]);
  const [updates, setUpdates] = useState({});
  const [saving, setSaving] = useState(false);
  const quarter = getCurrentQuarter();

  useEffect(() => {
    if (profile) loadGoals();
  }, [profile]);

  async function loadGoals() {
    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("employee_id", profile.id)
      .eq("approval_status", "Approved");
    setGoals(data || []);
    const init = {};
    (data || []).forEach((g) => {
      init[g.id] = {
        actual_achievement: g.actual_achievement || "",
        status: g.status || "Not Started",
      };
    });
    setUpdates(init);
  }

  function handleChange(goalId, field, value) {
    setUpdates((prev) => ({ ...prev, [goalId]: { ...prev[goalId], [field]: value } }));
  }

  async function saveUpdates() {
    setSaving(true);
    for (const goalId of Object.keys(updates)) {
      await supabase.from("goals").update(updates[goalId]).eq("id", goalId);
      await supabase.from("quarterly_checkins").upsert({
        goal_id: goalId,
        employee_id: profile.id,
        quarter,
        actual_achievement: updates[goalId].actual_achievement,
        status: updates[goalId].status,
      });
    }
    await supabase.from("audit_logs").insert({
      user_id: profile.id,
      action: "QUARTERLY_UPDATE",
      entity: "goals",
      details: `${quarter} update submitted`,
    });
    toast.success(`${quarter} update saved!`);
    setSaving(false);
    loadGoals();
  }

  if (goals.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display font-800 text-2xl text-slate-100 mb-6">
          {quarter} — Quarterly Update
        </h1>
        <div className="card text-center py-16">
          <p className="text-slate-500 font-body">
            No approved goals found. Goals must be approved by your manager first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-800 text-2xl text-slate-100">
            {quarter} — Quarterly Update
          </h1>
          <p className="text-slate-500 text-sm font-body mt-0.5">
            Log your actual achievements for this quarter
          </p>
        </div>
        <button onClick={saveUpdates} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={15} />
          )}
          Save Updates
        </button>
      </div>

      <div className="space-y-4">
        {goals.map((goal) => {
          const upd = updates[goal.id] || {};
          const score = computeScore(goal.uom_type, goal.target, upd.actual_achievement);

          return (
            <div key={goal.id} className="card space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500">{goal.thrust_area}</p>
                  <h3 className="font-display font-600 text-slate-100 mt-0.5">{goal.title}</h3>
                </div>
                <span className="text-sm font-display font-700 text-brand-400">{goal.weightage}%</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/50">
                  <p className="text-xs text-slate-500 mb-1">Target</p>
                  <p className="font-display font-600 text-slate-200">{goal.target}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50">
                  <p className="text-xs text-slate-500 mb-1">UoM</p>
                  <p className="font-display font-600 text-slate-200 text-xs">{goal.uom_type}</p>
                </div>
                <div className={`p-3 rounded-xl ${score >= 100 ? "bg-emerald-500/10" : "bg-brand-500/10"}`}>
                  <p className="text-xs text-slate-500 mb-1">Score</p>
                  <p className={`font-display font-700 ${score >= 100 ? "text-emerald-400" : "text-brand-400"}`}>
                    {upd.actual_achievement ? `${score.toFixed(0)}%` : "—"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Actual Achievement</label>
                  <input
                    type={goal.uom_type === "timeline" ? "date" : "number"}
                    value={upd.actual_achievement || ""}
                    onChange={(e) => handleChange(goal.id, "actual_achievement", e.target.value)}
                    className="input-field"
                    placeholder="Enter actual value"
                  />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    value={upd.status || "Not Started"}
                    onChange={(e) => handleChange(goal.id, "status", e.target.value)}
                    className="input-field"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {upd.actual_achievement && (
                <ProgressBar
                  value={score}
                  max={100}
                  showLabel={false}
                  color={score >= 100 ? "emerald" : score >= 75 ? "brand" : score >= 50 ? "yellow" : "red"}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}