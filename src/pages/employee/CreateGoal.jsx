import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import WeightageValidator from "../../components/WeightageValidator";
import toast from "react-hot-toast";
import { THRUST_AREAS, UOM_TYPES } from "../../lib/utils";
import { Save, X, Info } from "lucide-react";

export default function CreateGoal() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [existingGoals, setExistingGoals] = useState([]);
  const [form, setForm] = useState({
    thrust_area: "",
    title: "",
    description: "",
    uom_type: "min_numeric",
    target: "",
    weightage: 10,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) loadExisting();
  }, [profile]);

  async function loadExisting() {
    const { data } = await supabase
      .from("goals").select("weightage, approval_status")
      .eq("employee_id", profile.id);
    setExistingGoals(data || []);
  }

  const usedWeightage = existingGoals.reduce((s, g) => s + parseFloat(g.weightage || 0), 0);
  const remaining = 100 - usedWeightage;
  const previewGoals = [...existingGoals, { weightage: form.weightage }];
  const hasApproved = existingGoals.some(g => g.approval_status === "Approved");

  async function handleSubmit(e) {
    e.preventDefault();
    if (existingGoals.length >= 8) return toast.error("Maximum 8 goals allowed.");
    if (parseFloat(form.weightage) < 10) return toast.error("Minimum weightage per goal is 10%.");
    if (parseFloat(form.weightage) > remaining + 0.01)
      return toast.error(`Only ${remaining}% weightage remaining. Adjust your weightage.`);
    if (!form.thrust_area) return toast.error("Please select a thrust area.");
    if (!form.title.trim()) return toast.error("Please enter a goal title.");
    if (!form.target) return toast.error("Please enter a target value.");

    setSaving(true);
    const { error } = await supabase.from("goals").insert({
      employee_id: profile.id,
      manager_id: profile.manager_id || null,
      thrust_area: form.thrust_area,
      title: form.title,
      description: form.description,
      uom_type: form.uom_type,
      target: form.target,
      weightage: form.weightage,
      approval_status: "Draft",
      status: "Not Started",
    });

    if (error) {
      console.error(error);
      toast.error("Failed to save goal. " + error.message);
    } else {
      await supabase.from("audit_logs").insert({
        user_id: profile.id,
        action: "GOAL_CREATED",
        entity: "goals",
        details: `Created goal: "${form.title}" (${form.thrust_area}, ${form.weightage}%)`,
      });
      toast.success("Goal saved as draft! Add more goals or submit when ready.");
      navigate("/my-goals");
    }
    setSaving(false);
  }

  if (hasApproved && existingGoals.every(g => g.approval_status === "Approved")) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center py-12">
          <p className="text-slate-400 font-body">Your goals are approved and locked. Contact your admin to unlock if changes are needed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-800 text-2xl text-slate-100">Create New Goal</h1>
        <p className="text-slate-500 text-sm font-body mt-0.5">
          Goal {existingGoals.length + 1} of 8 · {remaining}% weightage remaining
        </p>
      </div>

      {/* Instructions */}
      <div className="p-4 rounded-xl bg-brand-500/5 border border-brand-500/20 flex gap-3">
        <Info size={15} className="text-brand-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs font-body text-slate-400 space-y-1">
          <p><strong className="text-slate-300">Thrust Area</strong> — the strategic category this goal falls under.</p>
          <p><strong className="text-slate-300">UoM (Unit of Measurement)</strong> — how achievement is measured:</p>
          <p className="ml-2">· <em>Min Numeric/% </em>= higher is better (e.g. sales revenue, NPS)</p>
          <p className="ml-2">· <em>Max Numeric/% </em>= lower is better (e.g. cost, defects, TAT)</p>
          <p className="ml-2">· <em>Timeline</em> = complete by a date</p>
          <p className="ml-2">· <em>Zero-based</em> = 0 = success (e.g. safety incidents)</p>
          <p><strong className="text-slate-300">Weightage</strong> — importance of this goal. All goals must total 100%.</p>
          <p>This goal is saved as a <strong className="text-slate-300">Draft</strong>. Go to My Goals to submit all drafts for manager approval.</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Thrust Area */}
          <div>
            <label className="label">Thrust Area *</label>
            <select value={form.thrust_area} onChange={(e) => setForm({ ...form, thrust_area: e.target.value })} className="input-field" required>
              <option value="">Select a thrust area...</option>
              {THRUST_AREAS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="label">Goal Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Increase Q2 Revenue by 20%, Reduce TAT to under 3 days"
              className="input-field"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="label">Description <span className="text-slate-600">(optional)</span></label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe how this goal will be achieved, success criteria, etc."
              className="input-field resize-none"
              rows={3}
            />
          </div>

          {/* UoM + Target */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Unit of Measurement *</label>
              <select value={form.uom_type} onChange={(e) => setForm({ ...form, uom_type: e.target.value, target: "" })} className="input-field">
                {UOM_TYPES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">
                Target Value *
                {form.uom_type === "zero" && <span className="text-slate-500 ml-1">(enter 0 for success)</span>}
                {form.uom_type === "timeline" && <span className="text-slate-500 ml-1">(deadline date)</span>}
              </label>
              <input
                type={form.uom_type === "timeline" ? "date" : "number"}
                value={form.target}
                onChange={(e) => setForm({ ...form, target: e.target.value })}
                placeholder={form.uom_type === "zero" ? "0" : form.uom_type.includes("percent") ? "e.g. 95" : "e.g. 1000000"}
                className="input-field"
                required
              />
            </div>
          </div>

          {/* Weightage */}
          <div>
            <label className="label">
              Weightage: <span className="text-brand-400 font-display font-700 text-base">{form.weightage}%</span>
              <span className="text-slate-600 ml-2 text-xs">· Remaining: {remaining - form.weightage}% after this goal</span>
            </label>
            <input
              type="range"
              min={10}
              max={Math.min(remaining, 100)}
              step={5}
              value={form.weightage}
              onChange={(e) => setForm({ ...form, weightage: parseInt(e.target.value) })}
              className="w-full accent-brand-500 mt-2"
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>10% (min)</span>
              <span>{Math.min(remaining, 100)}% (max available)</span>
            </div>
          </div>

          {/* Weightage preview */}
          <WeightageValidator goals={previewGoals} />

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate("/my-goals")} className="btn-secondary flex items-center gap-2">
              <X size={14} /> Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
              Save as Draft
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}