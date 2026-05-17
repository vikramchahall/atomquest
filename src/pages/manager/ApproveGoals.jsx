import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import StatusBadge from "../../components/StatusBadge";
import toast from "react-hot-toast";
import { CheckCircle, XCircle, Edit2, Save } from "lucide-react";

export default function ApproveGoals() {
  const { profile } = useAuth();
  const [pendingGoals, setPendingGoals] = useState([]);
  const [editing, setEditing] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) loadPending();
  }, [profile]);

  async function loadPending() {
    const { data } = await supabase
      .from("goals")
      .select("*, profiles(full_name, email)")
      .eq("manager_id", profile.id)
      .eq("approval_status", "Pending");
    setPendingGoals(data || []);
    setLoading(false);
  }

  async function approveGoal(goalId) {
    await supabase
      .from("goals")
      .update({ approval_status: "Approved", locked: true, approved_at: new Date().toISOString() })
      .eq("id", goalId);
    await supabase.from("audit_logs").insert({
      user_id: profile.id,
      action: "GOAL_APPROVED",
      entity: "goals",
      entity_id: goalId,
      details: `Goal approved by ${profile.full_name}`,
    });
    toast.success("Goal approved and locked!");
    loadPending();
  }

  async function rejectGoal(goalId) {
    await supabase
      .from("goals")
      .update({ approval_status: "Draft", rejection_note: "Returned for rework" })
      .eq("id", goalId);
    await supabase.from("audit_logs").insert({
      user_id: profile.id,
      action: "GOAL_REJECTED",
      entity: "goals",
      entity_id: goalId,
      details: `Goal returned for rework by ${profile.full_name}`,
    });
    toast("Goal returned for rework", { icon: "↩️" });
    loadPending();
  }

  async function saveEdit(goalId) {
    const ed = editing[goalId];
    if (!ed) return;
    await supabase.from("goals").update(ed).eq("id", goalId);
    await supabase.from("audit_logs").insert({
      user_id: profile.id,
      action: "GOAL_EDITED_PRE_APPROVAL",
      entity: "goals",
      entity_id: goalId,
      details: `Manager edited goal inline: target=${ed.target}, weightage=${ed.weightage}`,
    });
    toast.success("Changes saved");
    setEditing((prev) => { const n = { ...prev }; delete n[goalId]; return n; });
    loadPending();
  }

  function startEdit(goal) {
    setEditing((prev) => ({
      ...prev,
      [goal.id]: { target: goal.target, weightage: goal.weightage },
    }));
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-800 text-2xl text-slate-100">Approve Goals</h1>
        <p className="text-slate-500 text-sm font-body mt-0.5">
          {pendingGoals.length} goals awaiting approval
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-dark-900 rounded-2xl animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : pendingGoals.length === 0 ? (
        <div className="card text-center py-16">
          <CheckCircle size={32} className="text-emerald-500 mx-auto mb-3" />
          <p className="text-slate-400 font-body">All caught up! No pending approvals.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingGoals.map((goal) => {
            const ed = editing[goal.id];
            return (
              <div key={goal.id} className="card border-yellow-500/10 hover:border-yellow-500/20 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs text-slate-500">{goal.profiles?.full_name} · {goal.thrust_area}</p>
                    <h3 className="font-display font-600 text-slate-100 mt-0.5 text-lg">{goal.title}</h3>
                    {goal.description && (
                      <p className="text-sm text-slate-400 mt-1 font-body">{goal.description}</p>
                    )}
                  </div>
                  <StatusBadge status="Pending" />
                </div>

                <div className="grid grid-cols-3 gap-4 p-4 bg-slate-800/30 rounded-xl mb-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">UoM</p>
                    <p className="text-sm font-display font-600 text-slate-200">{goal.uom_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Target</p>
                    {ed ? (
                      <input
                        value={ed.target}
                        onChange={(e) =>
                          setEditing((prev) => ({ ...prev, [goal.id]: { ...ed, target: e.target.value } }))
                        }
                        className="input-field py-1 text-sm"
                      />
                    ) : (
                      <p className="text-sm font-display font-600 text-slate-200">{goal.target}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Weightage</p>
                    {ed ? (
                      <input
                        type="number"
                        min={10}
                        max={100}
                        value={ed.weightage}
                        onChange={(e) =>
                          setEditing((prev) => ({ ...prev, [goal.id]: { ...ed, weightage: e.target.value } }))
                        }
                        className="input-field py-1 text-sm"
                      />
                    ) : (
                      <p className="text-sm font-display font-600 text-brand-400">{goal.weightage}%</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  {ed ? (
                    <button onClick={() => saveEdit(goal.id)} className="btn-primary flex items-center gap-2 text-sm">
                      <Save size={13} /> Save Changes
                    </button>
                  ) : (
                    <button onClick={() => startEdit(goal)} className="btn-secondary flex items-center gap-2 text-sm">
                      <Edit2 size={13} /> Edit
                    </button>
                  )}
                  <button onClick={() => approveGoal(goal.id)} className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all">
                    <CheckCircle size={13} /> Approve
                  </button>
                  <button onClick={() => rejectGoal(goal.id)} className="btn-danger flex items-center gap-2 text-sm">
                    <XCircle size={13} /> Return
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}