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
  UserPlus
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusBadge } from '../ui/StatusBadge.tsx';
import { evaluateMedicineThresholdAndReplenishment } from '../../utils/inventoryForecast.ts';
import { getPHCInchargeCredential } from '../../utils/phcAuthDirectory.ts';

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
    showNotification,
    inchargeSession,
    openAuthModal
  } = useApp();

  const currentCredential = getPHCInchargeCredential(selectedPHC);

  // Interactive Quick Dispense state for single medicine
  const [quickMedId, setQuickMedId] = useState<string>(medicines[0]?.id || '');
  const [quickQty, setQuickQty] = useState<number>(10);
  const [quickReason, setQuickReason] = useState<string>('OPD Pharmacy Dispense');
  const [isQuickDispensing, setIsQuickDispensing] = useState<boolean>(false);
  const [isOrderingAll, setIsOrderingAll] = useState<boolean>(false);
  const [ilrTempVerified, setIlrTempVerified] = useState<boolean>(false);

  const selectedQuickMed = medicines.find((m) => m.id === quickMedId) || medicines[0];

  const criticalAlerts = alerts.filter((a) => a.status === 'ACTIVE' && a.category === 'CRITICAL');
  const criticalStockMeds = medicines.filter((m) => m.stockoutRisk === 'CRITICAL');
  const warningStockMeds = medicines.filter((m) => m.stockoutRisk === 'WARNING');
  const attentionMeds = [...criticalStockMeds, ...warningStockMeds];
  const incomingDeliveries = orders.filter(
    (o) => o.status === 'IN TRANSIT' || o.status === 'DISPATCHED' || o.status === 'REQUESTED' || o.status === 'APPROVAL PENDING'
  );

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
    showNotification(`Dispensed ${qty} ${unit} of ${medName}.`);
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
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-400/30 text-emerald-200 font-bold text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Incharge: {inchargeSession?.inchargeName || currentCredential.inchargeName}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-200 font-mono text-[11px] font-bold">
                  DEMO ONLY • Credential: {currentCredential.maskedCredential}
                </span>
                <span className="text-emerald-200/80 font-mono text-[11px]">
                  {selectedPHC.code} · {selectedPHC.block}, {selectedPHC.district}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {selectedPHC.name} — Friendly Supply &amp; Forecast Command Hub
              </h1>

              <p className="text-xs text-emerald-100/85 max-w-2xl leading-relaxed">
                Welcome back! Monitor configurable demo medicine buffers, dispense stock, inspect district-specific seasonal demand surges, and preview simulated replenishment orders.
              </p>
            </div>

            {/* PHC Incharge Account & Directory Shortcuts */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openAuthModal('directory')}
                className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                <span>PHC Incharge Directory (53)</span>
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('signup', selectedPHC)}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Configure Demo Account</span>
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
              <div className="text-[10px] text-slate-500 truncate">53 PHCs &amp; routes</div>
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
                <span>NLEM Drug Catalogue (51)</span>
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
                  ? `${warningStockMeds.length} Low`
                  : 'All Healthy'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {medicines.length} essential medicines tracked
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
                {orders.length} Orders
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {incomingDeliveries.length} active indents in pipeline
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
                {redistributions.filter((r) => r.status === 'PROPOSED' || r.status === 'PENDING_REVIEW').length} Suggested
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {redistributions.filter((r) => r.status === 'APPROVED' || r.status === 'IN_TRANSIT' || r.status === 'COMPLETED').length} transfers approved/in-transit
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

      {/* 4. Main Interactive Workspace: Left = Low Stock Action Table, Right = STG Clinical Protocol & Quick Dispense */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Medicines Needing Action Today (1-Click Order or Dispense) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 flex flex-col justify-between overflow-hidden">
          <div>
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Medicines Running Low ({attentionMeds.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order replacement stock or dispense directly with a single click
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
                  const evalRes = evaluateMedicineThresholdAndReplenishment(med);
                  const isCrit = evalRes.riskLevel === 'CRITICAL';
                  const suggestedOrderQty = evalRes.recommendedOrderQty;
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
                                ? 'Critical Low'
                                : evalRes.riskLevel === 'WARNING'
                                ? 'Low Stock'
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
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                          <span>
                            Usable:{' '}
                            <strong className="text-slate-900">
                              {evalRes.usableStock.toLocaleString()} {med.unit}
                            </strong>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Min Buffer: {med.minStockLevel}</span>
                          <span aria-hidden="true">·</span>
                          <span>Daily Use: {med.dailyConsumption}/day</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              isCrit
                                ? 'text-rose-700 font-bold'
                                : 'text-amber-700 font-semibold'
                            }
                          >
                            Lasts {evalRes.usableDaysOfCover} days
                          </span>
                        </div>
                      </div>

                      {/* Direct 1-Click Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleInstantDispense(
                              med.id,
                              med.name,
                              med.unit,
                              med.currentStock
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
                          title="Dispense 10 units to OPD"
                        >
                          <Minus className="w-3 h-3" />
                          <span>Dispense 10</span>
                        </button>

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
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
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

        {/* Right 5 Columns: Single Item Pharmacy Dispense + Nearby PHC Transfer */}
        <div className="lg:col-span-5 space-y-6">
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

          {/* Nearby PHC Surplus Sharing Card */}
          {redistributions.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-900">
                    Fast Transfer from Nearby PHC
                  </h2>
                </div>
                <span className="text-xs font-mono text-emerald-700 font-semibold">
                  {redistributions[0].transitDistanceKm} km away
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>{redistributions[0].sourcePHCName || redistributions[0].sourcePHC?.name}</strong> has surplus{' '}
                <strong>{redistributions[0].medicineName}</strong>. Request{' '}
                <strong className="font-mono">
                  {redistributions[0].recommendedTransferQuantity || redistributions[0].transferQuantity} units
                </strong>{' '}
                instead of waiting for the district warehouse.
              </p>

              <div className="pt-1 flex items-center justify-between gap-2">
                {redistributions[0].status === 'APPROVED' || redistributions[0].status === 'IN_TRANSIT' || redistributions[0].status === 'COMPLETED' ? (
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Transfer Approved &amp; Stock Updated ({redistributions[0].status})
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      approveRedistribution(redistributions[0].id);
                    }}
                    className="w-full py-2 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      Approve Instant Transfer ({redistributions[0].recommendedTransferQuantity || redistributions[0].transferQuantity} Units)
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
