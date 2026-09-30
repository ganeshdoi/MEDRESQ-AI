import React, { useState, useMemo, useEffect } from 'react';
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
  Save,
  Zap,
  Search
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusBadge } from '../ui/StatusBadge.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { WhyThisAlertModal, AlertMathBreakdown } from '../ui/WhyThisAlertModal.tsx';
import { OfflineQueueViewer } from './OfflineQueueViewer.tsx';
import { evaluateMedicineThresholdAndReplenishment } from '../../utils/inventoryForecast.ts';
import { matchesSearchKeywords } from '../../utils/globalSearch.ts';
import {
  getCanonicalAlertMetrics,
  getCanonicalMedicineInventoryMetrics
} from '../../utils/datasetMetrics.ts';

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
    simulateThresholdBreach,
    createOrder,
    openBulkRestockPreview
  } = useApp();

  const [activeTab, setActiveTab] = useState<'alerts' | 'thresholds' | 'offline_queue'>('alerts');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [alertSearch, setAlertSearch] = useState<string>('');
  const [selectedAlertForExplanation, setSelectedAlertForExplanation] =
    useState<AlertMathBreakdown | null>(null);
  const [isWhyModalOpen, setIsWhyModalOpen] = useState(false);

  // Local editable threshold drafts keyed by medicine ID
  const [thresholdDrafts, setThresholdDrafts] = useState<Record<string, number>>({});
  const [thresholdSearch, setThresholdSearch] = useState<string>('');
  const [onlyBreachedFilter, setOnlyBreachedFilter] = useState<boolean>(false);
  const [isBatchReplenishing, setIsBatchReplenishing] = useState<boolean>(false);

  // Listen for global search navigation events targeting AlertCentre
  useEffect(() => {
    const handleGlobalSearch = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.query) {
        setAlertSearch(detail.query);
        setThresholdSearch(detail.query);
      }
    };
    window.addEventListener('medresq:global-search', handleGlobalSearch);
    return () => window.removeEventListener('medresq:global-search', handleGlobalSearch);
  }, []);

  const pendingOfflineCount = offlineQueue.filter((i) => i.status !== 'SYNCED').length;

  const canonicalMedMetrics = useMemo(
    () => getCanonicalMedicineInventoryMetrics(medicines),
    [medicines]
  );
  const canonicalAlertMetrics = useMemo(
    () => getCanonicalAlertMetrics(alerts, proactiveStockAlerts),
    [alerts, proactiveStockAlerts]
  );

  const medicineEvaluations = useMemo(() => {
    const map = new Map<string, ReturnType<typeof evaluateMedicineThresholdAndReplenishment>>();
    for (const m of medicines) {
      map.set(m.id, canonicalMedMetrics.evaluationsByMedId[m.id] || evaluateMedicineThresholdAndReplenishment(m));
    }
    return map;
  }, [medicines, canonicalMedMetrics.evaluationsByMedId]);

  const unOrderedBreachedMeds = useMemo(() => {
    return medicines.filter((m) => {
      const ev = medicineEvaluations.get(m.id);
      return ev && ev.isThresholdBreached && ev.suggestedOrderQty > 0;
    });
  }, [medicines, medicineEvaluations]);

  const handleReplenishAllBreached = () => {
    openBulkRestockPreview();
  };

  const filteredThresholdMedicines = useMemo(() => {
    return medicines
      .filter((m) => {
        const matchesQuery = matchesSearchKeywords(
          thresholdSearch,
          m.name,
          m.category,
          m.batchNumber,
          m.sourceWarehouse,
          m.stockoutRisk
        );
        const ev = medicineEvaluations.get(m.id);
        const isBreached = ev ? ev.isThresholdBreached : m.currentStock <= m.minStockLevel;
        return matchesQuery && (!onlyBreachedFilter || isBreached);
      })
      .sort((a, b) => {
        const evA = medicineEvaluations.get(a.id);
        const evB = medicineEvaluations.get(b.id);
        const aBreached = evA ? evA.isThresholdBreached : a.currentStock <= a.minStockLevel;
        const bBreached = evB ? evB.isThresholdBreached : b.currentStock <= b.minStockLevel;
        if (aBreached !== bBreached) return aBreached ? -1 : 1;
        if (evA && evB && evA.riskLevel !== evB.riskLevel) {
          if (evA.riskLevel === 'CRITICAL') return -1;
          if (evB.riskLevel === 'CRITICAL') return 1;
        }
        return (
          a.currentStock / Math.max(1, a.minStockLevel) -
          b.currentStock / Math.max(1, b.minStockLevel)
        );
      });
  }, [medicines, thresholdSearch, onlyBreachedFilter, medicineEvaluations]);

  const handleOpenWhyAlert = (alert: any) => {
    const matchedMed = alert.medicineId
      ? medicines.find((m) => m.id === alert.medicineId)
      : medicines.find((m) => alert.title.toLowerCase().includes(m.name.toLowerCase().slice(0, 8)));

    if (matchedMed) {
      const ev =
        medicineEvaluations.get(matchedMed.id) ||
        evaluateMedicineThresholdAndReplenishment(matchedMed);
      setSelectedAlertForExplanation({
        title: alert.title,
        medicineName: matchedMed.name,
        currentStock: ev.usableStock,
        unit: matchedMed.unit,
        avgDailyConsumption: ev.dailyConsumption,
        recentTrendPercent: 0,
        forecastDemand: ev.dailyConsumption,
        nextReplenishmentDays: ev.leadTimeDays,
        safetyBufferDays: ev.safetyBufferDays,
        projectedRisk: ev.riskLevel === 'CRITICAL' ? 'CRITICAL' : ev.riskLevel === 'WARNING' ? 'WARNING' : 'LOW',
        reason: ev.breachExplanation,
        onRemediate: () => handleAction(alert),
        onLateralTransfer: () => {
          approveRedistribution('REDIST-2026-01');
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

  const validAlerts = useMemo(
    () => alerts.filter((a) => Boolean(a && a.id)),
    [alerts]
  );

  const filteredAlerts = validAlerts.filter((a) => {
    if (alertSearch.trim()) {
      const matches = matchesSearchKeywords(
        alertSearch,
        a.id,
        a.title,
        a.description,
        a.whyItMatters,
        a.facilityName,
        a.category,
        a.status
      );
      if (!matches) return false;
    }
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

  const getAlertDirectAction = (alert: any): { module: string; label: string } => {
    if (!alert || !alert.id) return { module: 'medicine', label: 'Open Inventory' };
    const text = `${alert.id} ${alert.title || ''} ${alert.description || ''}`.toUpperCase();
    if (text.includes('SURGE') || text.includes('FORECAST') || text.includes('STAFF') || text.includes('HEAT') || text.includes('DENGUE') || text.includes('MALARIA')) {
      return { module: 'preparedness', label: 'Open Forecast' };
    }
    if (text.includes('TRANSFER') || text.includes('ORDER') || text.includes('INDENT') || text.includes('REDISTRIBUTION') || text.includes('REVIEW')) {
      return { module: 'orders', label: 'Open Orders / Review' };
    }
    if (
      alert.category === 'CRITICAL' ||
      alert.medicineId ||
      text.includes('MED') ||
      text.includes('THRESH') ||
      text.includes('STOCK') ||
      text.includes('EXPIR') ||
      text.includes('COLD')
    ) {
      return { module: 'medicine', label: 'Open Inventory' };
    }
    return { module: 'orders', label: 'Open Orders / Review' };
  };

  const handleAction = (alert: any) => {
    const target = getAlertDirectAction(alert);
    setActiveModule(target.module);
  };

  const criticalCount = canonicalAlertMetrics.criticalSystemAlertsCount;
  const warningCount = canonicalAlertMetrics.warningSystemAlertsCount;
  const resolvedCount = canonicalAlertMetrics.resolvedSystemAlertsCount;
  const activeSystemAlertsCount = canonicalAlertMetrics.activeSystemAlertsCount;

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

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => simulateThresholdBreach()}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Simulate a medicine dropping below its configured threshold to test real-time alerting"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Simulate Breach</span>
          </button>

          {unOrderedBreachedMeds.length > 0 && (
            <button
              type="button"
              disabled={isBatchReplenishing}
              onClick={handleReplenishAllBreached}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Dispatch replenishment orders for all threshold-breached medicines without active pipeline cover"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {isBatchReplenishing
                  ? 'Ordering...'
                  : `Replenish All Breached (${unOrderedBreachedMeds.length})`}
              </span>
            </button>
          )}

          {activeTab === 'alerts' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={alertSearch}
                  onChange={(e) => setAlertSearch(e.target.value)}
                  placeholder="Search alerts by drug, PHC, or severity..."
                  className="bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs w-52 sm:w-64"
                />
              </div>
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
          <span>System Operational Alerts ({activeSystemAlertsCount} Active · {validAlerts.length} Total)</span>
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
          <span>Stock Threshold Rules ({canonicalMedMetrics.totalTrackedItems} Items · {canonicalMedMetrics.lowStockCount} Breached)</span>
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
                <span>3-Tier Safety Stock Threshold &amp; Replenishment Rules ({selectedPHC.name})</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                  Configurable Demo Policy
                </span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 max-w-3xl">
                Configure facility minimum demo thresholds (<code className="font-mono text-slate-800">Min</code>). Alerts and order replenishment use one shared calculation: <strong>Rule 1 (CRITICAL)</strong> Usable Stock ≤ 50% Min, Stock Cover &lt; 3.5d Delivery Lead Time, or Delivery Lead Time &gt; 3.5d Max Allowed; <strong>Rule 2 (WARNING)</strong> Usable Stock ≤ 100% Min or ≤ Dynamic ROP (3.5d Lead + 3.0d Safety); <strong>Rule 3 (REPLENISHMENT)</strong> 14-day cycle target minus usable stock and active pipeline indents.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={thresholdSearch}
                  onChange={(e) => setThresholdSearch(e.target.value)}
                  placeholder="Search medicine..."
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-44"
                />
              </div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyBreachedFilter}
                  onChange={(e) => setOnlyBreachedFilter(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span>Only Breached ({canonicalMedMetrics.lowStockCount}: {canonicalMedMetrics.criticalCount} Crit + {canonicalMedMetrics.warningCount} Warn)</span>
              </label>
            </div>
          </div>

          {/* 3-Tier Rule Policy Reference Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-100/70 border-b border-slate-200 text-xs">
            <div className="bg-white p-3 rounded-lg border border-rose-200">
              <div className="font-mono text-[10px] font-bold uppercase text-rose-700">
                Rule 1 · CRITICAL Alert Trigger (Demo Policy)
              </div>
              <div className="font-bold text-slate-900 mt-0.5">
                Usable Stock ≤ 50% Min OR Stock Cover &lt; 3.5d Lead Time
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Excludes expired batches. Fires <strong>EMERGENCY_REPLENISHMENT</strong> when usable stock cover is below the 3.5d delivery lead time or when transit lead time exceeds the 3.5d maximum allowed demo threshold.
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-amber-200">
              <div className="font-mono text-[10px] font-bold uppercase text-amber-800">
                Rule 2 · WARNING / Dynamic ROP Trigger
              </div>
              <div className="font-bold text-slate-900 mt-0.5">
                Usable Stock ≤ Min Threshold OR ≤ Dynamic ROP
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                <code className="font-mono">ROP = max(Min, ceil(3.5d × Burn) + ceil(3.0d × Burn))</code>. Triggers <strong>URGENT</strong> replenishment indent.
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-emerald-200">
              <div className="font-mono text-[10px] font-bold uppercase text-emerald-800">
                Rule 3 · Order Replenishment Formula
              </div>
              <div className="font-bold text-slate-900 mt-0.5">
                Target 14d Cycle − (Usable Stock + Pipeline)
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Deducts active <code className="font-mono">pendingOrders</code> to prevent duplicate ordering and rounds to pack size (5 / 25 / 50 units).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" role="table">
              <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Medicine &amp; Category</th>
                  <th className="px-3 py-3 text-right">Usable Stock &amp; Pipeline</th>
                  <th className="px-3 py-3 text-right">Daily Burn</th>
                  <th className="px-3 py-3">Defined Min Threshold</th>
                  <th className="px-3 py-3">Threshold &amp; ROP Breakdown</th>
                  <th className="px-3 py-3 text-center">Rule Status</th>
                  <th className="px-4 py-3 text-right">Order Replenishment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredThresholdMedicines.map((med) => {
                  const ev =
                    medicineEvaluations.get(med.id) || evaluateMedicineThresholdAndReplenishment(med);
                  const draftVal =
                    thresholdDrafts[med.id] !== undefined
                      ? thresholdDrafts[med.id]
                      : med.minStockLevel;
                  const isBreached = ev.isThresholdBreached;
                  const isCritical = ev.riskLevel === 'CRITICAL';
                  const ratioPct = Math.min(
                    100,
                    Math.round((ev.usableStock / Math.max(1, ev.minThreshold)) * 100)
                  );
                  const suggestedOrder = ev.recommendedOrderQty;

                  return (
                    <tr
                      key={med.id}
                      className={`transition-colors ${
                        isBreached ? 'bg-rose-50/30 hover:bg-rose-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-4 py-3 font-sans">
                        <div className="font-bold text-slate-900">{med.name}</div>
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5">
                          <span>{med.category} · Batch {med.batchNumber}</span>
                          {ev.expiredBatchStock > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-mono text-[10px] font-bold">
                              {ev.expiredBatchStock} expired excluded
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-right">
                        <div>
                          <span
                            className={`font-bold ${
                              isCritical
                                ? 'text-rose-700'
                                : isBreached
                                ? 'text-amber-700'
                                : 'text-slate-900'
                            }`}
                          >
                            {ev.usableStock.toLocaleString()}
                          </span>{' '}
                          <span className="text-slate-500 font-normal">{med.unit}</span>
                        </div>
                        {ev.pendingOrders > 0 && (
                          <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                            +{ev.pendingOrders.toLocaleString()} in pipeline
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3 text-right text-slate-700">
                        <div>{ev.dailyConsumption}/day</div>
                        <div
                          className={`text-[10px] font-bold ${
                            ev.usableDaysOfCover !== null && ev.usableDaysOfCover < ev.leadTimeDays
                              ? 'text-rose-700'
                              : ev.usableDaysOfCover !== null && ev.usableDaysOfCover < ev.leadTimeDays + ev.safetyBufferDays
                              ? 'text-amber-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {ev.usableDaysOfCover !== null ? `${ev.usableDaysOfCover}d cover` : 'N/A (0/day)'}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            step={ev.packRoundingStep}
                            aria-label={`Minimum stock threshold for ${med.name}`}
                            value={draftVal}
                            onChange={(e) =>
                              setThresholdDrafts((prev) => ({
                                ...prev,
                                [med.id]: Math.max(1, Number(e.target.value) || 1)
                              }))
                            }
                            className="w-24 px-2 py-1 rounded border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          />
                          <button
                            type="button"
                            onClick={() => updateMedicineThreshold(med.id, draftVal)}
                            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-sans font-bold flex items-center gap-1 cursor-pointer"
                            title="Save threshold rule"
                          >
                            <Save className="w-3 h-3 text-emerald-400" />
                            <span>Save</span>
                          </button>
                        </div>
                      </td>

                      <td className="px-3 py-3 w-48">
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
                        <div className="text-[10px] text-slate-600 mt-1">
                          Crit 50%: <strong>{ev.criticalStockFloor}</strong> · ROP: <strong>{ev.reorderPoint}</strong> · Target: <strong>{ev.targetCycleStock}</strong>
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
                            ? 'BELOW ROP / MIN'
                            : 'HEALTHY'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-sans">
                        {isBreached ? (
                          ev.isCoveredByPendingOrder ? (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[10px] font-bold">
                                In Pipeline (+{ev.pendingOrders})
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  createOrder({
                                    medicineName: med.name,
                                    quantityRequested: ev.supplementalOrderQty,
                                    priority: ev.recommendedPriority,
                                    justification: `Supplemental threshold restock indent for ${med.name} (${ev.breachRuleTitle}).`
                                  })
                                }
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3 text-emerald-400" />
                                <span>+{ev.supplementalOrderQty}</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                createOrder({
                                  medicineName: med.name,
                                  quantityRequested: suggestedOrder,
                                  priority: ev.recommendedPriority,
                                  justification: `[${ev.breachRuleTitle}] Replenishment indent for ${med.name}: usable stock (${ev.usableStock} ${med.unit}) vs Min (${ev.minThreshold}) & ROP (${ev.reorderPoint}). Target ${ev.replenishmentCycleDays}d cycle = ${ev.targetCycleStock} ${med.unit}.`
                                })
                              }
                              className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Order +{suggestedOrder.toLocaleString()}</span>
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => simulateThresholdBreach(med.id)}
                            className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-800 text-slate-600 text-[10px] font-semibold cursor-pointer transition-colors"
                          >
                            Test Breach
                          </button>
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
                const matchedMed = medicines.find(
                  (m) =>
                    m.id === alert.medicineId ||
                    alert.title?.toLowerCase().includes(m.name.toLowerCase()) ||
                    alert.description?.toLowerCase().includes(m.name.toLowerCase())
                );
                const directAction = getAlertDirectAction(alert);
                const statusLabel =
                  alert.status === 'RESOLVED'
                    ? 'Resolved'
                    : alert.status === 'ACKNOWLEDGED'
                    ? 'Acknowledged'
                    : 'Active';

                return (
                  <div
                    key={alert.id}
                    className={`p-4 sm:p-5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      alert.status === 'RESOLVED'
                        ? 'bg-slate-50/90 border-slate-200 opacity-75'
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
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                              alert.status === 'RESOLVED'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : alert.status === 'ACKNOWLEDGED'
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : 'bg-rose-100 text-rose-900 border-rose-300'
                            }`}
                          >
                            Status: {statusLabel}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 font-semibold">
                            {alert.timestamp}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-medium max-w-3xl">
                          <strong className="text-slate-900">Reason:</strong> {alert.description}
                        </p>

                        <div className="text-[11px] text-slate-600 font-mono flex flex-wrap items-center gap-2 pt-0.5">
                          <span>
                            Affected PHC: <strong className="text-slate-900">{alert.facilityName || alert.phcName || selectedPHC.name}</strong>
                          </span>
                          {matchedMed && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>
                                Affected Medicine: <strong className="text-slate-900">{matchedMed.name}</strong> ({matchedMed.id})
                              </span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>
                            Severity: <strong className="uppercase text-slate-900">{alert.category}</strong>
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

                      {isThresholdAlert && alert.status !== 'RESOLVED' && (() => {
                        const matched = medicines.find((m) => m.id === alert.medicineId) || matchedMed;
                        const ev = matched ? medicineEvaluations.get(matched.id) : undefined;
                        const orderQty = ev
                          ? ev.recommendedOrderQty
                          : matched
                          ? Math.max(25, matched.minStockLevel * 2 - matched.currentStock)
                          : 200;
                        const isCovered = ev?.isCoveredByPendingOrder || false;

                        return (
                          <button
                            type="button"
                            onClick={() => {
                              createOrder({
                                medicineName: matched?.name || alert.title,
                                quantityRequested: orderQty,
                                priority:
                                  alert.category === 'CRITICAL'
                                    ? 'EMERGENCY_REPLENISHMENT'
                                    : 'URGENT',
                                justification: `Threshold alert replenishment from Alert Centre (${ev?.breachRuleTitle || 'Safety threshold breach'}).`
                              });
                              acknowledgeAlert(alert.id);
                            }}
                            className={`px-3 py-1.5 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                              isCovered
                                ? 'bg-slate-700 hover:bg-slate-800'
                                : 'bg-emerald-700 hover:bg-emerald-800'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>
                              {isCovered
                                ? `Supplemental +${orderQty.toLocaleString()} ${alert.unit || ''}`
                                : `Order +${orderQty.toLocaleString()} ${alert.unit || ''}`}
                            </span>
                          </button>
                        );
                      })()}

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
                          <span>{directAction.label}</span>
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
