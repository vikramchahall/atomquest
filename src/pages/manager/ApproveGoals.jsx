import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import StatusBadge from "../../components/StatusBadge";
import toast from "react-hot-toast";
import { CheckCircle, XCircle, Edit2, Save, Info, Users } from "lucide-react";

export default function ApproveGoals() {
  const { profile } = useAuth();
  const [pendingGoals, setPendingGoals] = useState([]);
  const [approvedGoals, setApprovedGoals] = useState([]);
  const [editing, setEditing] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");

  useEffect(() => {
    if (profile) loadGoals();
  }, [profile]);

  async function loadGoals() {
    // Load by manager_id OR by employee's manager relationship
    const { data: pending } = await supabase
      .from("goals")
      .select("*, profiles!goals_employee_id_fkey(full_name, email, department)")
      .eq("manager_id", profile.id)
      .eq("approval_status", "Pending")
      .order("created_at", { ascending: false });

    const { data: approved } = await supabase
      .from("goals")
      .select("*, profiles!goals_employee_id_fkey(full_name, email, department)")
      .eq("manager_id", profile.id)
      .eq("approval_status", "Approved")
      .order("approved_at", { ascending: false });

    // Fallback: also check goals from employees who report to this manager
    const { data: myEmployees } = await supabase
      .from("profiles").select("id").eq("manager_id", profile.id);

    if (myEmployees && myEmployees.length > 0 && (!pending || pending.length === 0)) {
      const ids = myEmployees.map(e => e.id);
      const { data: pendingByEmployee } = await supabase
        .from("goals")
        .select("*, profiles!goals_employee_id_fkey(full_name, email, department)")
        .in("employee_id", ids)
        .eq("approval_status", "Pending");
      setPendingGoals(pendingByEmployee || []);
    } else {
      setPendingGoals(pending || []);
    }

    setApprovedGoals(approved || []);
    setLoading(false);
  }

  async function approveGoal(goalId) {
    const { error } = await supabase.from("goals").update({
      approval_status: "Approved",
      locked: true,
      approved_at: new Date().toISOString(),
    }).eq("id", goalId);
    if (error) return toast.error("Failed to approve. " + error.message);
    await supabase.from("audit_logs").insert({
      user_id: profile.id,
      action: "GOAL_APPROVED",
      entity: "goals",
      entity_id: goalId,
      details: `Goal approved and locked by ${profile.full_name}`,
    });
    toast.success("Goal approved and locked!");
    loadGoals();
  }

  async function rejectGoal(goalId) {
    const note = window.prompt("Reason for returning (optional):") || "Returned for rework by manager";
    await supabase.from("goals").update({
      approval_status: "Draft",
      rejection_note: note,
    }).eq("id", goalId);
    await supabase.from("audit_logs").insert({
      user_id: profile.id,
      action: "GOAL_REJECTED",
      entity: "goals",
      entity_id: goalId,
      details: `Goal returned for rework: "${note}" — by ${profile.full_name}`,
    });
    toast("Goal returned to employee for rework", { icon: "↩️" });
    loadGoals();
  }

  async function saveEdit(goalId) {
    const ed = editing[goalId];
    if (!ed) return;
    await supabase.from("goals").update({ target: ed.target, weightage: ed.weightage }).eq("id", goalId);
    await supabase.from("audit_logs").insert({
      user_id: profile.id,
      action: "GOAL_EDITED_PRE_APPROVAL",
      entity: "goals",
      entity_id: goalId,
      details: `Manager edited goal before approval: target=${ed.target}, weightage=${ed.weightage}%`,
    });
    toast.success("Changes saved");
    setEditing((prev) => { const n = { ...prev }; delete n[goalId]; return n; });
    loadGoals();
  }

  function startEdit(goal) {
    setEditing((prev) => ({ ...prev, [goal.id]: { target: goal.target, weightage: goal.weightage } }));
  }

  function cancelEdit(goalId) {
    setEditing((prev) => { const n = { ...prev }; delete n[goalId]; return n; });
  }

  const displayGoals = tab === "pending" ? pendingGoals : approvedGoals;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-800 text-2xl text-slate-100">Goal Approvals</h1>
        <p className="text-slate-500 text-sm font-body mt-0.5">
          Review and approve your team's goal submissions
        </p>
      </div>

      {/* Instructions */}
      <div className="p-4 rounded-xl bg-brand-500/5 border border-brand-500/20 flex gap-3">
        <Info size={15} className="text-brand-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs font-body text-slate-400 space-y-1">
          <p><strong className="text-slate-300">Your role as Manager:</strong></p>
          <p>1. Review each goal submitted by your team members.</p>
          <p>2. Optionally <strong className="text-slate-300">Edit</strong> the target or weightage before approving.</p>
          <p>3. Click <strong className="text-emerald-400">Approve</strong> — the goal locks and the employee can log quarterly achievements.</p>
          <p>4. Or click <strong className="text-red-400">Return</strong> — the goal goes back to Draft so the employee can rework it.</p>
          <p className="text-slate-500">Note: If no goals appear, ensure employees are assigned to you as their manager in the profiles table.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-2 rounded-xl text-sm font-display font-600 transition-all ${tab === "pending" ? "bg-brand-500 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}
        >
          Pending {pendingGoals.length > 0 && <span className="ml-1 bg-yellow-400 text-dark-950 text-xs px-1.5 py-0.5 rounded-full">{pendingGoals.length}</span>}
        </button>
        <button
          onClick={() => setTab("approved")}
          className={`px-4 py-2 rounded-xl text-sm font-display font-600 transition-all ${tab === "approved" ? "bg-brand-500 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}
        >
          Approved ({approvedGoals.length})
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-dark-900 rounded-2xl animate-pulse border border-slate-800" />)}
        </div>
      ) : displayGoals.length === 0 ? (
        <div className="card text-center py-16">
          {tab === "pending" ? (
            <>
              <CheckCircle size={32} className="text-emerald-500 mx-auto mb-3" />
              <p className="text-slate-400 font-body text-lg">No pending approvals!</p>
              <p className="text-slate-500 font-body text-sm mt-1">All caught up. Your team hasn't submitted any goals yet, or all have been processed.</p>
            </>
          ) : (
            <>
              <Users size={32} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-body">No approved goals yet.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayGoals.map((goal) => {
            const ed = editing[goal.id];
            const emp = goal.profiles;
            return (
              <div key={goal.id} className={`card transition-all ${tab === "pending" ? "border-yellow-500/10 hover:border-yellow-500/20" : "border-emerald-500/10"}`}>
                {/* Employee info */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-800">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-sm font-display font-700">
                    {emp?.full_name?.[0] || "?"}
                  </div>
                  <div>
                    <p className="font-display font-600 text-slate-200 text-sm">{emp?.full_name || "Unknown Employee"}</p>
                    <p className="text-xs text-slate-500">{emp?.email} · {emp?.department || "No dept"}</p>
                  </div>
                  <div className="ml-auto">
                    <StatusBadge status={goal.approval_status} />
                  </div>
                </div>

                {/* Goal details */}
                <div className="mb-4">
                  <p className="text-xs text-slate-500">{goal.thrust_area}</p>
                  <h3 className="font-display font-600 text-slate-100 text-lg mt-0.5">{goal.title}</h3>
                  {goal.description && <p className="text-sm text-slate-400 mt-1 font-body">{goal.description}</p>}
                  {goal.rejection_note && (
                    <p className="text-xs text-red-400 mt-2 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
                      ↩️ Previous note: {goal.rejection_note}
                    </p>
                  )}
                </div>

                {/* Editable fields */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-slate-800/30 rounded-xl mb-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">UoM Type</p>
                    <p className="text-sm font-display font-600 text-slate-200">{goal.uom_type.replace("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Target {ed && <span className="text-yellow-400">(editing)</span>}</p>
                    {ed ? (
                      <input value={ed.target} onChange={(e) => setEditing(p => ({ ...p, [goal.id]: { ...ed, target: e.target.value } }))} className="input-field py-1.5 text-sm" />
                    ) : (
                      <p className="text-sm font-display font-600 text-slate-200">{goal.target}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Weightage {ed && <span className="text-yellow-400">(editing)</span>}</p>
                    {ed ? (
                      <input type="number" min={10} max={100} value={ed.weightage} onChange={(e) => setEditing(p => ({ ...p, [goal.id]: { ...ed, weightage: e.target.value } }))} className="input-field py-1.5 text-sm" />
                    ) : (
                      <p className="text-sm font-display font-600 text-brand-400">{goal.weightage}%</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {tab === "pending" && (
                  <div className="flex gap-3 flex-wrap">
                    {ed ? (
                      <>
                        <button onClick={() => saveEdit(goal.id)} className="btn-primary flex items-center gap-2 text-sm">
                          <Save size={13} /> Save Changes
                        </button>
                        <button onClick={() => cancelEdit(goal.id)} className="btn-secondary text-sm">Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => startEdit(goal)} className="btn-secondary flex items-center gap-2 text-sm">
                        <Edit2 size={13} /> Edit Target/Weightage
                      </button>
                    )}
                    {!ed && (
                      <>
                        <button onClick={() => approveGoal(goal.id)} className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all font-display font-600">
                          <CheckCircle size={14} /> Approve & Lock
                        </button>
                        <button onClick={() => rejectGoal(goal.id)} className="btn-danger flex items-center gap-2 text-sm">
                          <XCircle size={14} /> Return for Rework
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}