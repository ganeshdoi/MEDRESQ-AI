import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded bg-slate-200/80 ${className}`}
    />
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 5
}) => {
  return (
    <div role="status" aria-label="Loading data table" className="w-full space-y-3 p-4 bg-white rounded-xl border border-slate-200">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-7 w-28 rounded-md" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex items-center gap-3">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <Skeleton
                key={cIdx}
                className={`h-6 ${
                  cIdx === 0 ? 'w-2/5' : cIdx === cols - 1 ? 'w-20' : 'flex-1'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const MetricCardSkeleton: React.FC = () => {
  return (
    <div role="status" aria-label="Loading metric" className="p-4 bg-white rounded-xl border border-slate-200 space-y-2.5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
};
