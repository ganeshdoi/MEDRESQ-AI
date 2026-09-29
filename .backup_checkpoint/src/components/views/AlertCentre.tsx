import React, { useState } from 'react';
import {
  BellRing,
  AlertTriangle,
  Pill,
  Thermometer,
  Users,
  CheckCircle2,
  ArrowRight,
  Building2,
  FilterX,
  HelpCircle,
  HardDrive,
  Sliders,
  Plus,
  Save
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusBadge } from '../ui/StatusBadge.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { WhyThisAlertModal, AlertMathBreakdown } from '../ui/WhyThisAlertModal.tsx';
import { OfflineQueueViewer } from './OfflineQueueViewer.tsx';

export const AlertCentre: React.FC = () => {
  const {
    alerts,
    medicines,
    acknowledgeAlert,
    approveRedistribution,
    setActiveModule,
    selectedPHC,
    showNotification,
    offlineQueue,
    proactiveStockAlerts,
    updateMedicineThreshold,
    createOrder
  } = useApp();

  const [activeTab, setActiveTab] = useState<'alerts' | 'thresholds' | 'offline_queue'>('alerts');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [selectedAlertForExplanation, setSelectedAlertForExplanation] =
    useState<AlertMathBreakdown | null>(null);
  const [isWhyModalOpen, setIsWhyModalOpen] = useState(false);

  // Local editable threshold drafts keyed by medicine ID
  const [thresholdDrafts, setThresholdDrafts] = useState<Record<string, number>>({});

  const pendingOfflineCount = offlineQueue.filter((i) => i.status !== 'SYNCED').length;

  const handleOpenWhyAlert = (alert: any) => {
    const matchedMed = alert.medicineId
      ? medicines.find((m) => m.id === alert.medicineId)
      : medicines.find((m) => alert.title.toLowerCase().includes(m.name.toLowerCase().slice(0, 8)));

    if (matchedMed) {
      setSelectedAlertForExplanation({
        title: alert.title,
        medicineName: matchedMed.name,
        currentStock: matchedMed.currentStock,
        unit: matchedMed.unit,
        avgDailyConsumption: matchedMed.dailyConsumption,
        recentTrendPercent: 22,
        forecastDemand: Math.round(matchedMed.dailyConsumption * 1.22),
        nextReplenishmentDays: 3.5,
        safetyBufferDays: matchedMed.projectedStockoutDays,
        projectedRisk: matchedMed.stockoutRisk === 'CRITICAL' ? 'HIGH' : 'WARNING',
        reason:
          alert.description ||
          `Current stock (${matchedMed.currentStock} ${matchedMed.unit}) fell below the defined facility threshold of ${matchedMed.minStockLevel} ${matchedMed.unit}.`,
        onRemediate: () => handleAction(alert),
        onLateralTransfer: () => {
          approveRedistribution('REDIST-2026-01');
          showNotification(`Lateral transfer initiated for ${matchedMed.name}.`);
        }
      });
    } else {
      setSelectedAlertForExplanation({
        title: alert.title,
        medicineName: alert.facilityName || 'Monitored Clinical Resource',
        currentStock: alert.currentStock || 120,
        unit: alert.unit || 'units',
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

  const filteredAlerts = alerts.filter((a) => {
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
    if (alert.category === 'CRITICAL' || alert.id.includes('MED') || alert.id.includes('THRESH')) {
      setActiveModule('medicine');
    } else if (alert.id.includes('COLD') || alert.id.includes('STAFF')) {
      setActiveModule('workforce');
    } else {
      setActiveModule('orders');
    }
  };

  const criticalCount = alerts.filter(
    (a) => a.category === 'CRITICAL' && a.status !== 'RESOLVED'
  ).length;
  const warningCount = alerts.filter(
    (a) => a.category === 'WARNING' && a.status !== 'RESOLVED'
  ).length;
  const resolvedCount = alerts.filter((a) => a.status === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <span className="font-bold text-rose-700 uppercase tracking-wider">
              Stock Threshold & Incident Monitor
            </span>
            <span aria-hidden="true">·</span>
            <span>{selectedPHC.name}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-rose-600" />
            <span>Critical Stock Alerts & Threshold Rules</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Set minimum buffer thresholds for essential medicines, act on low-stock alerts, and manage offline synchronization for {selectedPHC.name}.
          </p>
        </div>

        {activeTab === 'alerts' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600 font-bold">Filter:</span>
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
        )}
      </div>

      {/* Tab Navigation: Operational Alerts vs Threshold Configuration vs Offline Queue */}
      <div className="flex flex-wrap border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'alerts'
              ? 'border-rose-600 text-rose-700 bg-rose-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <BellRing className="w-4 h-4 text-rose-600" />
          <span>Active Threshold & Operational Alerts ({alerts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('thresholds')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'thresholds'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Sliders className="w-4 h-4 text-emerald-600" />
          <span>Configure Stock Threshold Rules ({medicines.length} Medicines)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('offline_queue')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'offline_queue'
              ? 'border-amber-600 text-amber-800 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <HardDrive className="w-4 h-4 text-amber-600" />
          <span>
            Offline Sync Queue ({pendingOfflineCount > 0 ? `${pendingOfflineCount} Pending` : 'Synced'})
          </span>
        </button>
      </div>

      {activeTab === 'offline_queue' ? (
        <OfflineQueueViewer />
      ) : activeTab === 'thresholds' ? (
        /* TAB 2: Configure Facility Medicine Threshold Rules */
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <span>Minimum Stock Safety Thresholds ({selectedPHC.name})</span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Set the minimum stock level for each medicine. Whenever dispensing brings stock at or below this threshold, an automatic in-app alert is triggered.
              </p>
            </div>
            <div className="text-xs font-mono text-slate-600 shrink-0">
              Below Threshold:{' '}
              <strong className="text-rose-700">
                {proactiveStockAlerts.length} of {medicines.length} Medicines
              </strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" role="table">
              <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Medicine & Category</th>
                  <th className="px-3 py-3 text-right">Current Stock</th>
                  <th className="px-3 py-3 text-right">Daily Burn</th>
                  <th className="px-3 py-3">Defined Min Threshold</th>
                  <th className="px-3 py-3">Stock vs. Threshold</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Replenishment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {medicines.map((med) => {
                  const draftVal =
                    thresholdDrafts[med.id] !== undefined
                      ? thresholdDrafts[med.id]
                      : med.minStockLevel;
                  const isBreached = med.currentStock <= med.minStockLevel;
                  const isCritical =
                    med.currentStock <= Math.round(med.minStockLevel * 0.55) ||
                    med.projectedStockoutDays <= 3.5;
                  const ratioPct = Math.min(
                    100,
                    Math.round((med.currentStock / Math.max(1, med.minStockLevel)) * 100)
                  );
                  const suggestedOrder = Math.max(200, med.minStockLevel * 2 - med.currentStock);

                  return (
                    <tr
                      key={med.id}
                      className={`transition-colors ${
                        isBreached ? 'bg-rose-50/30 hover:bg-rose-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-4 py-3 font-sans">
                        <div className="font-bold text-slate-900">{med.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {med.category} · Batch {med.batchNumber}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-right">
                        <span
                          className={`font-bold ${
                            isCritical
                              ? 'text-rose-700'
                              : isBreached
                              ? 'text-amber-700'
                              : 'text-slate-900'
                          }`}
                        >
                          {med.currentStock.toLocaleString()}
                        </span>{' '}
                        <span className="text-slate-500 font-normal">{med.unit}</span>
                      </td>

                      <td className="px-3 py-3 text-right text-slate-700">
                        {med.dailyConsumption}/day ({med.projectedStockoutDays}d)
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={10}
                            step={10}
                            aria-label={`Minimum stock threshold for ${med.name}`}
                            value={draftVal}
                            onChange={(e) =>
                              setThresholdDrafts((prev) => ({
                                ...prev,
                                [med.id]: Math.max(10, Number(e.target.value))
                              }))
                            }
                            className="w-24 px-2 py-1 rounded border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          />
                          <button
                            type="button"
                            onClick={() => updateMedicineThreshold(med.id, draftVal)}
                            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-sans font-bold flex items-center gap-1 cursor-pointer"
                            title="Save threshold"
                          >
                            <Save className="w-3 h-3 text-emerald-400" />
                            <span>Save</span>
                          </button>
                        </div>
                      </td>

                      <td className="px-3 py-3 w-40">
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${
                              isCritical
                                ? 'bg-rose-600'
                                : isBreached
                                ? 'bg-amber-500'
                                : 'bg-emerald-600'
                            }`}
                            style={{ width: `${ratioPct}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {isBreached
                            ? `${med.minStockLevel - med.currentStock} ${med.unit} below threshold`
                            : `+${med.currentStock - med.minStockLevel} ${med.unit} buffer`}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-center font-sans">
                        <span
                          className={`text-xs font-bold ${
                            isCritical
                              ? 'text-rose-700'
                              : isBreached
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {isCritical
                            ? 'CRITICAL LOW'
                            : isBreached
                            ? 'BELOW MIN'
                            : 'HEALTHY'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-sans">
                        {isBreached ? (
                          <button
                            type="button"
                            onClick={() =>
                              createOrder({
                                medicineName: med.name,
                                quantityRequested: suggestedOrder,
                                priority: isCritical ? 'EMERGENCY_REPLENISHMENT' : 'URGENT',
                                justification: `Threshold restock indent for ${med.name}.`
                              })
                            }
                            className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Order +{suggestedOrder}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">Sufficient</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          {/* Summary KPI Filter Cards */}
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
              <div className="text-2xl font-bold font-mono text-rose-700 mt-1">
                {criticalCount} Active
              </div>
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
              <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
                {warningCount} Pending
              </div>
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
              <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                {resolvedCount} Closed
              </div>
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
                All Monitored Alerts
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {alerts.length} Total
              </div>
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
              filteredAlerts.map((alert) => {
                const isThresholdAlert =
                  alert.id.startsWith('ALT-THRESH-') &&
                  alert.currentStock !== undefined &&
                  alert.thresholdLevel !== undefined;

                return (
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
                            status={
                              alert.category === 'INFO' ? 'PREPAREDNESS' : (alert.category as any)
                            }
                          />
                          <span className="text-[10px] font-mono text-slate-500 font-semibold">
                            {alert.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium max-w-3xl">
                          {alert.description}
                        </p>
                        <div className="text-[11px] text-slate-500 font-mono flex flex-wrap items-center gap-2 pt-0.5">
                          <span>
                            Facility: <strong>{alert.facilityName || alert.phcName}</strong>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            Status: <strong className="uppercase">{alert.status}</strong>
                          </span>
                          {isThresholdAlert && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-rose-800 font-bold">
                                Defined Threshold: {alert.thresholdLevel?.toLocaleString()}{' '}
                                {alert.unit}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
                      <button
                        type="button"
                        onClick={() => handleOpenWhyAlert(alert)}
                        className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                        title="Inspect stockout math & consumption rate"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Details</span>
                      </button>

                      {isThresholdAlert && alert.status !== 'RESOLVED' && (
                        <button
                          type="button"
                          onClick={() => {
                            const matched = medicines.find((m) => m.id === alert.medicineId);
                            const orderQty = matched
                              ? Math.max(200, matched.minStockLevel * 2 - matched.currentStock)
                              : 500;
                            createOrder({
                              medicineName: matched?.name || alert.title,
                              quantityRequested: orderQty,
                              priority:
                                alert.category === 'CRITICAL'
                                  ? 'EMERGENCY_REPLENISHMENT'
                                  : 'URGENT',
                              justification: `Threshold alert replenishment from Alert Centre.`
                            });
                            acknowledgeAlert(alert.id);
                          }}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Order Replenishment</span>
                        </button>
                      )}

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
                          <span>Open Stock</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {alert.status === 'RESOLVED' && (
                        <span className="text-xs font-mono text-emerald-800 font-bold">
                          ✓ Resolved
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Why This Alert Modal */}
      <WhyThisAlertModal
        isOpen={isWhyModalOpen}
        onClose={() => setIsWhyModalOpen(false)}
        data={selectedAlertForExplanation}
      />
    </div>
  );
};
