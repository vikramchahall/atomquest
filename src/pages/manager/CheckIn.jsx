import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import ProgressBar from "../../components/ProgressBar";
import StatusBadge from "../../components/StatusBadge";
import toast from "react-hot-toast";
import { computeScore, getScoreColor, getCurrentQuarter } from "../../lib/utils";
import { MessageSquare, Save } from "lucide-react";

export default function CheckIn() {
  const { employeeId } = useParams();
  const { profile } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [goals, setGoals] = useState([]);
  const [comments, setComments] = useState({});
  const [saving, setSaving] = useState(false);
  const quarter = getCurrentQuarter();

  useEffect(() => {
    loadData();
  }, [employeeId]);

  async function loadData() {
    const { data: emp } = await supabase.from("profiles").select("*").eq("id", employeeId).single();
    setEmployee(emp);
    const { data: g } = await supabase
      .from("goals")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("approval_status", "Approved");
    setGoals(g || []);
    // Load existing comments
    const { data: existing } = await supabase
      .from("quarterly_checkins")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("quarter", quarter);
    const c = {};
    (existing || []).forEach((e) => { c[e.goal_id] = e.manager_comment || ""; });
    setComments(c);
  }

  async function saveComments() {
    setSaving(true);
    for (const goalId of Object.keys(comments)) {
      await supabase.from("quarterly_checkins").upsert({
        goal_id: goalId,
        employee_id: employeeId,
        manager_id: profile.id,
        quarter,
        manager_comment: comments[goalId],
        checkin_done: true,
      });
    }
    await supabase.from("audit_logs").insert({
      user_id: profile.id,
      action: "CHECKIN_COMPLETED",
      entity: "quarterly_checkins",
      details: `Manager check-in completed for ${employee?.full_name} — ${quarter}`,
    });
    toast.success("Check-in comments saved!");
    setSaving(false);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-800 text-2xl text-slate-100">
          Check-in: {employee?.full_name}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">{quarter} — Planned vs. Actual Review</p>
      </div>

      {goals.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-500">No approved goals for this employee.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {goals.map((goal) => {
              const score = computeScore(goal.uom_type, goal.target, goal.actual_achievement);
              return (
                <div key={goal.id} className="card">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs text-slate-500">{goal.thrust_area} · {goal.weightage}%</p>
                      <h3 className="font-display font-600 text-slate-100 mt-0.5">{goal.title}</h3>
                    </div>
                    <StatusBadge status={goal.status || "Not Started"} />
                  </div>

                  <div className="grid grid-cols-3 gap-4 p-4 bg-slate-800/30 rounded-xl mb-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Target</p>
                      <p className="font-display font-700 text-slate-200">{goal.target}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Actual</p>
                      <p className={`font-display font-700 ${goal.actual_achievement ? "text-emerald-400" : "text-slate-500"}`}>
                        {goal.actual_achievement || "Not logged"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Score</p>
                      <p className={`font-display font-700 ${getScoreColor(score)}`}>
                        {goal.actual_achievement ? `${score.toFixed(0)}%` : "—"}
                      </p>
                    </div>
                  </div>

                  {goal.actual_achievement && (
                    <div className="mb-4">
                      <ProgressBar
                        value={score}
                        max={100}
                        showLabel={false}
                        color={score >= 100 ? "emerald" : score >= 75 ? "brand" : score >= 50 ? "yellow" : "red"}
                      />
                    </div>
                  )}

                  <div>
                    <label className="label flex items-center gap-1">
                      <MessageSquare size={12} /> Manager Comment
                    </label>
                    <textarea
                      value={comments[goal.id] || ""}
                      onChange={(e) => setComments((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                      placeholder="Add your check-in feedback..."
                      className="input-field resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={saveComments} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={15} />
            )}
            Complete Check-in
          </button>
        </>
      )}
    </div>
  );
}