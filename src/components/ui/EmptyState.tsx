import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionText,
  onAction,
  className = ''
}) => {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center p-8 sm:p-10 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-slate-200/80 border border-slate-300/80 flex items-center justify-center text-slate-500 mb-3.5 shadow-2xs">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      <h4 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-3.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs focus-visible:ring-2 focus-visible:ring-emerald-600 focus:outline-none transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
