import React from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string | number;
  icon?: React.ReactNode;
  variant?: "primary" | "success" | "neutral";
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  icon,
  variant = "neutral"
}) => {
  const getBorderColor = () => {
    switch (variant) {
      case "primary":
        return "border-zinc-500/30 hover:border-zinc-400/50";
      case "success":
        return "border-emerald-500/30 hover:border-emerald-500/50";
      default:
        return "border-dark-border hover:border-zinc-700";
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "primary":
        return "text-zinc-300";
      case "success":
        return "text-emerald-400";
      default:
        return "text-slate-300";
    }
  };

  return (
    <div className={`bg-dark-card border ${getBorderColor()} rounded-xl p-3 flex flex-col justify-between transition-all duration-200 shadow-md`}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</span>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div>
        <span className="text-xl font-bold text-dark-text tracking-tight">{value}</span>
        {subValue && (
          <span className={`text-xs ml-1.5 font-semibold ${getTextColor()}`}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
};
