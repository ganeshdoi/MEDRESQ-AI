import React from 'react';
import { LucideIcon } from 'lucide-react';
import { StatusBadge } from './StatusBadge.tsx';

interface StatCardProps {
  id?: string;
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  status?: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'PREPAREDNESS' | 'green' | 'yellow' | 'red' | 'blue';
  statusText?: string;
  trend?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  id,
  title,
  value,
  subtext,
  icon: Icon,
  status,
  statusText,
  trend,
  onClick
}) => {
  return (
    <div
      id={id}
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 transition-all shadow-xs flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-sm' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
            {title}
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 font-mono tracking-tight">
            {value}
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/80 shadow-2xs shrink-0">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
        {subtext && <span className="text-slate-600 truncate font-medium">{subtext}</span>}
        {status && <StatusBadge status={status as any} text={statusText} />}
      </div>
      {trend && (
        <div className="text-[11px] text-slate-500 mt-1 font-mono font-medium">
          {trend}
        </div>
      )}
    </div>
  );
};
