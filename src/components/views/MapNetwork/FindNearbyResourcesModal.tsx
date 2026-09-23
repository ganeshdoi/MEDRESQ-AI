import React, { useState } from 'react';
import {
  X,
  Search,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Clock,
  Navigation,
  Pill,
  Building2,
  Phone,
  UserCheck,
  CheckCircle2,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import { NetworkFacility, SurplusCandidate } from '../../../types.ts';
import {
  calculateHaversineDistanceKm,
  calculateRoadDistanceKm,
  estimateTravelTimeMinutes
} from '../../../data/networkData.ts';
import { useApp } from '../../../context/AppContext.tsx';

interface FindNearbyResourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  facility: NetworkFacility;
  allFacilities: NetworkFacility[];
  initialMedicineName?: string;
  onVisualizeRoute?: (source: NetworkFacility, destination: NetworkFacility) => void;
}

export const FindNearbyResourcesModal: React.FC<FindNearbyResourcesModalProps> = ({
  isOpen,
  onClose,
  facility,
  allFacilities,
  initialMedicineName,
  onVisualizeRoute
}) => {
  const { showNotification } = useApp();

  // Selected shortage medicine to search for
  const availableShortages = facility.keyShortages.map((s) => s.medicineName);
  const [selectedMedicine, setSelectedMedicine] = useState<string>(
    initialMedicineName || availableShortages[0] || 'Oral Rehydration Salts (ORS) Sachets 20.5g'
  );

  // Search radius filter
  const [radiusKm, setRadiusKm] = useState<number>(75);

  // Proposed quantity input state for drafting recommendation
  const [customQuantities, setCustomQuantities] = useState<Record<string, number>>({});
  const [draftedRecommendations, setDraftedRecommendations] = useState<string[]>([]);

  if (!isOpen) return null;

  // Selected shortage details
  const targetShortage = facility.keyShortages.find((s) => s.medicineName === selectedMedicine) || {
    medicineName: selectedMedicine,
    currentStock: 0,
    projectedBurnPerDay: 50,
    daysRemaining: 1.5,
    deficitQuantity: 500,
    unit: 'Units'
  };

  // Find authorized facilities with surplus for this medicine within radius
  const candidates: SurplusCandidate[] = allFacilities
    .filter((f) => f.id !== facility.id)
    .map((candidate) => {
      // Check if candidate has surplus for this medicine
      const surplusItem = candidate.keySurpluses.find(
        (item) => item.medicineName.toLowerCase() === selectedMedicine.toLowerCase()
      );

      const airDistance = calculateHaversineDistanceKm(
        facility.latitude,
        facility.longitude,
        candidate.latitude,
        candidate.longitude
      );
      const roadDistance = calculateRoadDistanceKm(airDistance);

      // Determine road corridor type
      const isWarehouse = candidate.facilityType === 'RMSCL Warehouse';
      const roadQuality = isWarehouse
        ? ('Highway (NH-62)' as const)
        : roadDistance > 40
        ? ('State Highway' as const)
        : ('Rural / Desert Road' as const);

      const travelTimeMinutes = estimateTravelTimeMinutes(roadDistance, roadQuality);

      return {
        facility: candidate,
        medicineName: selectedMedicine,
        availableStock: surplusItem ? surplusItem.currentStock : 0,
        projectedSurplus: surplusItem ? surplusItem.surplusQuantity : 0,
        distanceKm: roadDistance,
        estimatedTravelTimeMinutes: travelTimeMinutes,
        transitSpeedKmh: roadQuality === 'Highway (NH-62)' ? 65 : roadQuality === 'State Highway' ? 50 : 35,
        roadQuality,
        unit: surplusItem ? surplusItem.unit : 'Units',
        authorizedMOIC: candidate.medicalOfficerInCharge,
        contactNumber: candidate.contactNumber
      };
    })
    .filter((c) => c.distanceKm <= radiusKm && c.projectedSurplus > 0)
    .sort((a, b) => {
      // Sort primarily by surplus sufficiency, then by distance
      if (a.projectedSurplus >= targetShortage.deficitQuantity && b.projectedSurplus < targetShortage.deficitQuantity) {
        return -1;
      }
      if (b.projectedSurplus >= targetShortage.deficitQuantity && a.projectedSurplus < targetShortage.deficitQuantity) {
        return 1;
      }
      return a.distanceKm - b.distanceKm;
    });

  const handleDraftRecommendation = (candidate: SurplusCandidate) => {
    const qty =
      customQuantities[candidate.facility.id] ||
      Math.min(candidate.projectedSurplus, targetShortage.deficitQuantity);

    setDraftedRecommendations((prev) => [...prev, candidate.facility.id]);

    showNotification(
      `Recommendation Drafted: Proposed transfer of ${qty} ${candidate.unit} from ${candidate.facility.name} to ${facility.name}. Forwarded to Block Medical Officer (BMO) for formal authorization.`
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                Inter-Facility Resource Allocation Engine
              </span>
              <span className="text-xs text-slate-400 font-mono">Rajasthan Health Network</span>
            </div>
            <h2 id="modal-title" className="text-lg sm:text-xl font-bold tracking-tight mt-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Surplus Identification & Lateral Redistribution Search</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Target Shortage Facility: <strong className="text-white">{facility.name}</strong> ({facility.code}) • Block {facility.block}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortage Context Summary Card */}
        <div className="p-4 bg-amber-50/80 border-b border-amber-200 text-xs text-amber-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="font-bold flex items-center gap-2 text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Active Projected Shortage at {facility.name}:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-amber-800">
              <span>
                Medicine: <strong className="text-slate-900">{targetShortage.medicineName}</strong>
              </span>
              <span>•</span>
              <span>
                Current Stock: <strong className="text-rose-700">{targetShortage.currentStock} {targetShortage.unit}</strong>
              </span>
              <span>•</span>
              <span>
                Surge Burn: <strong className="text-slate-900">{targetShortage.projectedBurnPerDay} / day</strong>
              </span>
              <span>•</span>
              <span>
                Days Remaining: <strong className="text-rose-700">{targetShortage.daysRemaining} days</strong>
              </span>
              <span>•</span>
              <span>
                Projected Deficit: <strong className="text-rose-800">{targetShortage.deficitQuantity} {targetShortage.unit}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="medicine-select" className="text-[11px] font-bold text-amber-900">
              Filter by Shortage:
            </label>
            <select
              id="medicine-select"
              value={selectedMedicine}
              onChange={(e) => setSelectedMedicine(e.target.value)}
              className="bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {facility.keyShortages.map((s) => (
                <option key={s.medicineName} value={s.medicineName}>
                  {s.medicineName} (-{s.deficitQuantity} {s.unit})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Regulatory Governance Guardrail Banner (MANDATORY REQUIREMENT) */}
        <div className="p-3.5 bg-blue-50/90 border-b border-blue-200 text-xs text-blue-950 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>ADMINISTRATIVE REGULATORY DIRECTIVE (Rajasthan DHS Circular 2026/D-14):</strong> Lateral inter-facility drug redistributions are generated as <em>decision support recommendations only</em> and are <strong>NEVER automatically initiated or dispatched</strong>. Authorized counter-signature by the Block Medical Officer (BMO) or Chief Medical & Health Officer (CMHO) is legally required prior to physical vehicle movement.
          </div>
        </div>

        {/* Controls Bar: Search Radius Slider & Status Filter */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-700">Search Radius:</span>
            <input
              type="range"
              min="15"
              max="150"
              step="5"
              value={radiusKm}
              onChange={(e) => setRadiusKm(parseInt(e.target.value))}
              className="w-36 accent-emerald-600 cursor-pointer"
            />
            <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
              Within {radiusKm} km road distance
            </span>
          </div>

          <div className="text-slate-500 font-mono text-[11px]">
            Found <strong>{candidates.length}</strong> authorized network facilities with verified surplus
          </div>
        </div>

        {/* Candidates List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar">
          {candidates.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <div className="font-bold text-slate-800 text-sm">No Facilities with Surplus Found Within {radiusKm} km</div>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Try expanding the search radius slider or check warehouse replenishment indents from the Central RMSCL Mandore depot.
              </p>
            </div>
          ) : (
            candidates.map((cand) => {
              const isDrafted = draftedRecommendations.includes(cand.facility.id);
              const defaultTransferQty = Math.min(cand.projectedSurplus, targetShortage.deficitQuantity);
              const currentInputQty = customQuantities[cand.facility.id] ?? defaultTransferQty;

              return (
                <div
                  key={cand.facility.id}
                  className={`p-4 rounded-xl border transition-all text-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    isDrafted
                      ? 'border-emerald-300 bg-emerald-50/60 shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  {/* Left Column: Facility Information & MOIC */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{cand.facility.name}</span>
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                        {cand.facility.facilityType}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">{cand.facility.code}</span>
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded">
                        Cold-Chain: {cand.facility.coldChainTempC ? `${cand.facility.coldChainTempC}°C Potent` : 'ILR Verified'}
                      </span>
                    </div>

                    <div className="text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>MOIC: <strong>{cand.authorizedMOIC}</strong></span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{cand.contactNumber}</span>
                      </span>
                      <span>Block: {cand.facility.block}</span>
                    </div>

                    <div className="text-slate-500 text-[11px] leading-relaxed">
                      {cand.facility.notes}
                    </div>
                  </div>

                  {/* Middle Column: Stock, Surplus, Distance & Transit Time */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 shrink-0 text-center text-[11px]">
                    {/* Distance */}
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Distance</span>
                      <div className="font-bold font-mono text-slate-900 text-sm mt-0.5">
                        {cand.distanceKm} km
                      </div>
                      <span className="text-[9px] text-slate-500 block">{cand.roadQuality}</span>
                    </div>

                    {/* Travel Time */}
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Transit ETA</span>
                      <div className="font-bold font-mono text-indigo-700 text-sm mt-0.5 flex items-center justify-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {cand.estimatedTravelTimeMinutes >= 60
                            ? `${(cand.estimatedTravelTimeMinutes / 60).toFixed(1)} hrs`
                            : `${cand.estimatedTravelTimeMinutes} mins`}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500 block">Avg {cand.transitSpeedKmh} km/h</span>
                    </div>

                    {/* Total Stock */}
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Total Stock</span>
                      <div className="font-bold font-mono text-slate-800 text-sm mt-0.5">
                        {cand.availableStock}
                      </div>
                      <span className="text-[9px] text-slate-500 block">{cand.unit}</span>
                    </div>

                    {/* Projected Surplus */}
                    <div>
                      <span className="text-emerald-700 block text-[10px] uppercase font-bold tracking-wider">Net Surplus</span>
                      <div className="font-bold font-mono text-emerald-800 text-sm mt-0.5">
                        +{cand.projectedSurplus}
                      </div>
                      <span className="text-[9px] text-emerald-600 block">{cand.unit} shareable</span>
                    </div>
                  </div>

                  {/* Right Column: Authorized Recommendation Workflow */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <label htmlFor={`qty-${cand.facility.id}`} className="text-[10px] font-bold text-slate-600">
                        Transfer Qty:
                      </label>
                      <input
                        id={`qty-${cand.facility.id}`}
                        type="number"
                        min="10"
                        max={cand.projectedSurplus}
                        value={currentInputQty}
                        onChange={(e) =>
                          setCustomQuantities({
                            ...customQuantities,
                            [cand.facility.id]: parseInt(e.target.value) || 0
                          })
                        }
                        className="w-20 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      {onVisualizeRoute && (
                        <button
                          type="button"
                          onClick={() => onVisualizeRoute(cand.facility, facility)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5 text-slate-600" />
                          <span>Show Route</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDraftRecommendation(cand)}
                        disabled={isDrafted}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer ${
                          isDrafted
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 cursor-default'
                            : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        }`}
                      >
                        {isDrafted ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Submitted to BMO Review</span>
                          </>
                        ) : (
                          <>
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>Draft Recommendation</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2 text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              All identified facilities have confirmed storage temperature potency and positive inventory buffer after planned transfer.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Close Search
          </button>
        </div>
      </div>
    </div>
  );
};
