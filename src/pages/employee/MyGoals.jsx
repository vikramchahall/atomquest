import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import GoalCard from "../../components/GoalCard";
import WeightageValidator from "../../components/WeightageValidator";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { PlusCircle, Send, Unlock } from "lucide-react";

export default function MyGoals() {
  const { profile } = useAuth();
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
    if (!draftGoals.length) return toast.error("No draft goals to submit");
    const total = goals.reduce((s, g) => s + parseFloat(g.weightage || 0), 0);
    if (Math.abs(total - 100) > 0.01)
      return toast.error("Total weightage must equal 100%");
    if (goals.length > 8) return toast.error("Maximum 8 goals allowed");
    const ids = draftGoals.map((g) => g.id);
    await supabase
      .from("goals")
      .update({ approval_status: "Pending" })
      .in("id", ids);
    toast.success("Goals submitted for approval!");
    loadGoals();
  }

  const hasDraft = goals.some((g) => g.approval_status === "Draft");
  const isLocked = goals.some((g) => g.approval_status === "Approved");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-800 text-2xl text-slate-100">My Goals</h1>
          <p className="text-slate-500 text-sm font-body mt-0.5">
            {goals.length}/8 goals created
          </p>
        </div>
        <div className="flex gap-3">
          {hasDraft && (
            <button onClick={submitGoals} className="btn-primary flex items-center gap-2">
              <Send size={15} />
              Submit for Approval
            </button>
          )}
          {goals.length < 8 && !isLocked && (
            <Link to="/create-goal" className="btn-secondary flex items-center gap-2">
              <PlusCircle size={15} />
              Add Goal
            </Link>
          )}
        </div>
      </div>

      {goals.length > 0 && <WeightageValidator goals={goals} />}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-dark-900 rounded-2xl animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-slate-500 font-body text-lg mb-4">No goals created yet</p>
          <Link to="/create-goal" className="btn-primary inline-flex items-center gap-2">
            <PlusCircle size={15} />
            Create Your First Goal
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}