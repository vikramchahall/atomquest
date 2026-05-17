import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import clsx from "clsx";
import {
  LayoutDashboard,
  Target,
  PlusCircle,
  ClipboardCheck,
  Users,
  CheckSquare,
  Settings,
  BarChart3,
  Shield,
  Calendar,
  UserCog,
  Zap,
} from "lucide-react";

const employeeLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/my-goals", icon: Target, label: "My Goals" },
  { to: "/create-goal", icon: PlusCircle, label: "Create Goal" },
  { to: "/quarterly-update", icon: ClipboardCheck, label: "Quarterly Update" },
];

const managerLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/my-goals", icon: Target, label: "My Goals" },
  { to: "/team", icon: Users, label: "Team Overview" },
  { to: "/approve", icon: CheckSquare, label: "Approve Goals" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
];

const adminLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin", icon: Shield, label: "Admin Overview" },
  { to: "/users", icon: UserCog, label: "User Management" },
  { to: "/cycles", icon: Calendar, label: "Cycle Manager" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/audit", icon: Settings, label: "Audit Trail" },
];

export default function Sidebar({ open }) {
  const { profile } = useAuth();
  const role = profile?.role || "employee";
  const links =
    role === "admin" ? adminLinks : role === "manager" ? managerLinks : employeeLinks;

  return (
    <aside
      className={clsx(
        "h-full border-r border-slate-800 bg-dark-900 flex flex-col transition-all duration-300 overflow-hidden",
        open ? "w-64" : "w-0"
      )}
    >
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
          <Zap size={18} className="text-white" />
        </div>
        <div>
          <p className="font-display font-700 text-sm text-slate-100">AtomQuest</p>
          <p className="text-xs text-slate-500">Goal Portal</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-display font-600 text-slate-600 uppercase tracking-wider px-4 py-2">
          Navigation
        </p>
        {links.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx("sidebar-link", isActive && "active")
            }
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="card p-4 !p-4 bg-gradient-to-br from-brand-500/5 to-accent-500/5 border-brand-500/10">
          <p className="text-xs font-display font-600 text-brand-400 uppercase tracking-wide mb-1">
            Active Cycle
          </p>
          <p className="text-sm text-slate-300 font-body">FY 2025–26</p>
          <p className="text-xs text-slate-500 mt-1">Q1 Goal Setting Open</p>
        </div>
      </div>
    </aside>
  );
}