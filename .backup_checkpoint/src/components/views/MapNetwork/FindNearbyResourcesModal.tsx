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
  AlertCircle,
  MapPin,
  ExternalLink,
  Compass,
  Map as MapIcon,
  Globe2
} from 'lucide-react';
import { NetworkFacility, SurplusCandidate, GoogleMapsPlace } from '../../../types.ts';
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
  const { showNotification, searchNearbyMapsGrounding, isMapsLoading } = useApp();

  const [activeTab, setActiveTab] = useState<'surplus' | 'maps'>('surplus');

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

  // Maps Grounding state
  const [mapsQuery, setMapsQuery] = useState<string>(
    `Emergency hospitals and blood banks near ${facility.name}, ${facility.block}, Rajasthan`
  );
  const [mapsResult, setMapsResult] = useState<{ text: string; places: GoogleMapsPlace[] } | null>(null);

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
      `Recommendation Drafted: Proposed transfer of ${qty} ${candidate.unit} from ${candidate.facility.name} to ${facility.name}. Forwarded to Block Medical Officer (BMO).`
    );
  };

  const handleMapsSearch = async () => {
    if (!mapsQuery.trim()) return;
    const result = await searchNearbyMapsGrounding(mapsQuery, facility.latitude, facility.longitude);
    setMapsResult(result);
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
                Resource Allocation & Live Maps Engine
              </span>
              <span className="text-xs text-slate-400 font-mono">Rajasthan Health Network</span>
            </div>
            <h2 id="modal-title" className="text-lg sm:text-xl font-bold tracking-tight mt-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Surplus Identification & Google Maps Grounding</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Focus Location: <strong className="text-white">{facility.name}</strong> ({facility.code}) • Coordinates: {facility.latitude.toFixed(4)}, {facility.longitude.toFixed(4)}
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

        {/* Mode Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('surplus')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'surplus'
                ? 'bg-white text-emerald-800 border-emerald-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>PHC Network Surplus Candidates ({candidates.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('maps');
              if (!mapsResult) {
                handleMapsSearch();
              }
            }}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'maps'
                ? 'bg-white text-emerald-800 border-emerald-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Globe2 className="w-4 h-4 text-emerald-600" />
            <span>Google Maps Grounding (gemini-3.5-flash)</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold">
              LIVE
            </span>
          </button>
        </div>

        {/* Tab 1: Surplus Redistribution */}
        {activeTab === 'surplus' && (
          <>
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
                    Days to Depletion: <strong className="text-rose-700">{targetShortage.daysRemaining} days</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Recommended Inward Buffer: <strong className="text-emerald-800">{targetShortage.deficitQuantity} {targetShortage.unit}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <label htmlFor="medicine-select" className="sr-only">Select shortage medicine</label>
                <select
                  id="medicine-select"
                  value={selectedMedicine}
                  onChange={(e) => setSelectedMedicine(e.target.value)}
                  className="bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-500 w-full md:w-auto"
                >
                  {availableShortages.map((med) => (
                    <option key={med} value={med}>{med}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Candidate List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 custom-scrollbar">
              {candidates.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6">
                  <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <h3 className="font-bold text-slate-800 text-sm">No Peripheral Surplus Found</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    No authorized PHC within {radiusKm} km currently holds verified surplus. Switch to the <strong>Google Maps Grounding</strong> tab to find nearby district hospitals, blood banks, or warehouses.
                  </p>
                </div>
              ) : (
                candidates.map((cand) => {
                  const isDrafted = draftedRecommendations.includes(cand.facility.id);
                  const proposedTransferQty =
                    customQuantities[cand.facility.id] ||
                    Math.min(cand.projectedSurplus, targetShortage.deficitQuantity);

                  return (
                    <div
                      key={cand.facility.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isDrafted
                          ? 'bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-slate-900">{cand.facility.name}</h3>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                              {cand.facility.facilityType}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Block {cand.facility.block} • Medical Officer: <strong>{cand.authorizedMOIC}</strong> ({cand.contactNumber})
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-xs text-slate-500 font-mono">Distance & Transit:</span>
                            <div className="font-bold text-sm text-slate-800 font-mono">
                              {cand.distanceKm} km • ~{cand.estimatedTravelTimeMinutes} min
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-4 text-xs">
                          <div>
                            <span className="text-slate-500">Available Surplus:</span>
                            <span className="font-bold text-emerald-700 ml-1.5 font-mono">
                              +{cand.projectedSurplus} {cand.unit}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Road Corridor:</span>
                            <span className="font-semibold text-slate-700 ml-1.5">{cand.roadQuality}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {onVisualizeRoute && (
                            <button
                              type="button"
                              onClick={() => {
                                onVisualizeRoute(cand.facility, facility);
                                onClose();
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                            >
                              <Navigation className="w-3.5 h-3.5 text-blue-600" />
                              <span>Show Route</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDraftRecommendation(cand)}
                            disabled={isDrafted}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                              isDrafted
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 cursor-default'
                                : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                            }`}
                          >
                            {isDrafted ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Drafted for BMO Review</span>
                              </>
                            ) : (
                              <>
                                <FileCheck2 className="w-3.5 h-3.5" />
                                <span>Draft Transfer ({proposedTransferQty} units)</span>
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
          </>
        )}

        {/* Tab 2: Google Maps Grounding */}
        {activeTab === 'maps' && (
          <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
            {/* Search Query Input */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <label htmlFor="maps-grounding-query" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Globe2 className="w-4 h-4 text-emerald-600" />
                <span>Search Nearby Healthcare Facilities & Resources via Google Maps</span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  id="maps-grounding-query"
                  type="text"
                  value={mapsQuery}
                  onChange={(e) => setMapsQuery(e.target.value)}
                  placeholder="e.g. 24 hour blood banks and trauma referral centers in Jodhpur"
                  className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs text-slate-900"
                />

                <button
                  type="button"
                  onClick={handleMapsSearch}
                  disabled={isMapsLoading || !mapsQuery.trim()}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isMapsLoading ? 'Searching Maps...' : 'Search Maps'}</span>
                </button>
              </div>

              {/* Quick Query Suggestions */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-slate-500 font-semibold">Quick Search:</span>
                {[
                  `Emergency trauma centers near ${facility.name}`,
                  `Blood banks and storage units near ${facility.block}`,
                  `24/7 pharmacies and Jan Aushadhi stores near Jodhpur`,
                  `District Hospital Mandore cold storage`
                ].map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setMapsQuery(q);
                      searchNearbyMapsGrounding(q, facility.latitude, facility.longitude).then(setMapsResult);
                    }}
                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-800 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Display */}
            {isMapsLoading && (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                <Sparkles className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">Grounding query with live Google Maps data...</p>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  Using <strong>gemini-3.5-flash</strong> with <code>googleMaps</code> tool
                </p>
              </div>
            )}

            {!isMapsLoading && mapsResult && (
              <div className="space-y-4">
                {/* Extracted Google Maps Links (Mandatory extraction as links) */}
                {mapsResult.places.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <span>Identified Google Maps Places ({mapsResult.places.length})</span>
                      </h4>
                      <span className="text-[10px] text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                        Grounded with Google Maps Links
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {mapsResult.places.map((place, idx) => (
                        <a
                          key={idx}
                          href={place.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-emerald-500 rounded-xl transition-all shadow-2xs group flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-xs text-slate-900 group-hover:text-emerald-800 flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-600 shrink-0" />
                                <span>{place.title}</span>
                              </span>
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 shrink-0" />
                            </div>

                            {place.address && (
                              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                                {place.address}
                              </p>
                            )}

                            {place.snippet && (
                              <p className="text-[11px] text-slate-600 mt-1 italic line-clamp-2">
                                "{place.snippet}"
                              </p>
                            )}
                          </div>

                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span className="text-emerald-700 group-hover:underline">View on Google Maps →</span>
                            <span>Open Link</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grounded Summary Text */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Grounded Clinical & Logistics Intelligence Summary
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 ml-auto">
                      Engine: gemini-3.5-flash
                    </span>
                  </div>
                  <div className="text-xs leading-relaxed text-slate-800 whitespace-pre-wrap">
                    {mapsResult.text}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2 text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Real-time Google Maps Grounding (gemini-3.5-flash) and Authorized PHC Network Allocation.
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
