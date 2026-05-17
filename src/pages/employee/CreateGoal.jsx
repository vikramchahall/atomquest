import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import WeightageValidator from "../../components/WeightageValidator";
import toast from "react-hot-toast";
import { THRUST_AREAS, UOM_TYPES } from "../../lib/utils";
import { Save, X } from "lucide-react";

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
      .from("goals")
      .select("weightage")
      .eq("employee_id", profile.id);
    setExistingGoals(data || []);
  }

  const previewGoals = [
    ...existingGoals,
    { weightage: form.weightage },
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    if (existingGoals.length >= 8)
      return toast.error("Maximum 8 goals allowed");
    if (parseFloat(form.weightage) < 10)
      return toast.error("Minimum weightage is 10%");
    const totalWithNew = existingGoals.reduce((s, g) => s + parseFloat(g.weightage || 0), 0) + parseFloat(form.weightage);
    if (totalWithNew > 100)
      return toast.error(`Adding this goal would exceed 100%. Remaining: ${(100 - totalWithNew + parseFloat(form.weightage)).toFixed(0)}%`);

    setSaving(true);
    const { error } = await supabase.from("goals").insert({
      employee_id: profile.id,
      manager_id: profile.manager_id,
      ...form,
      approval_status: "Draft",
      status: "Not Started",
    });

    if (error) {
      toast.error("Failed to save goal");
    } else {
      // Audit log
      await supabase.from("audit_logs").insert({
        user_id: profile.id,
        action: "GOAL_CREATED",
        entity: "goals",
        details: `Created goal: ${form.title}`,
      });
      toast.success("Goal saved as draft!");
      navigate("/my-goals");
    }
    setSaving(false);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-800 text-2xl text-slate-100">Create Goal</h1>
        <p className="text-slate-500 text-sm font-body mt-0.5">
          {existingGoals.length}/8 goals · Saved as draft until submitted
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Thrust Area *</label>
            <select
              value={form.thrust_area}
              onChange={(e) => setForm({ ...form, thrust_area: e.target.value })}
              className="input-field"
              required
            >
              <option value="">Select thrust area</option>
              {THRUST_AREAS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Goal Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Increase Q2 Sales Revenue by 20%"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe how this goal will be achieved..."
              className="input-field min-h-[80px] resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Unit of Measurement *</label>
              <select
                value={form.uom_type}
                onChange={(e) => setForm({ ...form, uom_type: e.target.value })}
                className="input-field"
              >
                {UOM_TYPES.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Target Value *</label>
              <input
                type={form.uom_type === "timeline" ? "date" : "number"}
                value={form.target}
                onChange={(e) => setForm({ ...form, target: e.target.value })}
                placeholder="100"
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">
              Weightage: <span className="text-brand-400 font-display font-700">{form.weightage}%</span>
              <span className="text-slate-600 ml-2">(min 10%)</span>
            </label>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={form.weightage}
              onChange={(e) => setForm({ ...form, weightage: parseInt(e.target.value) })}
              className="w-full accent-brand-500 mt-2"
            />
          </div>

          <WeightageValidator goals={previewGoals} />

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate("/my-goals")}
              className="btn-secondary flex items-center gap-2"
            >
              <X size={15} /> Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={15} />
              )}
              Save as Draft
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}