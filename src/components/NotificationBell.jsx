import React, { useEffect, useState, useRef } from "react";
import { Bell, X, CheckCheck, CheckCircle, AlertTriangle, Info, Clock } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";

const TYPE_CONFIG = {
  success: { bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle,   color: "text-emerald-500" },
  warning: { bg: "bg-yellow-50",  border: "border-yellow-200",  icon: Clock,         color: "text-yellow-500" },
  error:   { bg: "bg-red-50",     border: "border-red-200",     icon: AlertTriangle, color: "text-red-500"    },
  info:    { bg: "bg-brand-50",   border: "border-brand-200",   icon: Info,          color: "text-brand-500"  },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const { profile }           = useAuth();
  const navigate              = useNavigate();
  const [notifs, setNotifs]   = useState([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(true);
  const panelRef              = useRef(null);

  const unread = notifs.filter(n => !n.read).length;

  // Load + subscribe on mount
  useEffect(() => {
    if (!profile?.id) return;

    loadNotifications();

    // Realtime — new rows appear instantly
    const channel = supabase
      .channel("bell-" + profile.id)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          console.log("[bell] Realtime notification received:", payload.new.title);
          setNotifs(prev => [payload.new, ...prev]);
        }
      )
      .subscribe((status) => {
        console.log("[bell] Realtime status:", status);
      });

    return () => supabase.removeChannel(channel);
  }, [profile?.id]);

  // Close when clicking outside
  useEffect(() => {
    function onOutsideClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  async function loadNotifications() {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) console.error("[bell] Load error:", error.message);
    setNotifs(data || []);
    setLoading(false);
  }

  async function markRead(id) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  }

  async function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", profile.id)
      .eq("read", false);
  }

  function handleClick(notif) {
    markRead(notif.id);
    if (notif.link) {
      setOpen(false);
      navigate(notif.link);
    }
  }

  return (
    <div className="relative" ref={panelRef}>

      {/* ── Bell button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-surface-100"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-brand-500 rounded-full flex items-center justify-center text-white font-display font-700 text-[10px] px-1 shadow-sm animate-fade-in">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-surface-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100 bg-surface-50">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-slate-400" />
              <span className="font-display font-600 text-slate-700 text-sm">Notifications</span>
              {unread > 0 && (
                <span className="tag bg-brand-100 text-brand-700 border border-brand-200 text-xs py-0.5">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-body transition-colors"
                >
                  <CheckCheck size={12} />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-slate-300 hover:text-slate-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-surface-100">
            {loading ? (
              <div className="py-10 text-center">
                <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="py-12 text-center px-4">
                <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-3">
                  <Bell size={20} className="text-slate-300" />
                </div>
                <p className="text-sm font-display font-600 text-slate-400">No notifications yet</p>
                <p className="text-xs text-slate-300 font-body mt-1">
                  Goal updates and reminders appear here
                </p>
              </div>
            ) : (
              notifs.map((n) => {
                const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
                const Icon   = config.icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={clsx(
                      "flex gap-3 p-4 cursor-pointer hover:bg-surface-50 transition-all",
                      !n.read && "bg-brand-50/50"
                    )}
                  >
                    {/* Icon */}
                    <div className={clsx(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border mt-0.5",
                      config.bg, config.border
                    )}>
                      <Icon size={13} className={config.color} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={clsx(
                        "text-sm leading-snug",
                        n.read ? "text-slate-400 font-body" : "text-slate-800 font-body font-500"
                      )}>
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-snug line-clamp-2 font-body">
                        {n.message}
                      </p>
                      <p className="text-xs text-slate-300 mt-1 font-body">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="px-4 py-2.5 border-t border-surface-100 bg-surface-50 text-center">
              <p className="text-xs text-slate-400 font-body">Showing last 30 notifications</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}