import React, { useState } from 'react';
import {
  AlertTriangle,
  Pill,
  BedDouble,
  Users,
  CloudSun,
  Truck,
  ArrowRight,
  ScanLine,
  Mic,
  ArrowRightLeft,
  MapPin,
  CheckCircle2,
  Plus,
  Minus,
  Download,
  PackageCheck,
  Stethoscope,
  ThermometerSnowflake,
  Ambulance,
  ClipboardCheck,
  Activity,
  Zap,
  KeyRound,
  ShieldCheck,
  UserPlus,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  BellRing
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusBadge } from '../ui/StatusBadge.tsx';
import { evaluateMedicineThresholdAndReplenishment } from '../../utils/inventoryForecast.ts';
import { getPHCInchargeCredential } from '../../utils/phcAuthDirectory.ts';
import {
  getDatasetFacilityMetrics,
  getCanonicalMedicineInventoryMetrics,
  getCanonicalOrderMetrics,
  getCanonicalAlertMetrics
} from '../../utils/datasetMetrics.ts';

export const HomeOverview: React.FC = () => {
  const {
    selectedPHC,
    medicines,
    weather,
    orders,
    alerts,
    setActiveModule,
    redistributions,
    consumeMedicine,
    createOrder,
    openBulkRestockPreview,
    approveRedistribution,
    rejectRedistribution,
    showNotification,
    inchargeSession,
    openAuthModal,
    proactiveStockAlerts,
    acknowledgeAlert,
    offlineQueue,
    isOfflineMode,
    toggleOfflineMode,
    isQueueSyncing,
    syncOfflineQueue,
    addMockOfflineRecord,
    staff,
    t
  } = useApp();

  const presentStaffTodayCount = staff.filter((s) => s.status === 'PRESENT').length;

  const currentCredential = getPHCInchargeCredential(selectedPHC);

  // Interactive Quick Dispense state for single medicine
  const [quickMedId, setQuickMedId] = useState<string>(medicines[0]?.id || '');
  const [quickQty, setQuickQty] = useState<number>(10);
  const [quickReason, setQuickReason] = useState<string>('OPD Pharmacy Dispense');
  const [isQuickDispensing, setIsQuickDispensing] = useState<boolean>(false);
  const [isOrderingAll, setIsOrderingAll] = useState<boolean>(false);
  const [ilrTempVerified, setIlrTempVerified] = useState<boolean>(false);

  const selectedQuickMed = medicines.find((m) => m.id === quickMedId) || medicines[0];

  const datasetFacilityMetrics = getDatasetFacilityMetrics();
  const canonicalMedMetrics = getCanonicalMedicineInventoryMetrics(medicines);
  const canonicalOrderMetrics = getCanonicalOrderMetrics(orders, redistributions);
  const canonicalAlertMetrics = getCanonicalAlertMetrics(alerts, proactiveStockAlerts);

  const criticalAlerts = alerts.filter((a) => a.status !== 'RESOLVED' && a.category === 'CRITICAL');
  const activeAlertsList = canonicalAlertMetrics.activeAlerts;
  const criticalStockMeds = canonicalMedMetrics.criticalItems;
  const warningStockMeds = canonicalMedMetrics.warningItems;
  const attentionMeds = canonicalMedMetrics.lowStockItems;
  const expiringSoonMeds = canonicalMedMetrics.expiringSoonItems;
  const pendingReviewRedistributions = redistributions.filter(
    (r) => r.status === 'PENDING_REVIEW' || r.status === 'PROPOSED'
  );
  const queuedOrFailedOfflineItems = offlineQueue.filter((item) => item.status !== 'SYNCED');
  const failedOfflineItems = offlineQueue.filter((item) => item.status === 'FAILED_RETRY');
  const incomingDeliveries = orders.filter(
    (o) => o.status !== 'RECEIVED' && o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
  );

  const openMedicineInInventory = (medicineId: string) => {
    setActiveModule('medicine');
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('medresq:global-search', { detail: { medicineId } })
      );
    }, 50);
  };

  // 1-Click Quick Dispense Handler (Single Medicine)
  const handleQuickDispenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuickMed || quickQty <= 0) return;
    if (quickQty > selectedQuickMed.currentStock) {
      showNotification(
        `Cannot dispense ${quickQty}: only ${selectedQuickMed.currentStock} ${selectedQuickMed.unit} in stock.`
      );
      return;
    }
    setIsQuickDispensing(true);
    await consumeMedicine(selectedQuickMed.id, quickQty, quickReason);
    setIsQuickDispensing(false);
  };

  // 1-Click Instant Row Dispense (-10 units)
  const handleInstantDispense = async (
    medId: string,
    medName: string,
    unit: string,
    currentStock: number
  ) => {
    const qty = Math.min(10, currentStock);
    if (qty <= 0) {
      showNotification(`${medName} is out of stock. Please place an urgent order.`);
      return;
    }
    await consumeMedicine(medId, qty, 'Quick 1-Click OPD Dispense');
  };

  // 1-Click Instant Reorder for a Single Medicine
  const handleInstantOrder = async (
    medName: string,
    suggestedQty: number,
    isCritical: boolean
  ) => {
    await createOrder({
      medicineName: medName,
      quantityRequested: suggestedQty,
      priority: isCritical ? 'EMERGENCY_REPLENISHMENT' : 'URGENT',
      justification: `1-Click restock order from Daily Command Center to restore 30-day safety buffer.`
    });
  };

  // Preview & Confirm Restock for All Low-Stock Medicines (Priority 3 Order Safety)
  const handleRestockAllLowMedicines = () => {
    if (attentionMeds.length === 0) {
      showNotification('All medicines currently meet their configurable demo stock thresholds.');
      return;
    }
    setIsOrderingAll(false);
    openBulkRestockPreview(
      attentionMeds.map((med) => {
        const evalRes = evaluateMedicineThresholdAndReplenishment(med);
        return {
          medicineName: med.name,
          quantityRequested: evalRes.recommendedOrderQty,
          unit: med.unit,
          priority: evalRes.recommendedPriority,
          justification: `[SIMULATED DEMO BULK RESTOCK] ${evalRes.breachRuleTitle} (${evalRes.usableDaysOfCover} days cover remaining).`
        };
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Modern, Friendly PHC Incharge Welcome & Quick-Start Hub */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="bg-linear-to-r from-teal-900 via-emerald-900 to-slate-900 text-white p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {!inchargeSession ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 font-bold font-mono text-[11px]">
                    DEMO / READ-ONLY MODE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-400/30 text-emerald-200 font-bold text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                    <span>
                      Officer: {inchargeSession.officerName || inchargeSession.inchargeName || currentCredential.inchargeName}
                    </span>
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full bg-teal-400/20 border border-teal-400/30 text-teal-100 font-mono text-[11px] font-bold">
                  Assigned Officer ID: {inchargeSession?.officerId || currentCredential.officerId} · {inchargeSession?.designation || 'MOIC'}
                </span>
                <span className="text-emerald-200/80 font-mono text-[11px]">
                  {selectedPHC.code} · {selectedPHC.block}, {selectedPHC.district}, {selectedPHC.state}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {selectedPHC.name} — Operational Supply &amp; Forecast Command Hub
              </h1>

              <p className="text-xs text-emerald-100/85 max-w-2xl leading-relaxed">
                {inchargeSession ? (
                  <>
                    Authenticated session bound to <strong>{selectedPHC.name}</strong>. Monitor medicine buffers, dispense FEFO stock, inspect district-specific seasonal demand surges, and review replenishment orders.
                  </>
                ) : (
                  <>
                    Viewing <strong>{selectedPHC.name}</strong> in public <strong>DEMO / READ-ONLY MODE</strong>. Explore supply overview, medicine inventory, demand forecasts, orders, and network stock maps freely; supply-chain modifications require authorized access.
                  </>
                )}
              </p>
            </div>

            {/* Bound PHC Session Status / Admin Authorized Access */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openAuthModal('signin', selectedPHC)}
                className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title={inchargeSession ? 'Inspect Authenticated Officer Session' : 'Admin / Authorized Access'}
              >
                <KeyRound className="w-3.5 h-3.5 text-emerald-300" />
                <span>
                  {inchargeSession
                    ? `Session Bound: ${selectedPHC.code} (${inchargeSession.officerId})`
                    : 'Admin / Authorized Access'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Friendly 4-Step Quick-Action Cards + Cold-Chain Verification */}
        <div className="p-4 sm:p-5 bg-white space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <button
              type="button"
              onClick={() => setActiveModule('medicine')}
              className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <Pill className="w-4 h-4 text-emerald-700" />
                <span className="text-[10px] font-mono font-bold text-emerald-800">Step 1</span>
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1.5 group-hover:text-emerald-900">
                Inventory &amp; FEFO
              </div>
              <div className="text-[10px] text-slate-500 truncate">Check batches &amp; stock</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('preparedness')}
              className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/70 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <CloudSun className="w-4 h-4 text-indigo-700" />
                <span className="text-[10px] font-mono font-bold text-indigo-800">Step 2</span>
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1.5 group-hover:text-indigo-900">
                Demand Surge Forecast
              </div>
              <div className="text-[10px] text-slate-500 truncate">District &amp; season AI</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('orders')}
              className="p-3 rounded-xl border border-sky-200 bg-sky-50/60 hover:bg-sky-100/70 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <Truck className="w-4 h-4 text-sky-700" />
                <span className="text-[10px] font-mono font-bold text-sky-800">Step 3</span>
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1.5 group-hover:text-sky-900">
                Orders &amp; Transfers
              </div>
              <div className="text-[10px] text-slate-500 truncate">Restock &amp; peer sharing</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('map')}
              className="p-3 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100/70 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <MapPin className="w-4 h-4 text-teal-700" />
                <span className="text-[10px] font-mono font-bold text-teal-800">Step 4</span>
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1.5 group-hover:text-teal-900">
                Network Stock Map
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {datasetFacilityMetrics.networkMapTotalCount} nodes ({datasetFacilityMetrics.samplePhcTotalCount} PHCs + {datasetFacilityMetrics.networkMapUnmappedCount} CHCs/Depots)
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('analytics')}
              className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all cursor-pointer group col-span-2 sm:col-span-1"
            >
              <div className="flex items-center justify-between">
                <Download className="w-4 h-4 text-slate-700" />
                <span className="text-[10px] font-mono font-bold text-slate-600">Export</span>
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1.5">
                PDF / CSV Reports
              </div>
              <div className="text-[10px] text-slate-500 truncate">Download audit logs</div>
            </button>
          </div>

          {/* Cold-Chain ILR & Friendly Daily Priority Actions Strip */}
          <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <ThermometerSnowflake className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="text-slate-700 font-medium">
                  Cold Chain ILR:{' '}
                  <strong className="font-mono text-emerald-700">+4.2°C</strong> (Oxytocin &amp; ASV)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIlrTempVerified(true);
                    showNotification(
                      `Cold Chain ILR Log Verified (+4.2°C) for ${selectedPHC.name}`
                    );
                  }}
                  className={`ml-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    ilrTempVerified
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-teal-700 text-white hover:bg-teal-800'
                  }`}
                >
                  {ilrTempVerified ? '✓ Verified Today' : '1-Click Verify ILR'}
                </button>
              </div>

              {attentionMeds.length > 0 && (
                <button
                  type="button"
                  onClick={handleRestockAllLowMedicines}
                  disabled={isOrderingAll}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    {isOrderingAll
                      ? 'Opening Preview...'
                      : `Restock All Low Medicines (${attentionMeds.length}) — Preview & Confirm`}
                  </span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-slate-500">
              {/* Compact Staff Today Summary linking to Staff Attendance module */}
              <div className="flex items-center gap-2 bg-teal-50/70 px-3 py-1.5 rounded-xl border border-teal-200 text-slate-800">
                <Users className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span className="font-medium">
                  {t.attendance.staffToday}:{' '}
                  <strong className="font-mono text-teal-900">
                    {presentStaffTodayCount} / {staff.length} {t.attendance.present}
                  </strong>
                </span>
                <button
                  type="button"
                  id="overview-view-attendance-btn"
                  onClick={() => setActiveModule('attendance')}
                  className="ml-1 px-2.5 py-0.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-bold transition-colors cursor-pointer"
                >
                  {t.attendance.viewAttendance}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setActiveModule('records')}
                className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ScanLine className="w-3.5 h-3.5 text-emerald-600" />
                <span>Scan Stock Register (OCR)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModule('directory')}
                className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>NLEM Drug Catalogue ({datasetFacilityMetrics.nlemCatalogueCount} NLEM · {medicines.length} Facility Items)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Critical Alert Banner (Only when urgent alerts exist) */}
      {criticalAlerts.length > 0 && (
        <div
          role="region"
          aria-label="Urgent Facility Alerts"
          className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="w-5 h-5 text-rose-600 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <div className="font-bold text-sm text-rose-950">
                Urgent Today: {criticalAlerts[0].title}
              </div>
              <p className="text-xs text-rose-900 mt-0.5">
                {criticalAlerts[0].description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveModule('alerts')}
            className="text-xs font-semibold text-rose-950 bg-white hover:bg-rose-100 px-3.5 py-2 rounded-lg border border-rose-300 flex items-center justify-center gap-1.5 shrink-0 transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>Resolve Alert ({criticalAlerts.length})</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* 3. Four Simple At-a-Glance Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Medicine Stock Health */}
        <button
          type="button"
          onClick={() => setActiveModule('medicine')}
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-emerald-500 transition-colors text-left cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Medicine Stock</span>
              <Pill className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {criticalStockMeds.length > 0
                  ? `${criticalStockMeds.length} Critical`
                  : warningStockMeds.length > 0
                  ? `${warningStockMeds.length} Warning`
                  : 'All Healthy'}
              </span>
              {warningStockMeds.length > 0 && criticalStockMeds.length > 0 && (
                <span className="text-xs font-mono font-bold text-amber-700">
                  +{warningStockMeds.length} Warning ({attentionMeds.length} Low Total)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {medicines.length} facility items tracked ({canonicalMedMetrics.normalCount} Normal · {canonicalMedMetrics.surplusCount} Surplus)
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
            <span>Open Medicine List</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Card 2: Replenishment Orders */}
        <button
          type="button"
          onClick={() => setActiveModule('orders')}
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-sky-500 transition-colors text-left cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Replenishment Orders</span>
              <Truck className="w-4 h-4 text-sky-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {canonicalOrderMetrics.activeOrdersCount} Active
              </span>
              <span className="text-xs font-mono text-slate-500">
                ({canonicalOrderMetrics.totalOrdersCount} Total Indents)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {canonicalOrderMetrics.activeOrdersCount} in pipeline · {canonicalOrderMetrics.completedOrdersCount} delivered
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-sky-700">
            <span>Manage Warehouse Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Card 3: Inter-PHC Transfers */}
        <button
          type="button"
          onClick={() => setActiveModule('orders')}
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-400 transition-colors text-left cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Inter-PHC Transfers</span>
              <ArrowRightLeft className="w-4 h-4 text-slate-700" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {canonicalOrderMetrics.pendingTransfersCount} Suggested
              </span>
              <span className="text-xs font-mono text-slate-500">
                ({canonicalOrderMetrics.totalTransfersCount} Total)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {canonicalOrderMetrics.approvedTransfersCount} transfers approved/in-transit
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>View Lateral Transfers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Card 4: Weather & Demand Surge Model */}
        <button
          type="button"
          onClick={() => setActiveModule('preparedness')}
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-amber-500 transition-colors text-left cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Simulated Weather Surge</span>
              <CloudSun className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-amber-700">
                {weather.temperatureC}°C
              </span>
              <span className="text-xs font-semibold text-amber-800 truncate">
                {weather.alertType}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate">
              {weather.vulnerableMedicines?.[0]
                ? `${weather.seasonalProfile}: +${weather.vulnerableMedicines[0].demandSurgePercent}% ${weather.vulnerableMedicines[0].medicineName.split(' ')[0]} demand`
                : `${weather.seasonalProfile} regional demand model`}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-amber-800">
            <span>Open Demand Forecast</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>

      {/* 4. Main Interactive Workspace: Priority Clinical Command Center Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: 1. CRITICAL SHORTAGES + 3. EXPIRY RISKS + 4. ACTIVE ALERTS */}
        <div className="lg:col-span-7 space-y-6">
          {/* SECTION 1: CRITICAL SHORTAGES */}
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col justify-between overflow-hidden">
            <div>
              <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-50/40">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300">
                      Priority 1 · Critical Shortages
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {criticalStockMeds.length} Critical · {warningStockMeds.length} Warning ({attentionMeds.length} Total)
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-1">
                    Critical Shortages &amp; Safety Buffer Breaches ({attentionMeds.length})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Medicines below required facility safety levels with days of stock remaining and direct actions
                  </p>
                </div>

                {attentionMeds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRestockAllLowMedicines}
                    disabled={isOrderingAll}
                    className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer shrink-0"
                  >
                    <PackageCheck className="w-4 h-4" />
                    <span>
                      {isOrderingAll
                        ? 'Ordering...'
                        : `Order All ${attentionMeds.length} Low Items`}
                    </span>
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100">
                {(attentionMeds.length > 0 ? attentionMeds : medicines.slice(0, 4)).map(
                  (med) => {
                    const evalRes =
                      canonicalMedMetrics.evaluationsByMedId[med.id] ||
                      evaluateMedicineThresholdAndReplenishment(med);
                    const isCrit = evalRes.riskLevel === 'CRITICAL';
                    const suggestedOrderQty = evalRes.recommendedOrderQty;
                    const matchingPendingRec = pendingReviewRedistributions.find((r) =>
                      r.medicineName.toLowerCase().includes(med.name.split(' ')[0].toLowerCase())
                    );

                    return (
                      <div
                        key={med.id}
                        className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge
                              status={evalRes.riskLevel}
                              text={
                                isCrit
                                  ? 'Critical Shortage'
                                  : evalRes.riskLevel === 'WARNING'
                                  ? 'Below Safety Buffer'
                                  : 'Healthy'
                              }
                            />
                            <span className="font-bold text-sm text-slate-900 truncate">
                              {med.name}
                            </span>
                            {evalRes.pendingOrders > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono font-bold">
                                +{evalRes.pendingOrders} In Pipeline
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-mono tabular-nums">
                            <span>
                              Current Stock:{' '}
                              <strong className="text-slate-900">
                                {evalRes.usableStock.toLocaleString()} {med.unit}
                              </strong>
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Required Safety Level:{' '}
                              <strong className="text-slate-800">
                                {med.minStockLevel.toLocaleString()} {med.unit}
                              </strong>
                            </span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                isCrit
                                  ? 'text-rose-700 font-bold'
                                  : 'text-amber-700 font-semibold'
                              }
                            >
                              Days of Stock: {evalRes.usableDaysOfCover} days
                            </span>
                          </div>
                        </div>

                        {/* Direct Actions to Inventory or Relevant Recommendation */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => openMedicineInInventory(med.id)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <span>Inventory</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>

                          {matchingPendingRec ? (
                            <button
                              type="button"
                              onClick={() => approveRedistribution(matchingPendingRec.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-teal-200" />
                              <span>Review Transfer (+{matchingPendingRec.recommendedTransferQuantity})</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleInstantOrder(med.name, suggestedOrderQty, isCrit)
                              }
                              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
                            >
                              <Plus className="w-3 h-3 text-emerald-400" />
                              <span>Order +{suggestedOrderQty}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Incoming deliveries in transit:{' '}
                <strong className="font-mono text-slate-900">
                  {incomingDeliveries.length}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setActiveModule('medicine')}
                className="font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Medicine Inventory ({medicines.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* SECTION 3: EXPIRY RISKS (FEFO Priority) */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-50/40">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                    Priority 3 · FEFO Expiry Risks
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700">
                    {canonicalMedMetrics.expiringSoonCount} Expiring ≤90d · {canonicalMedMetrics.expiredBatchesItemCount} Expired Excluded
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  Near-Expiry Batches &amp; FEFO Dispensing Queue ({expiringSoonMeds.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('medicine')}
                className="text-xs font-bold text-amber-900 hover:text-amber-950 flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>Open FEFO Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {expiringSoonMeds.length === 0 ? (
                <div className="p-4 text-xs text-slate-500">
                  No usable batches expiring within the next 90 days.
                </div>
              ) : (
                expiringSoonMeds.slice(0, 5).map((med) => {
                  const refMs = Date.parse('2026-09-22T00:00:00Z');
                  const earliestBatch =
                    Array.isArray(med.batches) && med.batches.length > 0
                      ? [...med.batches]
                          .filter((b) => b.quantity > 0 && Date.parse(`${b.expiryDate}T00:00:00Z`) > refMs)
                          .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))[0] || med.batches[0]
                      : null;
                  const batchNo = earliestBatch?.batchNumber || med.batchNumber;
                  const expiryDate = earliestBatch?.expiryDate || med.expiryDate;
                  const expMs = Date.parse(`${expiryDate}T00:00:00Z`);
                  const daysRemaining = !Number.isNaN(expMs)
                    ? Math.max(0, Math.ceil((expMs - refMs) / (1000 * 60 * 60 * 24)))
                    : 60;
                  const fefoPriority =
                    med.fefoPriority || (daysRemaining <= 45 ? 'URGENT' : 'EXPIRING_SOON');

                  return (
                    <div
                      key={`exp-${med.id}`}
                      className="p-3.5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{med.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                              fefoPriority === 'URGENT'
                                ? 'bg-rose-100 text-rose-900 border-rose-300'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}
                          >
                            FEFO: {fefoPriority}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-slate-600">
                          <span>
                            Batch: <strong className="text-slate-900">{batchNo}</strong>
                          </span>
                          <span>·</span>
                          <span>
                            Expiry: <strong className="text-slate-900">{expiryDate}</strong>
                          </span>
                          <span>·</span>
                          <span className={daysRemaining <= 45 ? 'text-rose-700 font-bold' : 'text-amber-800 font-bold'}>
                            {daysRemaining} days remaining
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openMedicineInInventory(med.id)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <span>Inspect in Inventory</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SECTION 4: ACTIVE ALERTS */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                    Priority 4 · Active Alerts
                  </span>
                  <span className="text-xs font-mono font-bold text-rose-700">
                    {canonicalAlertMetrics.criticalAlertsCount} Critical · {canonicalAlertMetrics.warningAlertsCount} Warning
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                  <BellRing className="w-4 h-4 text-rose-600" />
                  <span>Unresolved Facility &amp; Supply Alerts ({activeAlertsList.length})</span>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('alerts')}
                className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>Open Alert Centre</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {activeAlertsList.length === 0 ? (
                <div className="p-4 text-xs text-slate-500">
                  All system alerts are resolved.
                </div>
              ) : (
                activeAlertsList.slice(0, 4).map((alertItem) => (
                  <div
                    key={alertItem.id}
                    className="p-3.5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          status={alertItem.category === 'CRITICAL' ? 'CRITICAL' : 'WARNING'}
                          text={alertItem.category}
                        />
                        <span className="font-bold text-slate-900">{alertItem.title}</span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {alertItem.timestamp}
                        </span>
                      </div>
                      <p className="text-slate-600 line-clamp-2">{alertItem.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => acknowledgeAlert(alertItem.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer whitespace-nowrap"
                      >
                        {alertItem.status === 'ACTIVE' ? 'Acknowledge' : 'Resolve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveModule('alerts')}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer whitespace-nowrap"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 5 Columns: 2. PENDING MEDICAL OFFICER REVIEWS + 5. OFFLINE / SYNC STATUS + Quick Stock Dispense */}
        <div className="lg:col-span-5 space-y-6">
          {/* SECTION 2: PENDING MEDICAL OFFICER REVIEWS */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-2 bg-teal-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-100 text-teal-900 border border-teal-300">
                    Priority 2 · Human Approval Queue
                  </span>
                  <span className="text-xs font-mono font-bold text-teal-900">
                    {pendingReviewRedistributions.length} Pending · {canonicalOrderMetrics.approvedTransfersCount} Approved · {canonicalOrderMetrics.rejectedTransfersCount} Rejected
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  <span>Pending Medical Officer Reviews ({pendingReviewRedistributions.length})</span>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('orders')}
                className="text-xs font-bold text-teal-800 hover:text-teal-950 flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>All Transfers</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {redistributions.map((rec) => {
                const isPending = rec.status === 'PENDING_REVIEW' || rec.status === 'PROPOSED';
                const isApproved =
                  rec.status === 'APPROVED' ||
                  rec.status === 'DISPATCHED' ||
                  rec.status === 'IN_TRANSIT' ||
                  rec.status === 'RECEIVED' ||
                  rec.status === 'COMPLETED';
                const isRejected = rec.status === 'REJECTED' || rec.status === 'CANCELLED';
                const qty = rec.recommendedTransferQuantity || rec.transferQuantity || 0;
                const sourceName = rec.sourcePHCName || rec.sourcePHC?.name || 'Donor PHC';
                const destName = rec.destinationPHCName || rec.targetPHC?.name || 'Recipient PHC';

                return (
                  <div key={rec.id} className="p-4 space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-slate-900 text-sm">{rec.medicineName}</div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300">
                          {qty} Units
                        </span>
                        <span
                          className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded border ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : isRejected
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </div>
                    </div>

                    <div className="font-mono text-[11px] text-slate-700 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>
                        Source: <strong className="text-slate-900">{sourceName}</strong>
                      </span>
                      <span>→</span>
                      <span>
                        Destination: <strong className="text-rose-800">{destName}</strong>
                      </span>
                      <span>·</span>
                      <span className="text-slate-500">{rec.transitDistanceKm} km</span>
                    </div>

                    {isPending ? (
                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => approveRedistribution(rec.id)}
                          className="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                          <span>Review Recommendation</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => approveRedistribution(rec.id, undefined, true)}
                          className="py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            rejectRedistribution(
                              rec.id,
                              'Rejected by Medical Officer during clinical review'
                            )
                          }
                          className="py-2 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] font-mono text-slate-600 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        <span className={isApproved ? 'text-emerald-800 font-bold' : 'text-rose-800 font-bold'}>
                          {isApproved ? '✓ Approved & Applied' : '✕ Rejected (No Transfer)'}
                        </span>
                        <span>
                          {rec.reviewedBy || rec.approvedBy || rec.rejectedBy || 'Medical Officer'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 5: OFFLINE / SYNC STATUS */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isOfflineMode ? (
                  <WifiOff className="w-4 h-4 text-amber-600" />
                ) : (
                  <Wifi className="w-4 h-4 text-emerald-600" />
                )}
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                    Priority 5 · Connectivity &amp; Offline Queue
                  </span>
                  <h2 className="text-sm font-bold text-slate-900">
                    {isOfflineMode ? 'Offline Buffer Mode Active' : 'Online Real-Time Sync'} ·{' '}
                    {queuedOrFailedOfflineItems.length} Queued
                    {failedOfflineItems.length > 0 ? ` (${failedOfflineItems.length} Failed)` : ''}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleOfflineMode}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border cursor-pointer ${
                    isOfflineMode
                      ? 'bg-amber-100 text-amber-950 border-amber-300'
                      : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  }`}
                >
                  {isOfflineMode ? 'Go Online' : 'Simulate Offline'}
                </button>
                {queuedOrFailedOfflineItems.length > 0 && !isOfflineMode && (
                  <button
                    type="button"
                    onClick={() => void syncOfflineQueue()}
                    disabled={isQueueSyncing}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isQueueSyncing ? 'animate-spin' : ''}`} />
                    <span>{isQueueSyncing ? 'Syncing...' : 'Sync Now'}</span>
                  </button>
                )}
              </div>
            </div>

            {offlineQueue.length === 0 ? (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                <span>0 queued or failed offline actions. All local ledger records are synchronized.</span>
                <button
                  type="button"
                  onClick={addMockOfflineRecord}
                  className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer shrink-0 ml-2"
                >
                  + Test Queue Item
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {offlineQueue.slice(0, 3).map((qItem) => (
                  <div
                    key={qItem.id}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">
                        {qItem.entityName} ({qItem.moduleLabel})
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {qItem.action} · {qItem.timestamp}
                        {qItem.errorMessage ? ` · Error: ${qItem.errorMessage}` : ''}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                        qItem.status === 'SYNCED'
                          ? 'bg-emerald-100 text-emerald-900'
                          : qItem.status === 'FAILED_RETRY'
                          ? 'bg-rose-100 text-rose-900'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {qItem.status}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="font-mono text-slate-500">
                    Total queue records: {offlineQueue.length} ({queuedOrFailedOfflineItems.length} pending/failed)
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveModule('alerts')}
                    className="font-bold text-teal-700 hover:text-teal-900 cursor-pointer"
                  >
                    Manage Offline Queue →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pharmacy Dispensing & Stock Deduction Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-emerald-600" />
                  <span>Quick Stock Dispense / Deduction</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Deduct dispensed units from live PHC inventory and recalculate stock-out days
                </p>
              </div>
            </div>

            <form onSubmit={handleQuickDispenseSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="quick-med-select"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  1. Select Medicine
                </label>
                <select
                  id="quick-med-select"
                  value={selectedQuickMed?.id || ''}
                  onChange={(e) => setQuickMedId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.currentStock} {m.unit} left)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="quick-qty-input"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    2. Quantity ({selectedQuickMed?.unit || 'Units'})
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="quick-qty-input"
                      type="number"
                      min={1}
                      max={selectedQuickMed?.currentStock || 9999}
                      value={quickQty}
                      onChange={(e) => setQuickQty(Math.max(1, Number(e.target.value)))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div className="flex items-center gap-1 mt-1.5">
                    {[10, 25, 50].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setQuickQty(preset)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border cursor-pointer ${
                          quickQty === preset
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="quick-reason-select"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    3. Ledger Reason
                  </label>
                  <select
                    id="quick-reason-select"
                    value={quickReason}
                    onChange={(e) => setQuickReason(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="OPD Pharmacy Dispense">OPD Pharmacy Dispense</option>
                    <option value="Sub-Centre Stock Issue">Sub-Centre Stock Issue</option>
                    <option value="Outreach Camp Issue">Outreach Camp Issue</option>
                    <option value="Damaged / Expired Write-off">Damaged / Expired Write-off</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isQuickDispensing}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isQuickDispensing
                    ? 'Updating Stock...'
                    : `Dispense ${quickQty} ${selectedQuickMed?.unit || 'Units'} Now`}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
