import React from 'react';
import { AlertOctagon, RotateCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  referenceId?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Service Telemetry Interrupted',
  message,
  referenceId,
  onRetry,
  className = ''
}) => {
  return (
    <div
      role="alert"
      className={`rounded-xl border border-rose-200 bg-rose-50/70 p-5 sm:p-6 text-slate-800 space-y-3 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0">
          <AlertOctagon className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="space-y-1 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-rose-950">{title}</h4>
            {referenceId && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100/80 text-rose-800 font-semibold">
                REF: {referenceId}
              </span>
            )}
          </div>
          <p className="text-xs text-rose-800/90 leading-relaxed">{message}</p>
        </div>
      </div>

      {onRetry && (
        <div className="pt-2 border-t border-rose-200/60 flex justify-end">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold shadow-xs focus-visible:ring-2 focus-visible:ring-rose-500 focus:outline-none transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}
    </div>
  );
};
