import React from "react";
import Link from "next/link";
import { ChevronRightIcon } from "../ui/icons";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  href?: string;
  accentColor?: "emerald" | "blue" | "rose" | "purple" | "amber" | "cyan";
  trend?: {
    label: string;
    positive?: boolean;
  };
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  href,
  accentColor = "emerald",
  trend,
}: StatCardProps) {
  const iconBgMap = {
    emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    blue: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    rose: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    purple: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    cyan: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  };

  const Content = (
    <div className="p-5 bg-[#121929] border border-slate-800/80 hover:border-slate-700/80 rounded-2xl transition-all duration-200 shadow-md group flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {icon && (
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-lg shrink-0 transition-transform group-hover:scale-105 ${iconBgMap[accentColor]}`}
          >
            {icon}
          </div>
        )}
        <div>
          <div className="text-xs font-medium text-slate-400">{title}</div>
          <div className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-0.5">
            {value}
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-400 font-normal mt-0.5">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-1 text-xs font-medium">
              <span className={trend.positive ? "text-emerald-400" : "text-amber-400"}>
                {trend.label}
              </span>
            </div>
          )}
        </div>
      </div>
      {href && (
        <div className="text-slate-500 group-hover:text-slate-300 transition-colors">
          <ChevronRightIcon className="w-5 h-5" />
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{Content}</Link>;
  }

  return Content;
}
