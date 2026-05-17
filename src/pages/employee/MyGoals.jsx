import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import GoalCard from "../../components/GoalCard";
import WeightageValidator from "../../components/WeightageValidator";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { PlusCircle, Send, Lock, Info, Trash2 } from "lucide-react";
import { triggerNotification } from "../../lib/notify";

export default function MyGoals() {
  const { profile, user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) loadGoals();
  }, [profile]);

  async function loadGoals() {
    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("employee_id", profile.id)
      .order("created_at", { ascending: false });
    setGoals(data || []);
    setLoading(false);
  }

  async function submitGoals() {
    const draftGoals = goals.filter((g) => g.approval_status === "Draft");
    if (!draftGoals.length) return toast.error("No draft goals to submit.");

    const total = goals.reduce((s, g) => s + parseFloat(g.weightage || 0), 0);
    if (Math.abs(total - 100) > 0.01)
      return toast.error(`Weightage is ${total}%. Must equal 100%.`);

    const { error } = await supabase
      .from("goals")
      .update({ approval_status: "Pending" })
      .in("id", draftGoals.map((g) => g.id));

    if (error) return toast.error("Failed to submit: " + error.message);

    await supabase.from("audit_logs").insert({
      user_id: profile.id,
      action: "GOALS_SUBMITTED",
      entity: "goals",
      details: `${draftGoals.length} goal(s) submitted by ${profile.full_name}`,
    });

    toast.success(`${draftGoals.length} goal(s) submitted for approval!`);
    loadGoals();

    // ── Fetch the profile fresh from DB to guarantee manager_id is latest ──
    const { data: freshProfile, error: profErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profile.id)
      .single();

    if (profErr || !freshProfile) {
      console.warn("[submit] Could not fetch fresh profile:", profErr?.message);
      return;
    }

    console.log("[submit] Fresh profile manager_id:", freshProfile.manager_id);

    if (!freshProfile.manager_id) {
      console.warn("[submit] No manager_id — notification skipped");
      return;
    }

    const { data: mgr, error: mgrErr } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", freshProfile.manager_id)
      .single();

    if (mgrErr || !mgr) {
      console.warn("[submit] Manager not found:", mgrErr?.message);
      return;
    }

    console.log("[submit] Notifying manager:", mgr.full_name, mgr.id);

    await triggerNotification({
      recipientId:    mgr.id,
      recipientEmail: mgr.email,
      recipientName:  mgr.full_name,
      eventType:      "goal_submitted",
      employeeName:   freshProfile.full_name,
      link:           "/approve",
    });

    console.log("[submit] Done — notification sent to", mgr.full_name);
  }

  async function deleteGoal(goalId) {
    if (!window.confirm("Delete this draft goal?")) return;
    const { error } = await supabase.from("goals").delete().eq("id", goalId);
    if (error) toast.error("Delete failed: " + error.message);
    else { toast.success("Goal deleted"); loadGoals(); }
  }


  const draftGoals     = goals.filter(g => g.approval_status === "Draft");
  const pendingGoals   = goals.filter(g => g.approval_status === "Pending");
  const approvedGoals  = goals.filter(g => g.approval_status === "Approved");
  const rejectedGoals  = goals.filter(g => g.approval_status === "Draft" && g.rejection_note);
  const totalWeightage = goals.reduce((s, g) => s + parseFloat(g.weightage || 0), 0);
  const canSubmit      = draftGoals.length > 0 && Math.abs(totalWeightage - 100) < 0.01;
  const isAllApproved  = goals.length > 0 && approvedGoals.length === goals.length;

  if (loading) return (
    <div className="max-w-5xl mx-auto grid grid-cols-2 gap-4">
      {[1,2,3,4].map(i => (
        <div key={i} className="h-44 bg-dark-900 rounded-2xl animate-pulse border border-slate-800" />
      ))}
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
        <div className="flex gap-3 flex-wrap justify-end">

          {draftGoals.length > 0 && (
            <button
              onClick={submitGoals}
              disabled={!canSubmit}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-600 text-sm transition-all ${
                canSubmit ? "btn-primary" : "bg-slate-700 text-slate-500 cursor-not-allowed"
              }`}
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

      {/* Info banner */}
      <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 flex items-start gap-3">
        <Info size={16} className="text-brand-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm font-body text-slate-400 space-y-1">
          {goals.length === 0 && (
            <p>Click <strong className="text-slate-200">Add Goal</strong> to start. Goals must total 100% weightage.</p>
          )}
          {draftGoals.length > 0 && Math.abs(totalWeightage - 100) > 0.01 && (
            <p>⚠️ Weightage is <strong className="text-yellow-400">{totalWeightage}%</strong> — must equal <strong className="text-slate-200">100%</strong> before submitting.</p>
          )}
          {canSubmit && (
            <p>✅ Ready to submit. Click <strong className="text-slate-200">Submit for Approval</strong>.</p>
          )}
          {pendingGoals.length > 0 && draftGoals.length === 0 && (
            <p>⏳ Goals are <strong className="text-yellow-400">pending manager review</strong>.</p>
          )}
          {isAllApproved && (
            <p>🎉 Goals approved! Go to <strong className="text-slate-200">Quarterly Update</strong> to log achievements.</p>
          )}
        </div>
      </div>

      {goals.length > 0 && <WeightageValidator goals={goals} />}

      {goals.length === 0 && (
        <div className="card text-center py-16">
          <PlusCircle size={28} className="text-brand-400 mx-auto mb-4" />
          <p className="font-display font-600 text-slate-300 text-lg mb-2">No goals yet</p>
          <Link to="/create-goal" className="btn-primary inline-flex items-center gap-2 mt-2">
            <PlusCircle size={15} /> Create Your First Goal
          </Link>
        </div>
      )}

      {/* Draft Goals */}
      {draftGoals.length > 0 && (
        <div>
          <p className="text-xs font-display font-600 text-slate-500 uppercase tracking-wider mb-3">
            Draft — Not Submitted ({draftGoals.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {draftGoals.map((goal) => (
              <div key={goal.id} className="relative">
                <GoalCard goal={goal} />
                <button
                  onClick={() => deleteGoal(goal.id)}
                  className="absolute top-4 right-4 text-slate-600 hover:text-red-400 transition-colors"
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
      Pending Approval ({pendingGoals.length})
    </p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {pendingGoals.map((goal) => (
        <div key={goal.id} className="relative">
          <GoalCard goal={{ ...goal, status: "Pending" }} />
          <button
            onClick={() => deleteGoal(goal.id)}
            className="absolute top-4 right-4 text-slate-600 hover:text-red-400 transition-colors"
            title="Withdraw and delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
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
              Log updates <Lock size={10} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
      )}

      {/* Returned Goals */}
      {rejectedGoals.length > 0 && (
        <div>
          <p className="text-xs font-display font-600 text-red-400 uppercase tracking-wider mb-3">
            Returned for Rework ({rejectedGoals.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rejectedGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}