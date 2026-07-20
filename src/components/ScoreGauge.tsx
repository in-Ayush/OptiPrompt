import React from "react";

interface ScoreGaugeProps {
  score: number;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score }) => {
  // SVG Ring Calculations
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Grade styling mapping
  const getGradeInfo = (val: number) => {
    if (val >= 80) {
      return {
        color: "stroke-emerald-500",
        bgCircle: "stroke-emerald-950",
        textColor: "text-emerald-400",
        grade: "Excellent",
        bgBadge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      };
    } else if (val >= 50) {
      return {
        color: "stroke-amber-500",
        bgCircle: "stroke-amber-950",
        textColor: "text-amber-400",
        grade: "Acceptable",
        bgBadge: "bg-amber-500/10 text-amber-400 border-amber-500/20"
      };
    } else {
      return {
        color: "stroke-rose-500",
        bgCircle: "stroke-rose-950",
        textColor: "text-rose-400",
        grade: "Needs Work",
        bgBadge: "bg-rose-500/10 text-rose-400 border-rose-500/20"
      };
    }
  };

  const info = getGradeInfo(score);

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-3 flex items-center gap-4 shadow-md">
      {/* Circular Gauge */}
      <div className="relative flex items-center justify-center" style={{ width: "80px", height: "80px" }}>
        <svg className="transform -rotate-90 w-20 h-20">
          {/* Background circle */}
          <circle
            cx="40"
            cy="40"
            r={radius}
            className={`stroke-2 fill-none ${info.bgCircle}`}
          />
          {/* Progress circle */}
          <circle
            cx="40"
            cy="40"
            r={radius}
            className={`stroke-2 fill-none ${info.color} transition-all duration-500 ease-out`}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        {/* Score Value in Center */}
        <div className="absolute text-center">
          <span className="text-xl font-bold text-dark-text tracking-tighter">{score}</span>
        </div>
      </div>

      {/* Grade and description */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Quality Score</span>
          <span className={`text-[10px] px-2 py-0.5 font-bold rounded-full border ${info.bgBadge}`}>
            {info.grade}
          </span>
        </div>
        <p className="text-xs text-slate-400 leading-normal">
          {score >= 80
            ? "Your prompt is clean, concise, and structured for optimal LLM results."
            : score >= 50
            ? "Contains some fluff or repeated words. Tap 'Optimize' to improve."
            : "Highly verbose or repetitive. Optimization is strongly advised."}
        </p>
      </div>
    </div>
  );
};
