import React from "react";
import clsx from "clsx";

export default function ProgressBar({ value, max = 100, color = "brand", showLabel = true }) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  const colorMap = {
    brand: "bg-brand-500",
    accent: "bg-accent-500",
    emerald: "bg-emerald-500",
    yellow: "bg-yellow-400",
    red: "bg-red-500",
  };

  return (
    <div className="w-full">
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className={clsx("h-2 rounded-full transition-all duration-700", colorMap[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-slate-500 mt-1">{pct.toFixed(0)}% complete</p>
      )}
    </div>
  );
}