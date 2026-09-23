import React from 'react';
import {
  X,
  Building2,
  Phone,
  UserCheck,
  BedDouble,
  Users,
  AlertTriangle,
  Pill,
  Sparkles,
  Navigation,
  Compass,
  CheckCircle2,
  Clock,
  Layers,
  ThermometerSnowflake,
  ShieldCheck
} from 'lucide-react';
import { NetworkFacility } from '../../../types.ts';
import { StatusBadge } from '../../ui/StatusBadge.tsx';

interface FacilityDetailDrawerProps {
  facility: NetworkFacility | null;
  onClose: () => void;
  onFindNearbyResources: (facility: NetworkFacility) => void;
  onMeasureDistance: (facility: NetworkFacility) => void;
  isOrigin?: boolean;
  isDestination?: boolean;
}

export const FacilityDetailDrawer: React.FC<FacilityDetailDrawerProps> = ({
  facility,
  onClose,
  onFindNearbyResources,
  onMeasureDistance,
  isOrigin,
  isDestination
}) => {
  if (!facility) return null;

  const hasShortages = facility.keyShortages.length > 0;
  const hasSurpluses = facility.keySurpluses.length > 0;

  return (
    <div
      role="complementary"
      aria-label="Facility Details Drawer"
      className="absolute top-4 right-4 bottom-4 z-400 w-96 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in slide-in-from-right-4 transition-all"
    >
      {/* Drawer Header */}
      <div className="p-4 bg-slate-900 text-white flex items-start justify-between gap-3 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                facility.facilityType === 'RMSCL Warehouse'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                  : facility.facilityType === 'CHC'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
              }`}
            >
              {facility.facilityType}
            </span>
            <span className="text-[10px] font-mono text-slate-400">{facility.code}</span>
          </div>

          <h3 className="font-bold text-base text-white tracking-tight leading-snug">{facility.name}</h3>

          <div className="text-[11px] text-slate-300 flex items-center gap-2">
            <span>Block: <strong>{facility.block}</strong></span>
            <span>•</span>
            <span>District: {facility.district}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close details"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
        {/* Route Endpoint Indicators if selected */}
        {(isOrigin || isDestination) && (
          <div
            className={`p-2.5 rounded-lg border font-mono font-bold text-xs flex items-center gap-2 ${
              isOrigin
                ? 'bg-blue-50 border-blue-300 text-blue-900'
                : 'bg-emerald-50 border-emerald-300 text-emerald-900'
            }`}
          >
            <Compass className="w-4 h-4 shrink-0" />
            <span>{isOrigin ? 'Active Route Origin Point' : 'Active Route Destination Point'}</span>
          </div>
        )}

        {/* Operational Status Badges Grid */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Operational Risk</span>
            <div className="mt-1 flex justify-center">
              <StatusBadge status={facility.operationalRisk} />
            </div>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Medicine Status</span>
            <div className="mt-1 flex justify-center">
              <span
                className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                  facility.medicineRisk === 'CRITICAL_DEFICIT'
                    ? 'bg-rose-100 text-rose-900'
                    : facility.medicineRisk === 'BUFFER_DEPLETING'
                    ? 'bg-amber-100 text-amber-900'
                    : facility.medicineRisk === 'SURPLUS_AVAILABLE'
                    ? 'bg-blue-100 text-blue-900'
                    : 'bg-emerald-100 text-emerald-900'
                }`}
              >
                {facility.medicineRisk.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Capacity & Workforce Metrics */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
          <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BedDouble className="w-3.5 h-3.5 text-slate-600" />
              <span>Bed Capacity ({facility.capacityUtilization}%)</span>
            </span>
            <span className="font-mono text-slate-700">
              {facility.occupiedBeds} / {facility.sanctionedBeds} Beds
            </span>
          </div>

          {facility.sanctionedBeds > 0 && (
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  facility.capacityUtilization >= 85
                    ? 'bg-rose-600'
                    : facility.capacityUtilization >= 70
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, facility.capacityUtilization)}%` }}
              />
            </div>
          )}

          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-600" />
              <span>Workforce Present:</span>
            </span>
            <span className="font-mono font-bold text-slate-800">
              {facility.staffPresentCount} of {facility.staffSanctionedCount} Staff ({facility.workforceStatus})
            </span>
          </div>

          {facility.coldChainTempC && (
            <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <ThermometerSnowflake className="w-3.5 h-3.5 text-blue-600" />
                <span>Cold-Chain Temp:</span>
              </span>
              <span className="font-mono font-bold text-emerald-700">{facility.coldChainTempC}°C (Optimal ILR)</span>
            </div>
          )}
        </div>

        {/* Predicted Shortages Section */}
        {hasShortages && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-950 flex items-center gap-1.5 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Predicted Medicine Shortages ({facility.keyShortages.length})</span>
              </span>
            </div>

            <div className="space-y-2">
              {facility.keyShortages.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/70 text-[11px] space-y-1">
                  <div className="font-bold text-rose-900">{item.medicineName}</div>
                  <div className="flex justify-between text-rose-800 font-mono text-[10px]">
                    <span>Stock: {item.currentStock} {item.unit}</span>
                    <span>Surge Burn: {item.projectedBurnPerDay}/day</span>
                    <span className="font-bold underline">{item.daysRemaining}d left</span>
                  </div>
                  <div className="text-[10px] text-rose-950 pt-0.5 border-t border-rose-200/60 font-semibold">
                    Projected Deficit: -{item.deficitQuantity} {item.unit}
                  </div>
                </div>
              ))}
            </div>

            {/* Crucial CTA: Find Nearby Resources */}
            <button
              type="button"
              onClick={() => onFindNearbyResources(facility)}
              className="w-full mt-2 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Find Nearby Resources</span>
            </button>
          </div>
        )}

        {/* Available Surplus Section */}
        {hasSurpluses && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Available Surplus Reserves ({facility.keySurpluses.length})</span>
              </span>
            </div>

            <div className="space-y-2">
              {facility.keySurpluses.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 text-[11px] space-y-1">
                  <div className="font-bold text-emerald-900">{item.medicineName}</div>
                  <div className="flex justify-between text-emerald-800 font-mono text-[10px]">
                    <span>Total Stock: {item.currentStock} {item.unit}</span>
                    <span className="font-bold text-emerald-900">+{item.surplusQuantity} Shareable</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Administrative Contact & Location Info */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-[11px] text-slate-600">
          <div className="flex items-center gap-2 text-slate-800">
            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>MOIC: <strong>{facility.medicalOfficerInCharge}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-800">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono">{facility.contactNumber}</span>
          </div>
          <div className="text-slate-500 text-[10px] font-mono pt-1">
            GPS: {facility.latitude.toFixed(4)}°N, {facility.longitude.toFixed(4)}°E
          </div>
        </div>

        {facility.notes && (
          <div className="text-[11px] text-slate-500 italic bg-white p-2.5 rounded-lg border border-slate-200">
            "{facility.notes}"
          </div>
        )}
      </div>

      {/* Drawer Action Footer */}
      <div className="p-3.5 bg-slate-100 border-t border-slate-200 shrink-0 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onMeasureDistance(facility)}
          className="flex-1 py-2 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <Navigation className="w-3.5 h-3.5 text-blue-600" />
          <span>Set Route Node</span>
        </button>

        {hasShortages && (
          <button
            type="button"
            onClick={() => onFindNearbyResources(facility)}
            className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Find Surplus</span>
          </button>
        )}
      </div>
    </div>
  );
};
