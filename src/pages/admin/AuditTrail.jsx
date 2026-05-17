import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { formatDate, exportToCSV } from "../../lib/utils";
import { Download, Shield } from "lucide-react";

const ACTION_COLORS = {
  GOAL_CREATED: "text-brand-400 bg-brand-500/10 border-brand-500/20",
  GOAL_APPROVED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  GOAL_REJECTED: "text-red-400 bg-red-500/10 border-red-500/20",
  QUARTERLY_UPDATE: "text-accent-400 bg-accent-500/10 border-accent-500/20",
  CHECKIN_COMPLETED: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  GOAL_EDITED_PRE_APPROVAL: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
};

export default function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    const { data } = await supabase
      .from("audit_logs")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(200);
    setLogs(data || []);
    setLoading(false);
  }

  const filtered = logs.filter(
    (l) =>
      !filter ||
      l.action?.toLowerCase().includes(filter.toLowerCase()) ||
      l.profiles?.full_name?.toLowerCase().includes(filter.toLowerCase()) ||
      l.details?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Shield size={18} className="text-purple-400" />
          </div>
          <div>
            <h1 className="font-display font-800 text-2xl text-slate-100">Audit Trail</h1>
            <p className="text-slate-500 text-sm">{logs.length} total events</p>
          </div>
        </div>
        <button
          onClick={() => exportToCSV(filtered.map((l) => ({
            Date: new Date(l.created_at).toLocaleString(),
            User: l.profiles?.full_name,
            Action: l.action,
            Details: l.details,
          })), "audit_trail.csv")}
          className="btn-secondary flex items-center gap-2"
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by user, action, or details..."
        className="input-field"
      />

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filtered.map((log) => (
              <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-slate-800/20 transition-all">
                <div className="pt-0.5">
                  <span className={`tag border text-xs ${ACTION_COLORS[log.action] || "text-slate-400 bg-slate-800 border-slate-700"}`}>
                    {log.action?.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body text-slate-300 truncate">{log.details}</p>
                  <p className="text-xs text-slate-600 mt-0.5">by {log.profiles?.full_name || "System"}</p>
                </div>
                <p className="text-xs text-slate-600 whitespace-nowrap font-body">
                  {new Date(log.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}