import React, { useState } from 'react';
import {
  BellRing,
  AlertTriangle,
  Pill,
  Thermometer,
  Users,
  CheckCircle2,
  ArrowRight,
  Filter,
  Check,
  Building2,
  ShieldCheck,
  Radio,
  FilterX,
  HelpCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusBadge } from '../ui/StatusBadge.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { WhyThisAlertModal, AlertMathBreakdown } from '../ui/WhyThisAlertModal.tsx';

export const AlertCentre: React.FC = () => {
  const { alerts, acknowledgeAlert, approveRedistribution, setActiveModule, selectedPHC, showNotification } = useApp();
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [selectedAlertForExplanation, setSelectedAlertForExplanation] = useState<AlertMathBreakdown | null>(null);
  const [isWhyModalOpen, setIsWhyModalOpen] = useState(false);

  const handleOpenWhyAlert = (alert: any) => {
    if (alert.id === 'ALT-101' || alert.title.toLowerCase().includes('ors') || alert.iconType === 'pill') {
      setSelectedAlertForExplanation({
        title: alert.title,
        medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
        currentStock: 210,
        unit: 'units',
        avgDailyConsumption: 58,
        recentTrendPercent: 21,
        forecastDemand: 67,
        nextReplenishmentDays: 3.9,
        safetyBufferDays: 1.5,
        projectedRisk: 'HIGH',
        reason: 'Current projected consumption exceeds available stock before expected replenishment.',
        onRemediate: () => handleAction(alert),
        onLateralTransfer: () => {
          approveRedistribution('REDIST-2026-01');
          showNotification('Lateral transfer of 600 ORS sachets approved from PHC Mandore.');
        }
      });
    } else {
      setSelectedAlertForExplanation({
        title: alert.title,
        medicineName: alert.facilityName || 'Monitored Clinical Resource',
        currentStock: 120,
        unit: 'units',
        avgDailyConsumption: 30,
        recentTrendPercent: 18,
        forecastDemand: 38,
        nextReplenishmentDays: 4.2,
        safetyBufferDays: 2.0,
        projectedRisk: alert.category === 'CRITICAL' ? 'HIGH' : 'WARNING',
        reason: alert.whyItMatters || alert.description,
        onRemediate: () => handleAction(alert)
      });
    }
    setIsWhyModalOpen(true);
  };

  const filteredAlerts = alerts.filter(a => {
    if (filterCategory === 'ALL') return true;
    if (filterCategory === 'CRITICAL') return a.category === 'CRITICAL';
    if (filterCategory === 'WARNING') return a.category === 'WARNING';
    if (filterCategory === 'INFO') return a.category === 'INFO';
    if (filterCategory === 'RESOLVED') return a.status === 'RESOLVED';
    return true;
  });

  const getAlertIcon = (iconType: string) => {
    switch (iconType) {
      case 'pill':
        return <Pill className="w-5 h-5 text-rose-600" />;
      case 'coldchain':
        return <Thermometer className="w-5 h-5 text-blue-600" />;
      case 'users':
        return <Users className="w-5 h-5 text-purple-600" />;
      case 'hospital':
        return <Building2 className="w-5 h-5 text-amber-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    }
  };

  const handleAction = (alert: any) => {
    if (alert.category === 'CRITICAL' || alert.id.includes('MED')) {
      setActiveModule('medicine');
    } else if (alert.id.includes('COLD') || alert.id.includes('STAFF')) {
      setActiveModule('workforce');
    } else {
      setActiveModule('orders');
    }
  };

  const criticalCount = alerts.filter(a => a.category === 'CRITICAL' && a.status !== 'RESOLVED').length;
  const warningCount = alerts.filter(a => a.category === 'WARNING' && a.status !== 'RESOLVED').length;
  const resolvedCount = alerts.filter(a => a.status === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
              Early Warning Engine
            </span>
            <span className="text-xs text-slate-500 font-mono">Real-Time Exception Detection</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-rose-600" />
            <span>Operational Alert & Incident Resolution Centre</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Surveillance triggers across stockouts, clinical capacity limits, staffing fatigue, and cold chain telemetry for {selectedPHC.name}.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-600 font-bold">Category:</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs cursor-pointer"
          >
            <option value="ALL">All Alerts ({alerts.length})</option>
            <option value="CRITICAL">Critical Priority ({criticalCount})</option>
            <option value="WARNING">Warning Level ({warningCount})</option>
            <option value="INFO">Informational</option>
            <option value="RESOLVED">Resolved Incidents ({resolvedCount})</option>
          </select>
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setFilterCategory('CRITICAL')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            filterCategory === 'CRITICAL'
              ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-300'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">
            Critical Alerts
          </span>
          <div className="text-2xl font-bold font-mono text-rose-700 mt-1">{criticalCount} Active</div>
        </button>

        <button
          type="button"
          onClick={() => setFilterCategory('WARNING')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            filterCategory === 'WARNING'
              ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
            Operational Warnings
          </span>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1">{warningCount} Pending</div>
        </button>

        <button
          type="button"
          onClick={() => setFilterCategory('RESOLVED')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            filterCategory === 'RESOLVED'
              ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-300'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
            Resolved Today
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">{resolvedCount} Closed</div>
        </button>

        <button
          type="button"
          onClick={() => setFilterCategory('ALL')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            filterCategory === 'ALL'
              ? 'border-slate-400 bg-slate-50 ring-2 ring-slate-300'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
            All Monitored Streams
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{alerts.length} Total</div>
        </button>
      </div>

      {/* Alert Cards List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs">
            <EmptyState
              icon={FilterX}
              title="No Incidents in this Category"
              description="All operational signals for this filter are currently within normal compliance thresholds."
              actionText="Reset Filter to All"
              onAction={() => setFilterCategory('ALL')}
            />
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 sm:p-5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                alert.status === 'RESOLVED'
                  ? 'bg-slate-50/90 border-slate-200 opacity-70'
                  : alert.category === 'CRITICAL'
                  ? 'bg-rose-50/80 border-rose-300 shadow-xs'
                  : alert.category === 'WARNING'
                  ? 'bg-amber-50/80 border-amber-300 shadow-xs'
                  : 'bg-sky-50/80 border-sky-300 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs shrink-0 mt-0.5">
                  {getAlertIcon(alert.iconType || 'pill')}
                </div>
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{alert.title}</span>
                    <StatusBadge
                      status={alert.category === 'INFO' ? 'PREPAREDNESS' : (alert.category as any)}
                    />
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">
                      {alert.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium max-w-3xl">
                    {alert.description}
                  </p>
                  <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 pt-0.5">
                    <span>Facility: <strong>{alert.facilityName}</strong></span>
                    <span>•</span>
                    <span>Status: <strong className="uppercase">{alert.status}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  type="button"
                  onClick={() => handleOpenWhyAlert(alert)}
                  className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                  title="Inspect algorithmic breakdown & risk calculation"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Why this alert?</span>
                </button>

                {alert.status === 'ACTIVE' && (
                  <button
                    type="button"
                    onClick={() => {
                      acknowledgeAlert(alert.id);
                      showNotification(`Incident ${alert.id} acknowledged.`);
                    }}
                    className="px-3.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                  >
                    Acknowledge
                  </button>
                )}

                {alert.status === 'ACKNOWLEDGED' && (
                  <button
                    type="button"
                    onClick={() => {
                      acknowledgeAlert(alert.id);
                      showNotification(`Incident ${alert.id} closed and marked resolved.`);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Resolve Incident</span>
                  </button>
                )}

                {alert.status !== 'RESOLVED' && (
                  <button
                    type="button"
                    onClick={() => handleAction(alert)}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  >
                    <span>Remediate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {alert.status === 'RESOLVED' && (
                  <span className="text-xs font-mono text-emerald-900 font-bold bg-emerald-100/90 px-3 py-1 rounded-lg border border-emerald-300">
                    Resolved & Audited
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Why This Alert Modal */}
      <WhyThisAlertModal
        isOpen={isWhyModalOpen}
        onClose={() => setIsWhyModalOpen(false)}
        data={selectedAlertForExplanation}
      />
    </div>
  );
};
