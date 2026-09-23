import React from 'react';
import { StatusColor } from '../../types.ts';

interface StatusBadgeProps {
  status: StatusColor | 'CRITICAL' | 'WARNING' | 'NORMAL' | 'SURPLUS' | 'PREPAREDNESS' | 'INFO' | string;
  text?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  text,
  size = 'sm',
  pulse = false
}) => {
  const norm = status?.toUpperCase();
  let colorStyles = 'bg-slate-100 text-slate-800 border-slate-300';
  let dotColor = 'bg-slate-500';
  let defaultLabel = text || status;

  if (norm === 'GREEN' || norm === 'NORMAL' || norm === 'CONNECTED' || norm === 'DELIVERED' || norm === 'RECEIVED' || norm === 'RESOLVED') {
    colorStyles = 'bg-emerald-50 text-emerald-900 border-emerald-300';
    dotColor = 'bg-emerald-600';
    if (!text) defaultLabel = norm === 'NORMAL' ? 'Normal' : norm === 'CONNECTED' ? 'Connected' : 'Nominal';
  } else if (norm === 'YELLOW' || norm === 'WARNING' || norm === 'CONFIGURE' || norm === 'APPROVAL PENDING' || norm === 'REQUESTED' || norm === 'EXPIRING_SOON') {
    colorStyles = 'bg-amber-50 text-amber-950 border-amber-300';
    dotColor = 'bg-amber-600';
    if (!text) defaultLabel = norm === 'WARNING' ? 'Needs Attention' : norm === 'EXPIRING_SOON' ? 'Expiring Soon' : 'Pending';
  } else if (norm === 'RED' || norm === 'CRITICAL' || norm === 'NOT CONNECTED' || norm === 'URGENT' || norm === 'EMERGENCY_REPLENISHMENT') {
    colorStyles = 'bg-rose-50 text-rose-950 border-rose-300';
    dotColor = 'bg-rose-600';
    if (!text) defaultLabel = norm === 'CRITICAL' ? 'Critical Action' : 'Action Required';
  } else if (norm === 'BLUE' || norm === 'PREPAREDNESS' || norm === 'SURPLUS' || norm === 'IN TRANSIT' || norm === 'DISPATCHED' || norm === 'INFO') {
    colorStyles = 'bg-sky-50 text-sky-950 border-sky-300';
    dotColor = 'bg-sky-600';
    if (!text) defaultLabel = norm === 'SURPLUS' ? 'Surplus' : norm === 'PREPAREDNESS' ? 'Preparedness' : norm === 'INFO' ? 'Information' : 'In Transit';
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border whitespace-nowrap tracking-tight ${colorStyles} ${sizeClass}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor} ${
          pulse || norm === 'CRITICAL' || norm === 'RED' ? 'animate-pulse' : ''
        }`}
        aria-hidden="true"
      />
      <span>{defaultLabel}</span>
    </span>
  );
};
