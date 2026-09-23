import React from 'react';
import {
  AlertTriangle,
  Pill,
  BedDouble,
  Users,
  CloudSun,
  Truck,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldAlert,
  Thermometer,
  CalendarCheck2,
  ScanLine,
  Mic,
  ArrowRightLeft,
  Building2,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusBadge } from '../ui/StatusBadge.tsx';

export const HomeOverview: React.FC = () => {
  const {
    selectedPHC,
    medicines,
    capacity,
    workforce,
    weather,
    orders,
    alerts,
    setActiveModule,
    redistributions
  } = useApp();

  const criticalAlerts = alerts.filter(a => a.status === 'ACTIVE' && a.category === 'CRITICAL');
  const warningAlerts = alerts.filter(a => a.status === 'ACTIVE' && a.category === 'WARNING');
  const criticalStockMeds = medicines.filter(m => m.stockoutRisk === 'CRITICAL');
  const warningStockMeds = medicines.filter(m => m.stockoutRisk === 'WARNING');
  const incomingDeliveries = orders.filter(o => o.status === 'IN TRANSIT' || o.status === 'DISPATCHED');
  const pendingRequests = orders.filter(
    o => o.status === 'REQUESTED' || o.status === 'APPROVAL PENDING' || o.status === 'APPROVED'
  );

  return (
    <div className="space-y-6">
      {/* Top Administrative Header: Official Facility Identity */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 uppercase tracking-wider font-mono border border-slate-200">
              {selectedPHC.type}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-600 font-semibold">
              {selectedPHC.block} Block, {selectedPHC.district} District
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-mono text-slate-500">
              Registry: {selectedPHC.code}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {selectedPHC.name}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
            <span>
              MO I/C: <strong className="text-slate-900 font-semibold">{selectedPHC.medicalOfficerInCharge}</strong>
            </span>
            <span>•</span>
            <span>Catchment Population: <strong className="text-slate-900 font-semibold">38,500</strong></span>
            <span>•</span>
            <span>Sub-centres Linked: <strong className="text-slate-900 font-semibold">6 SCs</strong></span>
          </div>
        </div>

        {/* Readiness Index Card */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-left sm:text-right min-w-[210px]">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Facility Operational Status
            </div>
            <div className="flex items-center gap-2 sm:justify-end mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" aria-hidden="true" />
              <span className="text-sm font-bold text-slate-900">
                Surge Load • Normal Ops
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Next Sync: RMSCL Gateway (12m)
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alert Notice (if any) */}
      {criticalAlerts.length > 0 && (
        <div
          role="region"
          aria-label="Critical Alerts"
          className="bg-rose-50/90 border-l-4 border-rose-600 rounded-r-xl p-4 sm:p-5 shadow-xs transition-all"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <div className="font-bold text-sm text-rose-950 flex flex-wrap items-center gap-2">
                  <span>{criticalAlerts.length} Critical Bottleneck{criticalAlerts.length > 1 ? 's' : ''} Require Immediate Intervention</span>
                  <StatusBadge status="CRITICAL" text="URGENT" />
                </div>
                <div className="text-xs text-rose-900 space-y-1">
                  {criticalAlerts.map(alert => (
                    <div key={alert.id} className="font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
                      <span>{alert.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveModule('alerts')}
              className="text-xs font-semibold text-rose-950 bg-white hover:bg-rose-100/60 px-3.5 py-2 rounded-lg border border-rose-300 shadow-2xs flex items-center justify-center gap-1.5 shrink-0 transition-colors"
            >
              <span>Review Action Items</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Operational Command Toolbar */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <Sparkles className="w-4 h-4" />
            <span>Fast-Track Inward & Dispensing Pipelines</span>
          </div>
          <p className="text-xs text-slate-300">
            Capture daily paper OPD tallies, dictate verbal dispensing, or draft inter-PHC orders directly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setActiveModule('records')}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <ScanLine className="w-3.5 h-3.5 text-emerald-400" />
            <span>Scan Register OCR</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('voice')}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Mic className="w-3.5 h-3.5 text-sky-400" />
            <span>Voice OPD Entry</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('orders')}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>RMSCL Indent</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Telemetry Grid: 4 Core Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Medicine Status */}
        <div
          onClick={() => setActiveModule('medicine')}
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-emerald-400 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
              <span>Medicine Inventory</span>
              <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Pill className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-slate-900 tracking-tight">
                {medicines.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">Formulary SKUs</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            {criticalStockMeds.length > 0 ? (
              <StatusBadge status="CRITICAL" text={`${criticalStockMeds.length} Depleting Fast`} />
            ) : warningStockMeds.length > 0 ? (
              <StatusBadge status="WARNING" text={`${warningStockMeds.length} Low Buffer`} />
            ) : (
              <StatusBadge status="NORMAL" text="Adequate Buffers" />
            )}
            <span className="text-[11px] text-slate-400 font-bold group-hover:text-emerald-700 transition-colors">
              Manage →
            </span>
          </div>
        </div>

        {/* Facility Capacity */}
        <div
          onClick={() => setActiveModule('capacity')}
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-sky-400 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
              <span>Inpatient Beds</span>
              <div className="p-1.5 rounded-md bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <BedDouble className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-slate-900 tracking-tight">
                {capacity.occupancyRate}%
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ({capacity.occupiedBeds}/{capacity.totalBeds} Active)
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            {capacity.occupancyRate >= 80 ? (
              <StatusBadge status="CRITICAL" text={`${capacity.availableBeds} Free Beds`} />
            ) : capacity.occupancyRate >= 65 ? (
              <StatusBadge status="WARNING" text="Moderate Load" />
            ) : (
              <StatusBadge status="NORMAL" text="Beds Available" />
            )}
            <span className="text-[11px] text-slate-400 font-bold group-hover:text-sky-700 transition-colors">
              Wards →
            </span>
          </div>
        </div>

        {/* Workforce */}
        <div
          onClick={() => setActiveModule('workforce')}
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-purple-400 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
              <span>Clinical Staff</span>
              <div className="p-1.5 rounded-md bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-slate-900 tracking-tight">
                {workforce.staffPresentToday}/{workforce.totalStaffSanctioned}
              </span>
              <span className="text-xs text-slate-500 font-medium">On Duty</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <StatusBadge
              status={workforce.workloadIndex === 'HIGH' || workforce.workloadIndex === 'CRITICAL' ? 'WARNING' : 'NORMAL'}
              text={`${workforce.workloadIndex} Load`}
            />
            <span className="text-[11px] text-slate-400 font-bold group-hover:text-purple-700 transition-colors">
              Roster →
            </span>
          </div>
        </div>

        {/* Weather / Preparedness */}
        <div
          onClick={() => setActiveModule('preparedness')}
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-amber-400 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
              <span>Weather Preparedness</span>
              <div className="p-1.5 rounded-md bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <CloudSun className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-amber-700 tracking-tight">
                {weather.temperatureC}°C
              </span>
              <span className="text-xs font-semibold text-amber-800">
                {weather.alertType}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <StatusBadge status="PREPAREDNESS" text="Heatwave Surge" />
            <span className="text-[11px] text-slate-400 font-bold group-hover:text-amber-800 transition-colors">
              Surge Model →
            </span>
          </div>
        </div>
      </div>

      {/* Two-Column Middle Section: Supply Chain & Logistics + Early Warning Preparedness */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logistics & Supply Pipeline */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-blue-50 text-blue-600">
                  <Truck className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-slate-900 text-sm">Replenishment Pipeline & Consignments</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('orders')}
                className="text-xs text-blue-700 font-bold hover:underline"
              >
                Track Indents ({orders.length}) →
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {incomingDeliveries.length > 0 ? (
                incomingDeliveries.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80 flex items-center justify-between text-xs gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 flex items-center gap-2 truncate">
                        <span className="truncate">{ord.medicineName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-900 shrink-0">
                          {ord.quantityDispatched || ord.quantityRequested} Units
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono">
                        <span>Indent: {ord.id}</span>
                        <span>•</span>
                        <span>ETA: {ord.estimatedDelivery}</span>
                      </div>
                    </div>
                    <StatusBadge status="blue" text={ord.status} />
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 p-4 text-center border border-dashed border-slate-200 rounded-xl">
                  No active consignments in transit.
                </div>
              )}

              {/* Pending Approvals */}
              <div className="pt-2 text-xs">
                <span className="font-bold text-slate-700 block mb-2 uppercase text-[10px] tracking-wider">
                  Pending Indent Approvals ({pendingRequests.length}):
                </span>
                <div className="space-y-1.5">
                  {pendingRequests.slice(0, 2).map(req => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                    >
                      <span className="text-slate-900 font-medium truncate">{req.medicineName}</span>
                      <span className="text-slate-600 font-mono text-[11px] shrink-0 font-semibold">
                        {req.quantityRequested} units • {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium text-[11px]">Warehouse: Mandore Central (RMSCL)</span>
            <button
              type="button"
              onClick={() => setActiveModule('orders')}
              className="bg-slate-900 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors shadow-2xs"
            >
              + Create Requisition
            </button>
          </div>
        </div>

        {/* Predictive Preparedness Insight */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-amber-50 text-amber-600">
                  <Thermometer className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-slate-900 text-sm">Predictive Seasonal Signal</h2>
              </div>
              <StatusBadge status="PREPAREDNESS" text="IMD Alert Active" />
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5">
                <div className="font-bold text-amber-950 flex items-center gap-1.5">
                  <span>Forecast-Driven Demand Surge: Desert Fringe Heatwave</span>
                </div>
                <p className="text-slate-700 leading-relaxed text-xs">
                  {weather.historicalCorrelationNote}
                </p>
                <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs font-bold text-amber-950 font-mono">
                  <span>ORS Surge: +65%</span>
                  <span>IV Fluid Surge: +45%</span>
                </div>
              </div>

              {/* Inter-PHC Redistribution Recommendation */}
              {redistributions.length > 0 && (
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" />
                      Inter-PHC Lateral Balancing
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded font-mono">
                      Fast Relief
                    </span>
                  </div>
                  <p className="text-slate-700 text-xs leading-relaxed">
                    PHC Mandore holds surplus <strong>ORS Sachets (1,200 surplus)</strong>. Transferring 600 units to PHC Osian prevents stockout within 1.2 hrs transit.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveModule('orders')}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline inline-flex items-center gap-1"
                  >
                    <span>Authorize Lateral Transfer</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500">Decision Support Model: IMD × RMSCL</span>
            <button
              type="button"
              onClick={() => setActiveModule('preparedness')}
              className="text-slate-700 font-bold hover:text-slate-900 flex items-center gap-1"
            >
              <span>Explore Seasonal Model</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
