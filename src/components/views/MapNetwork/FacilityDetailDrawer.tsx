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
  ShieldCheck,
  ExternalLink
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
  onOpenInstantTransfer?: (facility: NetworkFacility) => void;
  onUpdateMedicineStock?: (
    facilityId: string,
    medicineName: string,
    updates: { stock?: number; minThreshold?: number; maxThreshold?: number }
  ) => void;
}

export const FacilityDetailDrawer: React.FC<FacilityDetailDrawerProps> = ({
  facility,
  onClose,
  onFindNearbyResources,
  onMeasureDistance,
  isOrigin,
  isDestination,
  onOpenInstantTransfer,
  onUpdateMedicineStock
}) => {
  if (!facility) return null;

  const hasShortages = facility.keyShortages.length > 0;
  const hasSurpluses = facility.keySurpluses.length > 0;
  const isMatched = facility.isInventoryMatched !== false && facility.assessedRiskCategory !== 'UNKNOWN';
  const riskCategory = facility.assessedRiskCategory || 'UNKNOWN';
  const targetMedicineName =
    facility.assessedMedicineName && !facility.assessedMedicineName.startsWith('All Essential Medicines')
      ? facility.assessedMedicineName
      : facility.keyShortages[0]?.medicineName ||
        facility.keySurpluses[0]?.medicineName ||
        'Oral Rehydration Salts (ORS) IP (20.5g WHO Sachet)';

  return (
    <aside
      role="complementary"
      aria-label="Facility Details Drawer"
      className="w-full xl:w-[380px] 2xl:w-[400px] shrink-0 h-auto xl:h-[650px] bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col overflow-hidden transition-all"
    >
      {/* Drawer Header */}
      <div className="p-4 bg-slate-900 text-white flex items-start justify-between gap-3 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
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
            <span
              className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${
                facility.isInventoryMatched !== false
                  ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
                  : 'bg-slate-700 text-slate-200 border border-slate-600'
              }`}
            >
              {facility.isInventoryMatched !== false ? 'DEMO / SIMULATED DATA' : 'UNMAPPED FACILITY'}
            </span>
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

        {/* Assessed Medicine & Calculated Inventory Status Card */}
        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Pill className="w-3.5 h-3.5 text-teal-600" />
              <span>Assessed Medicine</span>
            </span>
            <span
              className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                riskCategory === 'CRITICAL'
                  ? 'bg-rose-100 text-rose-900'
                  : riskCategory === 'WARNING'
                  ? 'bg-amber-100 text-amber-900'
                  : riskCategory === 'SURPLUS'
                  ? 'bg-sky-100 text-sky-900'
                  : riskCategory === 'NORMAL'
                  ? 'bg-emerald-100 text-emerald-900'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              RISK: {riskCategory}
            </span>
          </div>

          <div className="font-bold text-slate-900 text-xs leading-snug">
            {facility.assessedMedicineName || 'All Essential Medicines (Portfolio Summary)'}
          </div>

          {isMatched ? (
            <div className="space-y-2 pt-1 border-t border-slate-200/80">
              {typeof facility.assessedUsableStock === 'number' && (
                <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px]">
                  <div className="bg-white p-1.5 rounded border border-slate-200">
                    <div className="text-[9px] text-slate-400 uppercase font-sans font-bold">Usable Stock</div>
                    <div className="font-bold text-slate-900">
                      {facility.assessedUsableStock} {facility.assessedUnit || ''}
                    </div>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-slate-200">
                    <div className="text-[9px] text-slate-400 uppercase font-sans font-bold">Min / Max</div>
                    <div className="font-bold text-slate-900">
                      {facility.assessedMinThreshold ?? '—'} / {facility.assessedMaxThreshold ?? '—'}
                    </div>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-slate-200">
                    <div className="text-[9px] text-slate-400 uppercase font-sans font-bold">Days Cover</div>
                    <div className="font-bold text-slate-900">
                      {facility.assessedDaysRemaining !== null && facility.assessedDaysRemaining !== undefined
                        ? `${facility.assessedDaysRemaining}d`
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              )}

              {facility.statusReason && (
                <div className="text-[11px] text-slate-600 leading-relaxed bg-white p-2 rounded border border-slate-200/80">
                  {facility.statusReason}
                </div>
              )}

              {onUpdateMedicineStock && facility.isInventoryMatched !== false && (
                <div className="pt-1.5 border-t border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                    <span>Test Live Inventory Update ({targetMedicineName.split(' ')[0]}):</span>
                    <span className="font-mono text-[9px] text-slate-400">Updates only {facility.name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateMedicineStock(facility.id, targetMedicineName, {
                          stock: Math.max(10, Math.round((facility.assessedMinThreshold || 150) * 0.25))
                        })
                      }
                      className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      Set Critical
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateMedicineStock(facility.id, targetMedicineName, {
                          stock: Math.round(
                            ((facility.assessedMinThreshold || 150) + (facility.assessedMaxThreshold || 600)) / 2
                          )
                        })
                      }
                      className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      Set Normal
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateMedicineStock(facility.id, targetMedicineName, {
                          stock: Math.round((facility.assessedMaxThreshold || 600) * 1.45)
                        })
                      }
                      className="px-2 py-1 rounded bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      Set Surplus
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-slate-200/70 border border-slate-300 text-slate-700 text-[11px] space-y-1">
              <div className="font-bold text-slate-900">Status: UNKNOWN / INVENTORY UNAVAILABLE</div>
              <p className="text-[10px] text-slate-600 leading-relaxed">
                {facility.statusReason ||
                  'Inventory cannot be matched to this facility or medicine. No shortage or surplus is inferred.'}
              </p>
            </div>
          )}
        </div>

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
                    : facility.medicineRisk === 'UNKNOWN'
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-emerald-100 text-emerald-900'
                }`}
              >
                {facility.medicineRisk.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Cold-Chain & Supply Readiness Metrics */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-600" />
              <span>Pharmacy &amp; Store Staff:</span>
            </span>
            <span className="font-mono font-bold text-slate-800">
              {facility.staffPresentCount} of {facility.staffSanctionedCount} Present ({facility.workforceStatus})
            </span>
          </div>

          {facility.coldChainTempC && (
            <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <ThermometerSnowflake className="w-3.5 h-3.5 text-blue-600" />
                <span>Cold-Chain Temp:</span>
              </span>
              <span className="font-mono font-bold text-emerald-700">{facility.coldChainTempC}°C (Simulated ILR)</span>
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

            {/* Crucial CTA: Instant Transfer Possibilities */}
            <button
              type="button"
              onClick={() => {
                if (onOpenInstantTransfer) onOpenInstantTransfer(facility);
                else onFindNearbyResources(facility);
              }}
              className="w-full mt-2 py-2 px-3 bg-gradient-to-r from-rose-600 via-amber-600 to-emerald-600 hover:from-rose-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Instant Transfer Possibilities</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('distance-matrix-transport-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full mt-1.5 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer border border-slate-700"
            >
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Distance Matrix ETAs from Surplus Donors</span>
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
      <div className="p-3.5 bg-slate-100 border-t border-slate-200 shrink-0 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onMeasureDistance(facility)}
            className="flex-1 py-2 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5 text-sky-600" />
            <span>Route Ambulance</span>
          </button>

          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}&travelmode=driving`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 px-3 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Google Maps GPS</span>
          </a>
        </div>

        {hasShortages && (
          <button
            type="button"
            onClick={() => {
              if (onOpenInstantTransfer) onOpenInstantTransfer(facility);
              else onFindNearbyResources(facility);
            }}
            className="w-full py-2 px-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>⚡ Instant Transfer Possibilities</span>
          </button>
        )}
      </div>
    </aside>
  );
};
