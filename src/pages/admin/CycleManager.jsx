import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";
import { QUARTERS, getCurrentQuarter } from "../../lib/utils";
import { Calendar, Save } from "lucide-react";

export default function CycleManager() {
  const [cycle, setCycle] = useState({
    year: "2025-26",
    q1_start: "",
    q1_end: "",
    q2_start: "",
    q2_end: "",
    q3_start: "",
    q3_end: "",
    q4_start: "",
    q4_end: "",
    active_quarter: "Q1",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCycle();
  }, []);

  async function loadCycle() {
    const { data } = await supabase.from("cycles").select("*").order("created_at", { ascending: false }).limit(1).single();
    if (data) setCycle(data);
  }

  async function saveCycle() {
    setSaving(true);
    await supabase.from("cycles").upsert(cycle);
    toast.success("Cycle configuration saved!");
    setSaving(false);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
          <Calendar size={18} className="text-brand-400" />
        </div>
        <div>
          <h1 className="font-display font-800 text-2xl text-slate-100">Cycle Manager</h1>
          <p className="text-slate-500 text-sm">Configure goal-setting and check-in windows</p>
        </div>
      </div>

      <div className="card space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Financial Year</label>
            <input value={cycle.year} onChange={(e) => setCycle({ ...cycle, year: e.target.value })} className="input-field" placeholder="2025-26" />
          </div>
          <div>
            <label className="label">Active Quarter</label>
            <select value={cycle.active_quarter} onChange={(e) => setCycle({ ...cycle, active_quarter: e.target.value })} className="input-field">
              {QUARTERS.map((q) => <option key={q.id} value={q.id}>{q.label}</option>)}
            </select>
          </div>
        </div>

        {QUARTERS.map((q) => (
          <div key={q.id}>
            <h3 className="font-display font-600 text-slate-300 mb-3 text-sm">{q.label}</h3>
            <p className="text-xs text-slate-500 mb-3 font-body">{q.action}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Window Opens</label>
                <input
                  type="date"
                  value={cycle[`${q.id.toLowerCase()}_start`] || ""}
                  onChange={(e) => setCycle({ ...cycle, [`${q.id.toLowerCase()}_start`]: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Window Closes</label>
                <input
                  type="date"
                  value={cycle[`${q.id.toLowerCase()}_end`] || ""}
                  onChange={(e) => setCycle({ ...cycle, [`${q.id.toLowerCase()}_end`]: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        ))}

        <button onClick={saveCycle} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
          Save Configuration
        </button>
      </div>
    </div>
  );
}