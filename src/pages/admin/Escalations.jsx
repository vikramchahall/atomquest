import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { exportToCSV, formatDate } from "../../lib/utils";
import toast from "react-hot-toast";
import { AlertTriangle, CheckCircle, Settings, Plus, Download, RefreshCw, Clock } from "lucide-react";

function RuleCard({ rule, onToggle, onEdit }) {
  const typeLabel = {
    goal_not_submitted: "Goal Not Submitted",
    approval_overdue: "Approval Overdue",
    checkin_overdue: "Check-in Overdue",
  };
  const typeColor = {
    goal_not_submitted: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    approval_overdue: "text-red-400 bg-red-500/10 border-red-500/20",
    checkin_overdue: "text-accent-400 bg-accent-500/10 border-accent-500/20",
  };

  return (
    <div className={`card transition-all ${rule.is_active ? "border-slate-700" : "opacity-50 border-slate-800"}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className={`tag border text-xs ${typeColor[rule.type]}`}>
            {typeLabel[rule.type]}
          </span>
          <h3 className="font-display font-600 text-slate-100 mt-2">{rule.name}</h3>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={rule.is_active} onChange={() => onToggle(rule)} className="sr-only peer" />
          <div className="w-10 h-5 bg-slate-700 peer-checked:bg-brand-500 rounded-full transition-all relative">
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-all ${rule.is_active ? "translate-x-5" : ""}`} />
          </div>
        </label>
      </div>
      <div className="flex items-center gap-6 text-xs text-slate-500 font-body">
        <div className="flex items-center gap-1.5">
          <Clock size={11} className="text-brand-400" />
          <span>Trigger: <strong className="text-slate-300">{rule.days_threshold} days</strong></span>
        </div>
      </div>
      <button onClick={() => onEdit(rule)} className="mt-3 text-xs text-brand-400 hover:text-brand-300 font-body flex items-center gap-1">
        <Settings size={11} /> Edit Rule
      </button>
    </div>
  );
}

export default function Escalations() {
  const [rules, setRules] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [tab, setTab] = useState("incidents");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [{ data: r }, { data: i }, { data: p }, { data: g }] = await Promise.all([
      supabase.from("escalation_rules").select("*").order("created_at"),
      supabase.from("escalation_incidents").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("goals").select("*"),
    ]);
    setRules(r || []);
    setIncidents(i || []);
    setProfiles(p || []);
    setGoals(g || []);
    setLoading(false);
  }

  async function runEscalationEngine() {
    setRunning(true);
    // Simple logic: Scan for pending goals older than 5 days
    const now = new Date();
    const pending = goals.filter(g => g.approval_status === 'Pending');
    let created = 0;

    for (const goal of pending) {
      const daysOld = Math.floor((now - new Date(goal.created_at)) / 86400000);
      if (daysOld >= 5) {
        const { error } = await supabase.from("escalation_incidents").insert({
          type: 'approval_overdue',
          employee_id: goal.employee_id,
          manager_id: goal.manager_id,
          status: 'open',
          days_overdue: daysOld,
          details: `Goal "${goal.title}" is stuck in pending for ${daysOld} days.`
        });
        if (!error) created++;
      }
    }
    toast.success(`Engine ran. ${created} issues found.`);
    setRunning(false);
    loadAll();
  }

  async function resolveIncident(id) {
    await supabase.from("escalation_incidents").update({ status: 'resolved' }).eq('id', id);
    toast.success("Resolved");
    loadAll();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-800 text-2xl text-slate-100">Escalation Module</h1>
        <button onClick={runEscalationEngine} disabled={running} className="btn-primary flex items-center gap-2">
          <RefreshCw size={14} className={running ? "animate-spin" : ""} /> Run Scan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rules.map(r => <RuleCard key={r.id} rule={r} onToggle={() => {}} onEdit={setEditingRule} />)}
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-left">
          <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
            <tr>
              <th className="p-4">Employee</th>
              <th className="p-4">Type</th>
              <th className="p-4">Overdue</th>
              <th className="p-4">Status</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {incidents.map(i => (
              <tr key={i.id} className="border-t border-slate-800">
                <td className="p-4">{profiles.find(p => p.id === i.employee_id)?.full_name}</td>
                <td className="p-4 text-xs font-mono">{i.type}</td>
                <td className="p-4 text-red-400">{i.days_overdue}d</td>
                <td className="p-4">{i.status}</td>
                <td className="p-4">
                  {i.status === 'open' && (
                    <button onClick={() => resolveIncident(i.id)} className="text-emerald-400 hover:underline">Resolve</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}