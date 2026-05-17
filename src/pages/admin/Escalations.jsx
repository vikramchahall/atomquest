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
          <span>Trigger after <strong className="text-slate-300">{rule.days_threshold} days</strong></span>
        </div>
        <div className="flex items-center gap-2">
          {rule.notify_employee && <span className="tag bg-slate-800 border border-slate-700 text-slate-400">Employee</span>}
          {rule.notify_manager && <span className="tag bg-slate-800 border border-slate-700 text-slate-400">Manager</span>}
          {rule.notify_hr && <span className="tag bg-purple-500/10 border-purple-500/20 text-purple-400">HR</span>}
        </div>
      </div>
      <button onClick={() => onEdit(rule)} className="mt-3 text-xs text-brand-400 hover:text-brand-300 font-body flex items-center gap-1">
        <Settings size={11} /> Edit Rule
      </button>
    </div>
  );
}

function IncidentRow({ incident, profiles, onResolve }) {
  const emp = profiles.find(p => p.id === incident.employee_id);
  const mgr = profiles.find(p => p.id === incident.manager_id);
  const typeColor = {
    goal_not_submitted: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    approval_overdue: "bg-red-500/10 text-red-400 border-red-500/20",
    checkin_overdue: "bg-accent-500/10 text-accent-400 border-accent-500/20",
  };
  const statusColor = {
    open: "bg-red-500/10 text-red-400 border-red-500/20",
    escalated: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    resolved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };

  return (
    <tr className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-all">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-xs font-display font-700">
            {emp?.full_name?.[0] || "?"}
          </div>
          <div>
            <p className="text-sm text-slate-200 font-body">{emp?.full_name || "—"}</p>
            <p className="text-xs text-slate-500">{emp?.department || "—"}</p>
          </div>
        </div>
      </td>
      <td className="p-4">
        <span className={`tag border text-xs ${typeColor[incident.type]}`}>
          {incident.type.replace(/_/g, " ")}
        </span>
      </td>
      <td className="p-4 text-sm text-slate-400 font-body">{mgr?.full_name || "—"}</td>
      <td className="p-4">
        <span className={`font-display font-700 text-sm ${incident.days_overdue > 14 ? "text-red-400" : incident.days_overdue > 7 ? "text-yellow-400" : "text-slate-300"}`}>
          {incident.days_overdue}d
        </span>
      </td>
      <td className="p-4 text-xs text-slate-500 font-body">{formatDate(incident.created_at)}</td>
      <td className="p-4">
        <span className={`tag border text-xs ${statusColor[incident.status]}`}>{incident.status}</span>
      </td>
      <td className="p-4">
        {incident.status !== "resolved" && (
          <button onClick={() => onResolve(incident.id)}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-body flex items-center gap-1">
            <CheckCircle size={12} /> Resolve
          </button>
        )}
      </td>
    </tr>
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

  async function toggleRule(rule) {
    await supabase.from("escalation_rules").update({ is_active: !rule.is_active }).eq("id", rule.id);
    toast.success(`Rule ${!rule.is_active ? "enabled" : "disabled"}`);
    loadAll();
  }

  async function resolveIncident(id) {
    await supabase.from("escalation_incidents").update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    }).eq("id", id);
    toast.success("Incident resolved");
    loadAll();
  }

  async function saveRule() {
    if (!editingRule) return;
    if (editingRule.id) {
      await supabase.from("escalation_rules").update(editingRule).eq("id", editingRule.id);
      toast.success("Rule updated");
    } else {
      await supabase.from("escalation_rules").insert(editingRule);
      toast.success("Rule created");
    }
    setEditingRule(null);
    loadAll();
  }

  // Run escalation engine — checks all conditions and creates incidents
  async function runEscalationEngine() {
    setRunning(true);
    const now = new Date();
    const activeRules = rules.filter(r => r.is_active);
    let created = 0;

    for (const rule of activeRules) {
      if (rule.type === "goal_not_submitted") {
        // Employees with no goals submitted (still Draft or no goals at all)
        const employees = profiles.filter(p => p.role === "employee");
        for (const emp of employees) {
          const empGoals = goals.filter(g => g.employee_id === emp.id);
          const hasSubmitted = empGoals.some(g => g.approval_status !== "Draft");
          if (!hasSubmitted) {
            const daysOld = empGoals.length > 0
              ? Math.floor((now - new Date(empGoals[0].created_at)) / 86400000)
              : rule.days_threshold + 1;
            if (daysOld >= rule.days_threshold) {
              // Check if incident already open
              const existing = incidents.find(i =>
                i.employee_id === emp.id && i.type === rule.type && i.status === "open"
              );
              if (!existing) {
                await supabase.from("escalation_incidents").insert({
                  rule_id: rule.id,
                  employee_id: emp.id,
                  manager_id: emp.manager_id,
                  type: rule.type,
                  status: "open",
                  days_overdue: daysOld,
                  details: `${emp.full_name} has not submitted goals after ${daysOld} days`,
                });
                created++;
              }
            }
          }
        }
      }

      if (rule.type === "approval_overdue") {
        // Goals pending approval past threshold
        const pendingGoals = goals.filter(g => g.approval_status === "Pending");
        for (const goal of pendingGoals) {
          const daysOld = Math.floor((now - new Date(goal.created_at)) / 86400000);
          if (daysOld >= rule.days_threshold) {
            const existing = incidents.find(i =>
              i.employee_id === goal.employee_id && i.type === rule.type && i.status === "open"
            );
            if (!existing) {
              await supabase.from("escalation_incidents").insert({
                rule_id: rule.id,
                employee_id: goal.employee_id,
                manager_id: goal.manager_id,
                type: rule.type,
                status: daysOld > rule.days_threshold * 2 ? "escalated" : "open",
                days_overdue: daysOld,
                details: `Goal "${goal.title}" pending approval for ${daysOld} days`,
              });
              created++;
            }
          }
        }
      }

      if (rule.type === "checkin_overdue") {
        // Employees with approved goals but no Q-checkin this cycle
        const approvedGoalEmployees = [...new Set(
          goals.filter(g => g.approval_status === "Approved").map(g => g.employee_id)
        )];
        const currentQ = ["Q1","Q2","Q3","Q4"][[4,5,6].includes(now.getMonth()+1) ? 0 : [7,8,9].includes(now.getMonth()+1) ? 1 : [10,11,12].includes(now.getMonth()+1) ? 2 : 3];
        for (const empId of approvedGoalEmployees) {
          const { data: checkin } = await supabase
            .from("quarterly_checkins")
            .select("id")
            .eq("employee_id", empId)
            .eq("quarter", currentQ)
            .eq("checkin_done", true)
            .maybeSingle();
          if (!checkin) {
            const emp = profiles.find(p => p.id === empId);
            const existing = incidents.find(i =>
              i.employee_id === empId && i.type === rule.type && i.status === "open"
            );
            if (!existing && emp) {
              await supabase.from("escalation_incidents").insert({
                rule_id: rule.id,
                employee_id: empId,
                manager_id: emp?.manager_id,
                type: rule.type,
                status: "open",
                days_overdue: rule.days_threshold,
                details: `${emp?.full_name} has not completed ${currentQ} check-in`,
              });
              created++;
            }
          }
        }
      }
    }

    toast.success(`Escalation engine ran. ${created} new incident(s) raised.`);
    setRunning(false);
    loadAll();
  }

  const openCount = incidents.filter(i => i.status === "open").length;
  const escalatedCount = incidents.filter(i => i.status === "escalated").length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div>
            <h1 className="font-display font-800 text-2xl text-slate-100">Escalation Module</h1>
            <p className="text-slate-500 text-sm">
              {openCount} open · {escalatedCount} escalated · {rules.filter(r => r.is_active).length} active rules
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => exportToCSV(
              incidents.map(i => ({
                Employee: profiles.find(p => p.id === i.employee_id)?.full_name || "—",
                Type: i.type,
                Status: i.status,
                DaysOverdue: i.days_overdue,
                Details: i.details,
                RaisedOn: i.created_at,
              })),
              "escalation_log.csv"
            )}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Download size={14} /> Export Log
          </button>
          <button
            onClick={runEscalationEngine}
            disabled={running}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {running ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <RefreshCw size={14} />}
            {running ? "Running..." : "Run Escalation Check"}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="font-display font-800 text-4xl text-red-400">{openCount}</p>
          <p className="text-sm text-slate-400 font-body mt-1">Open Incidents</p>
        </div>
        <div className="card text-center">
          <p className="font-display font-800 text-4xl text-yellow-400">{escalatedCount}</p>
          <p className="text-sm text-slate-400 font-body mt-1">Escalated</p>
        </div>
        <div className="card text-center">
          <p className="font-display font-800 text-4xl text-emerald-400">{incidents.filter(i => i.status === "resolved").length}</p>
          <p className="text-sm text-slate-400 font-body mt-1">Resolved</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: "incidents", label: `Incidents (${incidents.length})` },
          { id: "rules", label: `Rules (${rules.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-display font-600 transition-all ${tab === t.id ? "bg-brand-500 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Incidents Tab */}
      {tab === "incidents" && (
        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : incidents.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle size={32} className="text-emerald-500 mx-auto mb-3" />
              <p className="text-slate-400 font-body">No incidents yet. Click "Run Escalation Check" to scan for issues.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  {["Employee","Type","Manager","Days Overdue","Raised","Status","Action"].map(h => (
                    <th key={h} className="text-left text-xs text-slate-500 font-display p-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incidents.map(i => (
                  <IncidentRow key={i.id} incident={i} profiles={profiles} onResolve={resolveIncident} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Rules Tab */}
      {tab === "rules" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules.map(rule => (
              <RuleCard key={rule.id} rule={rule} onToggle={toggleRule} onEdit={setEditingRule} />
            ))}
            <button
              onClick={() => setEditingRule({
                name: "", type: "goal_not_submitted", days_threshold: 7,
                notify_employee: true, notify_manager: true, notify_hr: false, is_active: true,
              })}
              className="card border-dashed border-slate-700 hover:border-brand-500/30 flex items-center justify-center gap-2 text-slate-500 hover:text-brand-400 transition-all min-h-[140px] cursor-pointer"
            >
              <Plus size={18} /> Add New Rule
            </button>
          </div>
        </div>
      )}

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full space-y-5">
            <h3 className="font-display font-700 text-xl text-slate-100">
              {editingRule.id ? "Edit Rule" : "New Rule"}
            </h3>

            <div>
              <label className="label">Rule Name</label>
              <input value={editingRule.name} onChange={e => setEditingRule({ ...editingRule, name: e.target.value })}
                className="input-field" placeholder="e.g., Goal Submission Reminder" />
            </div>

            <div>
              <label className="label">Trigger Type</label>
              <select value={editingRule.type} onChange={e => setEditingRule({ ...editingRule, type: e.target.value })} className="input-field">
                <option value="goal_not_submitted">Goal Not Submitted</option>
                <option value="approval_overdue">Approval Overdue</option>
                <option value="checkin_overdue">Check-in Overdue</option>
              </select>
            </div>

            <div>
              <label className="label">Trigger After (days): <span className="text-brand-400 font-700">{editingRule.days_threshold}</span></label>
              <input type="range" min={1} max={30} value={editingRule.days_threshold}
                onChange={e => setEditingRule({ ...editingRule, days_threshold: parseInt(e.target.value) })}
                className="w-full accent-brand-500 mt-1" />
              <div className="flex justify-between text-xs text-slate-600 mt-1">
                <span>1 day</span><span>30 days</span>
              </div>
            </div>

            <div>
              <label className="label">Notify</label>
              <div className="flex gap-3 mt-1">
                {[
                  { key: "notify_employee", label: "Employee" },
                  { key: "notify_manager", label: "Manager" },
                  { key: "notify_hr", label: "HR" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editingRule[key]}
                      onChange={e => setEditingRule({ ...editingRule, [key]: e.target.checked })}
                      className="w-4 h-4 accent-brand-500" />
                    <span className="text-sm text-slate-300 font-body">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingRule(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={saveRule} className="btn-primary flex-1">Save Rule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}