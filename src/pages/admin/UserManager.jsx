import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";
import { UserPlus, Unlock } from "lucide-react";
import StatusBadge from "../../components/StatusBadge";

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ full_name: "", email: "", role: "employee", department: "", manager_id: "" });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const { data } = await supabase.from("profiles").select("*").order("full_name");
    setUsers(data || []);
    setManagers((data || []).filter((u) => u.role === "manager" || u.role === "admin"));
    setLoading(false);
  }

  async function unlockGoals(userId) {
    await supabase.from("goals").update({ locked: false, approval_status: "Draft" }).eq("employee_id", userId);
    toast.success("Goals unlocked for editing");
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-800 text-2xl text-slate-100">User Management</h1>
          <p className="text-slate-500 text-sm">{users.length} total users</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <UserPlus size={15} />
          Add User
        </button>
      </div>

      {showForm && (
        <div className="card border-brand-500/20">
          <h3 className="font-display font-600 text-slate-100 mb-4">New User</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} className="input-field" placeholder="John Doe" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="input-field" placeholder="john@company.com" />
            </div>
            <div>
              <label className="label">Role</label>
              <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="input-field">
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="label">Department</label>
              <input value={newUser.department} onChange={(e) => setNewUser({ ...newUser, department: e.target.value })} className="input-field" placeholder="Engineering" />
            </div>
            <div>
              <label className="label">Reporting Manager</label>
              <select value={newUser.manager_id} onChange={(e) => setNewUser({ ...newUser, manager_id: e.target.value })} className="input-field">
                <option value="">None</option>
                {managers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 font-body">
            Note: Create the user in Supabase Auth first, then their profile will be created automatically via the trigger.
          </p>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left text-xs text-slate-500 font-display p-4">Name</th>
              <th className="text-left text-xs text-slate-500 font-display p-4">Email</th>
              <th className="text-left text-xs text-slate-500 font-display p-4">Role</th>
              <th className="text-left text-xs text-slate-500 font-display p-4">Dept</th>
              <th className="text-left text-xs text-slate-500 font-display p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-all">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-xs font-display font-700">
                      {u.full_name?.[0]}
                    </div>
                    <span className="text-sm font-body text-slate-200">{u.full_name}</span>
                  </div>
                </td>
                <td className="p-4 text-sm text-slate-400 font-body">{u.email}</td>
                <td className="p-4">
                  <StatusBadge status={u.role === "admin" ? "Approved" : u.role === "manager" ? "On Track" : "Not Started"} />
                </td>
                <td className="p-4 text-sm text-slate-400 font-body">{u.department || "—"}</td>
                <td className="p-4">
                  <button
                    onClick={() => unlockGoals(u.id)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-400 transition-colors font-body"
                    title="Unlock all goals"
                  >
                    <Unlock size={12} /> Unlock Goals
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}