import React, { useState, useEffect, useMemo, useTransition } from 'react';
import {
  Clock,
  Navigation,
  Sparkles,
  RefreshCw,
  Truck,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Phone,
  Layers,
  Activity,
  Zap,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';
import { NetworkFacility, DistanceMatrixTransportEstimate } from '../../../types.ts';
import { computeMedicalTransportMatrix } from '../../../utils/distanceMatrixService.ts';
import { useApp } from '../../../context/AppContext.tsx';

interface DistanceMatrixTransportPanelProps {
  selectedPHC: NetworkFacility;
  allFacilities: NetworkFacility[];
  onSelectRoute: (origin: NetworkFacility, destination: NetworkFacility) => void;
  onOpenInstantTransfer: (facility: NetworkFacility, preferredDrug?: string) => void;
  onSelectFacility?: (facility: NetworkFacility) => void;
}

export const DistanceMatrixTransportPanel: React.FC<DistanceMatrixTransportPanelProps> = ({
  selectedPHC,
  allFacilities,
  onSelectRoute,
  onOpenInstantTransfer,
  onSelectFacility
}) => {
  const { showNotification } = useApp();
  const [selectedSupply, setSelectedSupply] = useState<string>('Polyvalent Anti-Snake Venom (ASV) 10ml');
  const [onlyWithin30Km, setOnlyWithin30Km] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'duration' | 'distance' | 'surplus'>('duration');
  const [estimates, setEstimates] = useState<DistanceMatrixTransportEstimate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastCalculated, setLastCalculated] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();

  // Supply list options
  const supplyOptions = [
    { label: 'All Emergency Supplies', value: 'ALL' },
    { label: 'Anti-Snake Venom (ASV)', value: 'Polyvalent Anti-Snake Venom (ASV) 10ml' },
    { label: 'Oxytocin 10 IU/ml', value: 'Oxytocin Injection 10 IU/ml' },
    { label: 'Normal Saline (0.9% NaCl)', value: 'Normal Saline (0.9% NaCl) IV Infusion 500ml' },
    { label: 'ORS Sachets 20.5g', value: 'Oral Rehydration Salts (ORS) Sachets 20.5g' },
    { label: 'Paracetamol IP 500mg', value: 'Paracetamol Tablets IP 500mg' }
  ];

  // Candidates with surplus
  const candidateSurplusFacilities = useMemo(() => {
    return allFacilities.filter((f) => {
      if (f.id === selectedPHC.id) return false;
      if (selectedSupply === 'ALL') {
        return f.keySurpluses.length > 0 || f.facilityType === 'RMSCL Warehouse';
      }
      return (
        f.keySurpluses.some((s) =>
          s.medicineName.toLowerCase().includes(selectedSupply.split(' ')[0].toLowerCase())
        ) || f.facilityType === 'RMSCL Warehouse'
      );
    });
  }, [allFacilities, selectedPHC, selectedSupply]);

  // Recalculate Distance Matrix
  const runDistanceMatrixCalculation = async () => {
    if (candidateSurplusFacilities.length === 0) {
      setEstimates([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await computeMedicalTransportMatrix({
        origin: selectedPHC,
        destinations: candidateSurplusFacilities,
        medicineName: selectedSupply === 'ALL' ? undefined : selectedSupply,
        travelMode: 'DRIVING'
      });

      startTransition(() => {
        setEstimates(results);
        setLastCalculated(new Date());
      });
    } catch (err) {
      console.error('Failed to compute distance matrix transport times:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runDistanceMatrixCalculation();
  }, [selectedPHC.id, selectedSupply, candidateSurplusFacilities.length]);

  // Filter and sort estimates
  const processedEstimates = useMemo(() => {
    let list = [...estimates];

    if (onlyWithin30Km) {
      list = list.filter((item) => item.distanceKm <= 30);
    }

    list.sort((a, b) => {
      if (sortBy === 'duration') return a.durationMinutes - b.durationMinutes;
      if (sortBy === 'distance') return a.distanceKm - b.distanceKm;
      if (sortBy === 'surplus') return (b.surplusQuantity || 0) - (a.surplusQuantity || 0);
      return 0;
    });

    return list;
  }, [estimates, onlyWithin30Km, sortBy]);

  const fastestEstimate = processedEstimates.length > 0 ? processedEstimates[0] : null;

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
      {/* Panel Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Road-Factor Distance &amp; Surplus Estimator</span>
              </span>
              <span className="text-[11px] font-mono text-amber-300 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Haversine × 1.28 Rural Road Estimate (DEMO/SIMULATED)</span>
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-1 flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-400" />
              <span>Medical Supplies Transport Matrix: Estimated Travel Times</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Estimated driving times (Haversine × 1.28 road factor at 52 km/h) from calculated surplus PHCs to{' '}
              <strong className="text-white underline">{selectedPHC.name}</strong> ({selectedPHC.code}).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                runDistanceMatrixCalculation();
                showNotification('Recalculating estimated transport times from current facility inventory...');
              }}
              disabled={isLoading}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Recalculating...' : 'Recalculate ETA'}</span>
            </button>
          </div>
        </div>

        {/* Selected PHC Origin Strip */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Recipient PHC:</span>
            <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 font-bold font-mono text-white flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-sky-400" />
              <span>{selectedPHC.name}</span>
              <span className="text-[10px] text-slate-400">({selectedPHC.district})</span>
            </span>
          </div>

          {lastCalculated && (
            <span className="text-[11px] font-mono text-slate-400">
              Evaluated {estimates.length} candidate surplus routes at {lastCalculated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px] uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-sky-600" />
            <span>Target Medical Supply:</span>
          </span>

          <select
            value={selectedSupply}
            onChange={(e) => setSelectedSupply(e.target.value)}
            className="p-1.5 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs cursor-pointer"
          >
            {supplyOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setOnlyWithin30Km(!onlyWithin30Km)}
            className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              onlyWithin30Km
                ? 'bg-purple-100 text-purple-900 border-purple-300 ring-2 ring-purple-200 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
            }`}
          >
            <span>≤30 km Golden-Hour Radius {onlyWithin30Km ? '(ON)' : '(OFF)'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-medium">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="p-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            <option value="duration">Fastest Transport Time</option>
            <option value="distance">Shortest Road Distance</option>
            <option value="surplus">Largest Surplus Quantity</option>
          </select>
        </div>
      </div>

      {/* Summary Highlight Alert */}
      {fastestEstimate && (
        <div className="mx-4 sm:mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5 sm:mt-0">
              <Zap className="w-4 h-4" />
            </span>
            <div>
              <div className="font-bold text-emerald-950 flex items-center gap-2">
                <span>Fastest Surplus Provider: {fastestEstimate.surplusFacility.name}</span>
                <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-200 text-emerald-900">
                  {fastestEstimate.durationText}
                </span>
                <span className="text-[10px] text-emerald-800 font-mono">
                  ({fastestEstimate.distanceText})
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Surplus available: <strong>{fastestEstimate.surplusQuantity || 'Available'} {fastestEstimate.unit}</strong> • Recommended:{' '}
                <em>{fastestEstimate.transportMode}</em>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onSelectRoute(selectedPHC, fastestEstimate.surplusFacility)}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Plot on Map</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenInstantTransfer(selectedPHC, fastestEstimate.medicineName)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Dispatch Transfer</span>
            </button>
          </div>
        </div>
      )}

      {/* Distance Matrix Table / Cards Grid */}
      <div className="p-4 sm:p-5">
        {processedEstimates.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
            <div className="font-bold text-slate-800">No surplus providers found matching active criteria</div>
            <p className="text-xs">
              Try disabling the 30 km radius or switching the target supply filter to "All Emergency Supplies".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {processedEstimates.map((item, idx) => {
              const isFastest = idx === 0 && sortBy === 'duration';
              const isColdChain =
                item.medicineName?.toLowerCase().includes('snake') ||
                item.medicineName?.toLowerCase().includes('asv') ||
                item.medicineName?.toLowerCase().includes('oxytocin');

              return (
                <div
                  key={item.surplusFacilityId}
                  className={`p-4 rounded-xl border transition-all relative flex flex-col justify-between space-y-3 ${
                    isFastest
                      ? 'bg-sky-50/70 border-sky-300 ring-2 ring-sky-200 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  {/* Top Header Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              item.surplusFacility.facilityType === 'RMSCL Warehouse'
                                ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                : item.surplusFacility.facilityType === 'CHC'
                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            }`}
                          >
                            {item.surplusFacility.facilityType}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {item.surplusFacility.code}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 mt-1 leading-snug">
                          {item.surplusFacility.name}
                        </h3>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.surplusFacility.block} • {item.surplusFacility.district}
                        </div>
                      </div>

                      {/* Prominent Google Distance Matrix ETA Badge */}
                      <div className="text-right shrink-0">
                        <div className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono font-bold text-xs flex items-center gap-1 justify-end">
                          <Clock className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{item.durationText}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          {item.distanceText} via road
                        </div>
                        {item.durationInTrafficText && (
                          <div className="text-[9px] font-mono text-amber-700 font-semibold">
                            Traffic: {item.durationInTrafficText}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Surplus Supply Information */}
                    <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="font-medium text-slate-600 truncate max-w-[180px]">
                          {item.medicineName || 'Emergency Reserve'}
                        </span>
                        <span className="font-mono font-bold text-emerald-700">
                          {item.surplusQuantity ? `+${item.surplusQuantity} ${item.unit}` : 'Surplus Stock'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 font-mono">
                        <span>Mode: {item.transportMode}</span>
                        {isColdChain && (
                          <span className="text-sky-700 font-bold">2–8°C ILR</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => onSelectRoute(selectedPHC, item.surplusFacility)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
                      title="Plot driving route on Google Map"
                    >
                      <Navigation className="w-3 h-3 text-sky-600" />
                      <span>Map Route</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenInstantTransfer(selectedPHC, item.medicineName)}
                      className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer text-[11px]"
                    >
                      <Sparkles className="w-3 h-3 text-amber-200" />
                      <span>Dispatch</span>
                    </button>

                    <a
                      href={`tel:${item.surplusFacility.contactNumber}`}
                      className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                      title={`Call MOIC: ${item.surplusFacility.medicalOfficerInCharge} (${item.surplusFacility.contactNumber})`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Calculations powered by Google Distance Matrix Service</span>
        </div>
        <div>
          <span>Optimal lateral transfers prioritized within ≤30 km Golden-Hour window</span>
        </div>
      </div>
    </div>
  );
};
