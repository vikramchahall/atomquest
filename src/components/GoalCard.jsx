import React from "react";
import StatusBadge from "./StatusBadge";
import ProgressBar from "./ProgressBar";
import { computeScore, getScoreColor } from "../lib/utils";
import { Target, TrendingUp } from "lucide-react";

export default function GoalCard({ goal, onClick }) {
  const score = computeScore(goal.uom_type, goal.target, goal.actual_achievement);
  const scoreColor = getScoreColor(score);

  return (
    <div
      onClick={onClick}
      className="card hover:border-slate-700 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-xs text-slate-500 font-body mb-1">{goal.thrust_area}</p>
          <h3 className="font-display font-600 text-slate-100 text-sm leading-snug">
            {goal.title}
          </h3>
        </div>
        <StatusBadge status={goal.status || "Not Started"} />
      </div>

      <div className="grid grid-cols-3 gap-4 my-4 py-4 border-y border-slate-800">
        <div>
          <p className="text-xs text-slate-500 mb-1">Target</p>
          <p className="font-display font-600 text-slate-200 text-sm">{goal.target}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Achieved</p>
          <p className="font-display font-600 text-slate-200 text-sm">
            {goal.actual_achievement || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Weightage</p>
          <p className="font-display font-600 text-brand-400 text-sm">{goal.weightage}%</p>
        </div>
      </div>

      {goal.actual_achievement && (
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <TrendingUp size={11} /> Score
            </span>
            <span className={`text-xs font-display font-700 ${scoreColor}`}>
              {score.toFixed(0)}%
            </span>
          </div>
          <ProgressBar
            value={score}
            max={100}
            showLabel={false}
            color={score >= 100 ? "emerald" : score >= 75 ? "brand" : score >= 50 ? "yellow" : "red"}
          />
        </div>
      )}
    </div>
  );
}