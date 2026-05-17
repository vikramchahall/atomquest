import React from "react";
import clsx from "clsx";

export default function WeightageValidator({ goals }) {
  const total = goals.reduce((sum, g) => sum + (parseFloat(g.weightage) || 0), 0);
  const isValid = Math.abs(total - 100) < 0.01;

  return (
    <div className={clsx(
      "flex items-center justify-between px-4 py-3 rounded-xl border text-sm",
      isValid
        ? "bg-emerald-400/5 border-emerald-400/20 text-emerald-400"
        : "bg-yellow-400/5 border-yellow-400/20 text-yellow-400"
    )}>
      <span className="font-body">Total Weightage</span>
      <span className="font-display font-700 text-lg">
        {total.toFixed(0)}% / 100%
      </span>
    </div>
  );
}