import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import GoalCard from "../../components/GoalCard";
import WeightageValidator from "../../components/WeightageValidator";
import StatusBadge from "../../components/StatusBadge";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { PlusCircle, Send, Lock, Info, Trash2, RotateCcw } from "lucide-react";

export default function MyGoals() {
  const { profile } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) loadGoals();
  }, [profile]);

  async function loadGoals() {
    const { data } = await supabase
      .from("goals").select("*")
      .eq("employee_id", profile.id)
      .order("created_at", { ascending: false });
    setGoals(data || []);
    setLoading(false);
  }

  async function submitGoals() {
    const draftGoals = goals.filter((g) => g.approval_status === "Draft");
    if (!draftGoals.length) return toast.error("No draft goals to submit. Create goals first.");
    const total = goals.reduce((s, g) => s + parseFloat(g.weightage || 0), 0);
    if (Math.abs(total - 100) > 0.01)
      return toast.error(`Total weightage is ${total}%. It must equal exactly 100%.`);
    if (goals.length > 8) return toast.error("Maximum 8 goals allowed.");
    if (goals.length < 1) return toast.error("Add at least 1 goal before submitting.");

    const ids = draftGoals.map((g) => g.id);
    const { error } = await supabase.from("goals").update({ approval_status: "Pending" }).in("id", ids);
    if (error) return toast.error("Failed to submit. Please try again.");

    await supabase.from("audit_logs").insert({
      user_id: profile.id,
      action: "GOALS_SUBMITTED",
      entity: "goals",
      details: `${draftGoals.length} goal(s) submitted for approval by ${profile.full_name}`,
    });
    toast.success(`${draftGoals.length} goal(s) submitted to your manager for approval!`);
    loadGoals();
  }

  async function deleteGoal(goalId) {
    if (!window.confirm("Delete this draft goal?")) return;
    await supabase.from("goals").delete().eq("id", goalId);
    toast.success("Goal deleted");
    loadGoals();
  }

  const draftGoals = goals.filter(g => g.approval_status === "Draft");
  const pendingGoals = goals.filter(g => g.approval_status === "Pending");
  const approvedGoals = goals.filter(g => g.approval_status === "Approved");
  const rejectedGoals = goals.filter(g => g.approval_status === "Rejected");
  const totalWeightage = goals.reduce((s, g) => s + parseFloat(g.weightage || 0), 0);
  const canSubmit = draftGoals.length > 0 && Math.abs(totalWeightage - 100) < 0.01;
  const isAllApproved = goals.length > 0 && approvedGoals.length === goals.length;

  if (loading) return (
    <div className="max-w-5xl mx-auto grid grid-cols-2 gap-4">
      {[1,2,3,4].map(i => <div key={i} className="h-44 bg-dark-900 rounded-2xl animate-pulse border border-slate-800" />)}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-800 text-2xl text-slate-100">My Goals</h1>
          <p className="text-slate-500 text-sm font-body mt-0.5">
            {goals.length}/8 goals · FY 2025–26
          </p>
        </div>
        <div className="flex gap-3">
          {draftGoals.length > 0 && (
            <button
              onClick={submitGoals}
              disabled={!canSubmit}
              title={!canSubmit ? `Weightage must total 100% (currently ${totalWeightage}%)` : "Submit all draft goals for manager approval"}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-600 text-sm transition-all ${canSubmit ? "btn-primary" : "bg-slate-700 text-slate-500 cursor-not-allowed"}`}
            >
              <Send size={14} />
              Submit for Approval
            </button>
          )}
          {goals.length < 8 && !isAllApproved && (
            <Link to="/create-goal" className="btn-secondary flex items-center gap-2 text-sm">
              <PlusCircle size={14} />
              Add Goal
            </Link>
          )}
        </div>
      </div>

      {/* Instructions banner */}
      <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 flex items-start gap-3">
        <Info size={16} className="text-brand-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm font-body text-slate-400 space-y-1">
          {goals.length === 0 && <p>Start by clicking <strong className="text-slate-200">Add Goal</strong>. You can add up to 8 goals. Each goal needs a thrust area, target value, and weightage (minimum 10%).</p>}
          {draftGoals.length > 0 && Math.abs(totalWeightage - 100) > 0.01 && (
            <p>⚠️ Your total weightage is <strong className="text-yellow-400">{totalWeightage}%</strong>. It must equal exactly <strong className="text-slate-200">100%</strong> before you can submit. Add/edit goals to adjust.</p>
          )}
          {draftGoals.length > 0 && Math.abs(totalWeightage - 100) < 0.01 && (
            <p>✅ Weightage totals 100%. Click <strong className="text-slate-200">Submit for Approval</strong> to send your goals to your manager.</p>
          )}
          {pendingGoals.length > 0 && draftGoals.length === 0 && (
            <p>⏳ Your goals are <strong className="text-yellow-400">pending manager review</strong>. You'll be notified once they're approved or returned for changes.</p>
          )}
          {approvedGoals.length > 0 && draftGoals.length === 0 && pendingGoals.length === 0 && (
            <p>🎉 Your goals are <strong className="text-emerald-400">approved and locked</strong>. Go to <strong className="text-slate-200">Quarterly Update</strong> each quarter to log your actual achievements.</p>
          )}
          {rejectedGoals.length > 0 && (
            <p>↩️ Some goals were returned for rework. Edit them and resubmit.</p>
          )}
        </div>
      </div>

      {/* Weightage validator if there are goals */}
      {goals.length > 0 && <WeightageValidator goals={goals} />}

      {/* No goals empty state */}
      {goals.length === 0 && (
        <div className="card text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
            <PlusCircle size={28} className="text-brand-400" />
          </div>
          <p className="font-display font-600 text-slate-300 text-lg mb-2">No goals created yet</p>
          <p className="text-slate-500 font-body text-sm mb-6">Create 1–8 goals. Each needs weightage summing to 100% total.</p>
          <Link to="/create-goal" className="btn-primary inline-flex items-center gap-2">
            <PlusCircle size={15} /> Create Your First Goal
          </Link>
        </div>
      )}

      {/* Draft Goals */}
      {draftGoals.length > 0 && (
        <div>
          <p className="text-xs font-display font-600 text-slate-500 uppercase tracking-wider mb-3">
            Draft Goals — Not Yet Submitted ({draftGoals.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {draftGoals.map((goal) => (
              <div key={goal.id} className="relative">
                <GoalCard goal={goal} />
                <button
                  onClick={() => deleteGoal(goal.id)}
                  className="absolute top-4 right-4 text-slate-600 hover:text-red-400 transition-colors"
                  title="Delete draft"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Goals */}
      {pendingGoals.length > 0 && (
        <div>
          <p className="text-xs font-display font-600 text-yellow-500 uppercase tracking-wider mb-3">
            Pending Manager Approval ({pendingGoals.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingGoals.map((goal) => <GoalCard key={goal.id} goal={{ ...goal, status: "Pending" }} />)}
          </div>
        </div>
      )}

      {/* Approved Goals */}
      {approvedGoals.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-display font-600 text-emerald-500 uppercase tracking-wider">
              Approved & Locked ({approvedGoals.length})
            </p>
            <Link to="/quarterly-update" className="text-xs text-brand-400 hover:text-brand-300 font-body flex items-center gap-1">
              Log quarterly updates <Lock size={10} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedGoals.map((goal) => <GoalCard key={goal.id} goal={goal} />)}
          </div>
        </div>
      )}

      {/* Rejected/Returned Goals */}
      {rejectedGoals.length > 0 && (
        <div>
          <p className="text-xs font-display font-600 text-red-400 uppercase tracking-wider mb-3">
            Returned for Rework ({rejectedGoals.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rejectedGoals.map((goal) => <GoalCard key={goal.id} goal={{ ...goal, status: "At Risk" }} />)}
          </div>
        </div>
      )}
    </div>
  );
}