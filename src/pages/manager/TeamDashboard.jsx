import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { Link } from "react-router-dom";
import StatusBadge from "../../components/StatusBadge";
import ProgressBar from "../../components/ProgressBar";
import { computeScore } from "../../lib/utils";
import { Users, MessageSquare } from "lucide-react";

export default function TeamDashboard() {
  const { profile } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) loadTeam();
  }, [profile]);

  async function loadTeam() {
    const { data: members } = await supabase
      .from("profiles")
      .select("*")
      .eq("manager_id", profile.id);

    const memberData = await Promise.all(
      (members || []).map(async (m) => {
        const { data: goals } = await supabase
          .from("goals")
          .select("*")
          .eq("employee_id", m.id);
        const approved = (goals || []).filter((g) => g.approval_status === "Approved");
        const pending = (goals || []).filter((g) => g.approval_status === "Pending");
        const weightedScore = approved.length
          ? approved.reduce((sum, g) => {
              const s = computeScore(g.uom_type, g.target, g.actual_achievement);
              return sum + s * (parseFloat(g.weightage) / 100);
            }, 0)
          : 0;
        return { ...m, goals: goals || [], approved, pending, weightedScore };
      })
    );
    setTeamMembers(memberData);
    setLoading(false);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
          <Users size={18} className="text-brand-400" />
        </div>
        <div>
          <h1 className="font-display font-800 text-2xl text-slate-100">Team Dashboard</h1>
          <p className="text-slate-500 text-sm">{teamMembers.length} team members</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-dark-900 rounded-2xl animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : teamMembers.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-slate-500">No team members assigned yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {teamMembers.map((m) => (
            <div key={m.id} className="card hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white font-display font-700">
                    {m.full_name?.[0] || "?"}
                  </div>
                  <div>
                    <p className="font-display font-600 text-slate-100">{m.full_name}</p>
                    <p className="text-xs text-slate-500">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Goals</p>
                    <p className="font-display font-700 text-slate-200">{m.goals.length}/8</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Pending</p>
                    <p className={`font-display font-700 ${m.pending.length > 0 ? "text-yellow-400" : "text-slate-500"}`}>
                      {m.pending.length}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Score</p>
                    <p className="font-display font-700 text-brand-400">
                      {m.weightedScore.toFixed(0)}%
                    </p>
                  </div>
                  <Link
                    to={`/checkin/${m.id}`}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <MessageSquare size={13} />
                    Check-in
                  </Link>
                </div>
              </div>

              {m.goals.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <ProgressBar
                    value={m.weightedScore}
                    max={100}
                    showLabel={false}
                    color={m.weightedScore >= 100 ? "emerald" : "brand"}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}