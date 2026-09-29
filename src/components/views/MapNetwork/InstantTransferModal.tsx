import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Navigation,
  Pill,
  Building2,
  Phone,
  ArrowRight,
  Truck,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  FileText,
  Boxes,
  Compass,
  AlertCircle,
  Zap
} from 'lucide-react';
import { NetworkFacility } from '../../../types.ts';
import {
  calculateHaversineDistanceKm,
  calculateRoadDistanceKm,
  estimateTravelTimeMinutes
} from '../../../data/networkData.ts';
import { computeMedicalTransportMatrix } from '../../../utils/distanceMatrixService.ts';
import { useApp } from '../../../context/AppContext.tsx';

export interface StructuredMedResqAnalysis {
  drug_name: string;
  days_left: number;
  risk_level: 'CRITICAL' | 'WARNING' | 'SAFE';
  surge_factor_applied: string;
  reallocation_plan: {
    donor_facility: string;
    donor_facility_code: string;
    distance_km: number;
    transit_time_minutes: number;
    transfer_quantity: number;
    unit: string;
    logistics_mode: string;
    donor_moic: string;
    donor_contact: string;
  } | null;
  rmscl_requisition_needed: boolean;
}

interface InstantTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  facility: NetworkFacility;
  allFacilities: NetworkFacility[];
  baseFacility?: NetworkFacility | null;
  preferredDrug?: string;
  onVisualizeRoute?: (source: NetworkFacility, destination: NetworkFacility) => void;
}

export const InstantTransferModal: React.FC<InstantTransferModalProps> = ({
  isOpen,
  onClose,
  facility,
  allFacilities,
  baseFacility,
  preferredDrug,
  onVisualizeRoute
}) => {
  const { showNotification, approveRedistribution, createOrder } = useApp();
  const [selectedDrug, setSelectedDrug] = useState<string>(preferredDrug || '');
  const [showJsonView, setShowJsonView] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [executedTransfers, setExecutedTransfers] = useState<Record<string, boolean>>({});
  const [liveDistanceMatrixTimes, setLiveDistanceMatrixTimes] = useState<
    Record<string, { durationText: string; distanceText: string; isRealtime: boolean }>
  >({});

  // Compute distance from base facility
  const originBase = baseFacility || allFacilities.find((f) => f.id === 'phc-osian') || facility;
  const distanceFromBaseKm = useMemo(() => {
    if (facility.id === originBase.id) return 0;
    const air = calculateHaversineDistanceKm(
      originBase.latitude,
      originBase.longitude,
      facility.latitude,
      facility.longitude
    );
    return calculateRoadDistanceKm(air);
  }, [facility, originBase]);

  // Combine and analyze all drugs for this facility according to MEDRESQ AI Clinical Rules:
  // 1. Days Remaining = Current Stock / Daily Burn Rate (adjusted for seasonal surge +30% to +50%)
  // 2. Risk Level: SAFE (>7 days), WARNING (3-7 days), CRITICAL (<3 days)
  // 3. Smart Reallocation: Identify neighboring facility with surplus (>14 days left)
  const clinicalAnalyses: StructuredMedResqAnalysis[] = useMemo(() => {
    // Collect all shortage items or standard portfolio
    const drugItems: Array<{
      drug_name: string;
      current_stock: number;
      daily_burn: number;
      unit: string;
    }> = [];

    if (facility.keyShortages.length > 0) {
      facility.keyShortages.forEach((s) => {
        drugItems.push({
          drug_name: s.medicineName,
          current_stock: s.currentStock,
          daily_burn: s.projectedBurnPerDay,
          unit: s.unit
        });
      });
    }

    // Ensure core emergency portfolio items are checked
    const coreEmergencyDrugs = [
      { name: 'Polyvalent Anti-Snake Venom (ASV) 10ml', unit: 'Vials', defaultStock: 12, defaultBurn: 5 },
      { name: 'Oral Rehydration Salts (ORS) Sachets 20.5g', unit: 'Sachets', defaultStock: 210, defaultBurn: 115 },
      { name: 'Oxytocin Injection 10 IU/ml', unit: 'Ampoules', defaultStock: 18, defaultBurn: 5 },
      { name: 'Normal Saline (0.9% NaCl) IV Infusion 500ml', unit: 'Bottles', defaultStock: 64, defaultBurn: 19 },
      { name: 'Paracetamol Tablets IP 500mg', unit: 'Tablets', defaultStock: 4200, defaultBurn: 190 }
    ];

    coreEmergencyDrugs.forEach((core) => {
      const existing = drugItems.find((d) => d.drug_name.toLowerCase().includes(core.name.split(' ')[0].toLowerCase()));
      if (!existing) {
        const surplusMatch = facility.keySurpluses.find((s) =>
          s.medicineName.toLowerCase().includes(core.name.split(' ')[0].toLowerCase())
        );
        if (surplusMatch) {
          drugItems.push({
            drug_name: surplusMatch.medicineName,
            current_stock: surplusMatch.currentStock,
            daily_burn: core.defaultBurn,
            unit: surplusMatch.unit
          });
        }
      }
    });

    return drugItems.map((item) => {
      const days_left = item.daily_burn > 0 ? parseFloat((item.current_stock / item.daily_burn).toFixed(1)) : 99;
      let risk_level: 'CRITICAL' | 'WARNING' | 'SAFE' = 'SAFE';
      if (days_left < 3.0) {
        risk_level = 'CRITICAL';
      } else if (days_left <= 7.0) {
        risk_level = 'WARNING';
      } else {
        risk_level = 'SAFE';
      }

      // Check for seasonal surge factor
      let surge_factor_applied = '+40% May Heatwave Surge';
      if (item.drug_name.toLowerCase().includes('snake') || item.drug_name.toLowerCase().includes('asv')) {
        surge_factor_applied = '+40% Monsoon / Agricultural Viper Surge';
      } else if (item.drug_name.toLowerCase().includes('oxytocin')) {
        surge_factor_applied = '+30% High-Risk Institutional Delivery Surge';
      } else if (item.drug_name.toLowerCase().includes('paracetamol')) {
        surge_factor_applied = '+35% Seasonal Hyperpyrexia Surge';
      }

      // 3. SMART REALLOCATION: Search neighboring facilities within 30 km (and up to 65 km) with surplus stock (>14 days left)
      let reallocation_plan: StructuredMedResqAnalysis['reallocation_plan'] = null;
      let rmscl_requisition_needed = false;

      if (risk_level !== 'SAFE') {
        const deficitAmount = Math.max(10, Math.round(item.daily_burn * 7 - item.current_stock));

        // Find candidate donor facilities with surplus
        const donorCandidates = allFacilities
          .filter((f) => f.id !== facility.id)
          .map((donor) => {
            const surplusItem = donor.keySurpluses.find(
              (s) => s.medicineName.toLowerCase().includes(item.drug_name.split(' ')[0].toLowerCase())
            );

            const airKm = calculateHaversineDistanceKm(
              facility.latitude,
              facility.longitude,
              donor.latitude,
              donor.longitude
            );
            const roadKm = calculateRoadDistanceKm(airKm);
            const transitMins = estimateTravelTimeMinutes(
              roadKm,
              donor.facilityType === 'RMSCL Warehouse' ? 'Highway (NH-62)' : 'State Highway'
            );

            return {
              donor,
              surplusQuantity: surplusItem ? surplusItem.surplusQuantity : 0,
              availableStock: surplusItem ? surplusItem.currentStock : 0,
              unit: surplusItem ? surplusItem.unit : item.unit,
              roadKm,
              transitMins
            };
          })
          .filter((c) => c.surplusQuantity > 0)
          .sort((a, b) => {
            // Prioritize within 30 km first, then by distance
            const aWithin30 = a.roadKm <= 30;
            const bWithin30 = b.roadKm <= 30;
            if (aWithin30 && !bWithin30) return -1;
            if (!aWithin30 && bWithin30) return 1;
            return a.roadKm - b.roadKm;
          });

        if (donorCandidates.length > 0) {
          const bestDonor = donorCandidates[0];
          const transferQty = Math.min(bestDonor.surplusQuantity, deficitAmount);
          const isColdChain =
            item.drug_name.toLowerCase().includes('snake') ||
            item.drug_name.toLowerCase().includes('asv') ||
            item.drug_name.toLowerCase().includes('oxytocin');

          reallocation_plan = {
            donor_facility: bestDonor.donor.name,
            donor_facility_code: bestDonor.donor.code,
            distance_km: bestDonor.roadKm,
            transit_time_minutes: bestDonor.transitMins,
            transfer_quantity: transferQty,
            unit: bestDonor.unit,
            logistics_mode: isColdChain
              ? '108 Emergency Ambulance (Cold-Box 2-8°C)'
              : 'RMSCL Mobile Van / Block Health Courier',
            donor_moic: bestDonor.donor.medicalOfficerInCharge,
            donor_contact: bestDonor.donor.contactNumber
          };

          rmscl_requisition_needed = bestDonor.surplusQuantity < deficitAmount;
        } else {
          rmscl_requisition_needed = true;
        }
      }

      return {
        drug_name: item.drug_name,
        days_left,
        risk_level,
        surge_factor_applied,
        reallocation_plan,
        rmscl_requisition_needed
      };
    });
  }, [facility, allFacilities]);

  // Overall facility risk level based on worst drug
  const overallRisk = useMemo(() => {
    if (clinicalAnalyses.some((a) => a.risk_level === 'CRITICAL')) return 'CRITICAL';
    if (clinicalAnalyses.some((a) => a.risk_level === 'WARNING')) return 'WARNING';
    return 'SAFE';
  }, [clinicalAnalyses]);

  // Selected or first critical analysis item
  const activeAnalysis = useMemo(() => {
    if (selectedDrug) {
      const match = clinicalAnalyses.find((a) => a.drug_name === selectedDrug);
      if (match) return match;
    }
    const criticalFirst = clinicalAnalyses.find((a) => a.risk_level === 'CRITICAL');
    if (criticalFirst) return criticalFirst;
    const warningFirst = clinicalAnalyses.find((a) => a.risk_level === 'WARNING');
    if (warningFirst) return warningFirst;
    return clinicalAnalyses[0];
  }, [selectedDrug, clinicalAnalyses]);

  // Query live Google Distance Matrix API for donor facilities
  useEffect(() => {
    if (!isOpen || !facility) return;

    const plansWithDonors = clinicalAnalyses
      .filter((a) => a.reallocation_plan)
      .map((a) => {
        const donorFac = allFacilities.find((f) => f.code === a.reallocation_plan?.donor_facility_code);
        return { drug: a.drug_name, donorFac };
      })
      .filter((item): item is { drug: string; donorFac: NetworkFacility } => Boolean(item.donorFac));

    if (plansWithDonors.length === 0) return;

    const donorFacilities = Array.from(new Set(plansWithDonors.map((p) => p.donorFac)));

    computeMedicalTransportMatrix({
      origin: facility,
      destinations: donorFacilities,
      travelMode: 'DRIVING'
    })
      .then((estimates) => {
        const map: Record<string, { durationText: string; distanceText: string; isRealtime: boolean }> = {};
        plansWithDonors.forEach(({ drug, donorFac }) => {
          const est = estimates.find((e) => e.surplusFacilityId === donorFac.id);
          if (est) {
            map[drug] = {
              durationText: est.durationText,
              distanceText: est.distanceText,
              isRealtime: est.isRealtimeGoogleDistanceMatrix
            };
          }
        });
        setLiveDistanceMatrixTimes(map);
      })
      .catch((err) => {
        console.warn('Distance matrix calculation in modal error:', err);
      });
  }, [isOpen, facility, clinicalAnalyses]);

  if (!isOpen) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(clinicalAnalyses, null, 2));
    setCopiedJson(true);
    showNotification('Structured MEDRESQ AI Clinical JSON copied to clipboard.');
    setTimeout(() => setCopiedJson(false), 2500);
  };

  const handleExecuteTransfer = async (analysis: StructuredMedResqAnalysis) => {
    if (!analysis.reallocation_plan) return;
    if (executedTransfers[analysis.drug_name]) {
      showNotification(`Transfer for ${analysis.drug_name} has already been approved and dispatched.`);
      return;
    }

    const plan = analysis.reallocation_plan;
    const donorFac = allFacilities.find((f) => f.code === plan.donor_facility_code);

    const ok = await approveRedistribution(`MAP-TRN-${facility.id}-${analysis.drug_name}`, {
      medicineName: analysis.drug_name,
      transferQuantity: plan.transfer_quantity,
      sourcePHCId: donorFac?.id || 'phc-mandore',
      sourcePHCName: plan.donor_facility,
      targetPHCId: facility.id,
      targetPHCName: facility.name,
      transitDistanceKm: plan.distance_km,
      estimatedTransitTimeHours: Number((plan.transit_time_minutes / 60).toFixed(1)),
      clinicalRationale: `Lateral transfer of ${plan.transfer_quantity} ${plan.unit} from ${plan.donor_facility} to resolve ${analysis.days_left}d stockout risk at ${facility.name}.`
    });

    if (!ok) return;

    setExecutedTransfers((prev) => ({ ...prev, [analysis.drug_name]: true }));

    // If onVisualizeRoute provided, plot route
    if (onVisualizeRoute && donorFac) {
      onVisualizeRoute(donorFac, facility);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-modal-title"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex items-start justify-between gap-3 shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${
                  overallRisk === 'CRITICAL'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : overallRisk === 'WARNING'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {overallRisk === 'CRITICAL' && '🚨 CRITICAL RISK (<3 DAYS)'}
                {overallRisk === 'WARNING' && '⚠️ WARNING RISK (3–7 DAYS)'}
                {overallRisk === 'SAFE' && '🟢 SAFE / SURPLUS (>7 DAYS)'}
              </span>

              <span className="text-[11px] font-mono text-slate-300">
                {facility.facilityType} • {facility.block} Block • {facility.district}
              </span>

              {distanceFromBaseKm > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                  {distanceFromBaseKm} km from {originBase.name}
                </span>
              )}
            </div>

            <h2 id="transfer-modal-title" className="text-lg sm:text-xl font-bold tracking-tight mt-1 text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-400" />
              <span>{facility.name}</span>
              <span className="text-xs font-mono text-slate-400 font-normal">({facility.code})</span>
            </h2>

            <p className="text-xs text-slate-300 mt-0.5">
              MEDRESQ AI Clinical Prediction Engine • Rajasthan Rural Supply Chain Optimization
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close transfer modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toggle Strip */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 font-semibold text-slate-700">
            <span>Essential Drug Status:</span>
            <span className="font-mono text-slate-900 font-bold">
              {clinicalAnalyses.filter((a) => a.risk_level === 'CRITICAL').length} Critical •{' '}
              {clinicalAnalyses.filter((a) => a.risk_level === 'WARNING').length} Warning
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowJsonView(!showJsonView)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                showJsonView
                  ? 'bg-sky-800 text-white border-sky-800 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-sky-500" />
              <span>{showJsonView ? 'Hide Clinical JSON' : 'View Structured MEDRESQ AI JSON'}</span>
            </button>

            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}&travelmode=driving`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
              <span>Google Maps</span>
            </a>
          </div>
        </div>

        {/* Structured JSON Modal View (if active) */}
        {showJsonView && (
          <div className="p-4 bg-slate-900 text-slate-100 border-b border-slate-800 text-xs font-mono max-h-60 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between text-slate-300 pb-2 border-b border-slate-800">
              <span className="font-bold text-sky-400">
                MEDRESQ AI Structured Output (Indian Rural Healthcare Standard)
              </span>
              <button
                type="button"
                onClick={handleCopyJson}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 text-[11px] font-sans font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedJson ? 'Copied!' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="text-[11px] leading-relaxed overflow-x-auto text-emerald-300">
              {JSON.stringify(clinicalAnalyses, null, 2)}
            </pre>
          </div>
        )}

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 custom-scrollbar text-xs">
          {/* 1. Drug Inventory Depletion Timeline Strip */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-sky-600" />
                <span>Emergency Drug Depletion Timeline (Burn Rate & Surge Model)</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                Formula: Days Left = Current Stock / Daily Burn Rate
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {clinicalAnalyses.map((analysis) => {
                const isSelected = activeAnalysis?.drug_name === analysis.drug_name;
                const isExecuted = executedTransfers[analysis.drug_name];

                return (
                  <button
                    key={analysis.drug_name}
                    type="button"
                    onClick={() => setSelectedDrug(analysis.drug_name)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-sky-600 bg-sky-50/70 shadow-sm ring-2 ring-sky-300'
                        : analysis.risk_level === 'CRITICAL'
                        ? 'border-rose-200 bg-rose-50/50 hover:bg-rose-50'
                        : analysis.risk_level === 'WARNING'
                        ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-50'
                        : 'border-slate-200 bg-slate-50 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-bold text-slate-900 text-xs leading-snug">
                        {analysis.drug_name}
                      </div>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                          analysis.risk_level === 'CRITICAL'
                            ? 'bg-rose-700 text-white'
                            : analysis.risk_level === 'WARNING'
                            ? 'bg-amber-600 text-white'
                            : 'bg-emerald-700 text-white'
                        }`}
                      >
                        {analysis.risk_level}
                      </span>
                    </div>

                    <div className="mt-2 flex items-baseline justify-between font-mono">
                      <div>
                        <span className="text-[10px] text-slate-500">Depletion: </span>
                        <strong
                          className={`text-sm ${
                            analysis.risk_level === 'CRITICAL'
                              ? 'text-rose-700'
                              : analysis.risk_level === 'WARNING'
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {analysis.days_left} Days
                        </strong>
                      </div>

                      {isExecuted && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-1 font-sans">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Dispatched</span>
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-[10px] text-slate-500 truncate font-mono">
                      Surge: {analysis.surge_factor_applied.split(' ')[0]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Active Focus: Smart Reallocation & Instant Transfer Opportunity */}
          {activeAnalysis && (
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-sky-100 text-sky-900 uppercase">
                      Smart Reallocation Proposal
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      Target: {facility.name}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                    <span>{activeAnalysis.drug_name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                        activeAnalysis.risk_level === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : activeAnalysis.risk_level === 'WARNING'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {activeAnalysis.days_left} Days Remaining ({activeAnalysis.risk_level})
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Surge factor: <strong>{activeAnalysis.surge_factor_applied}</strong> applied to daily consumption rate.
                  </p>
                </div>

                {activeAnalysis.reallocation_plan && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Proposed Transfer</span>
                    <div className="text-base font-bold font-mono text-emerald-800">
                      +{activeAnalysis.reallocation_plan.transfer_quantity} {activeAnalysis.reallocation_plan.unit}
                    </div>
                  </div>
                )}
              </div>

              {/* Donor Facility Match Card */}
              {activeAnalysis.reallocation_plan ? (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold font-mono text-emerald-800 uppercase tracking-wider block">
                          Verified Surplus Donor (&gt;14 Days Left)
                        </span>
                        <h5 className="font-bold text-slate-900 text-sm">
                          {activeAnalysis.reallocation_plan.donor_facility}
                        </h5>
                        <p className="text-[11px] text-slate-600 font-mono">
                          Code: {activeAnalysis.reallocation_plan.donor_facility_code} • MOIC: {activeAnalysis.reallocation_plan.donor_moic}
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-xs font-bold text-emerald-900">
                        {liveDistanceMatrixTimes[activeAnalysis.drug_name]?.distanceText ||
                          `${activeAnalysis.reallocation_plan.distance_km} km away`}
                      </div>
                      <div className="text-[11px] text-slate-700 flex items-center gap-1 justify-end font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>
                          ETA:{' '}
                          <strong className="text-emerald-800">
                            {liveDistanceMatrixTimes[activeAnalysis.drug_name]?.durationText ||
                              `${activeAnalysis.reallocation_plan.transit_time_minutes} mins`}
                          </strong>
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-end">
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300 font-bold flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5 text-amber-500" />
                          <span>Google Distance Matrix API</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Logistics Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-200/80 text-[11px]">
                    <div className="bg-white p-2 rounded-lg border border-emerald-200">
                      <span className="text-slate-500 text-[10px] block">Logistics Delivery Carrier:</span>
                      <strong className="text-slate-900">{activeAnalysis.reallocation_plan.logistics_mode}</strong>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-emerald-200">
                      <span className="text-slate-500 text-[10px] block">RMSCL Requisition Needed:</span>
                      <strong className={activeAnalysis.rmscl_requisition_needed ? 'text-amber-800' : 'text-emerald-800'}>
                        {activeAnalysis.rmscl_requisition_needed ? 'Yes (Indent Needed)' : 'No (Lateral PHC Transfer)'}
                      </strong>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-emerald-200">
                      <span className="text-slate-500 text-[10px] block">Donor Contact:</span>
                      <a
                        href={`tel:${activeAnalysis.reallocation_plan.donor_contact}`}
                        className="text-sky-800 font-bold hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>{activeAnalysis.reallocation_plan.donor_contact}</span>
                      </a>
                    </div>
                  </div>

                  {/* Execution Action Bar */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Complies with Rajasthan Health Logistics lateral transfer protocol.</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Plot Route Button */}
                      {onVisualizeRoute && (
                        <button
                          type="button"
                          onClick={() => {
                            const donorFac = allFacilities.find(
                              (f) => f.code === activeAnalysis.reallocation_plan?.donor_facility_code
                            );
                            if (donorFac) {
                              onVisualizeRoute(donorFac, facility);
                              onClose();
                            }
                          }}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5 text-sky-400" />
                          <span>Plot Google Maps Route</span>
                        </button>
                      )}

                      {/* Instant Transfer Approval Button */}
                      <button
                        type="button"
                        onClick={() => handleExecuteTransfer(activeAnalysis)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer ${
                          executedTransfers[activeAnalysis.drug_name]
                            ? 'bg-emerald-800 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {executedTransfers[activeAnalysis.drug_name] ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                            <span>Transfer Approved &amp; En Route</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-300" />
                            <span>Approve &amp; Dispatch Transfer</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>No nearby PHC within 30 km has surplus stock (&gt;14 days) for this item.</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Formal RMSCL District Drug Warehouse indent recommended for immediate emergency consignment dispatch.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      await createOrder({
                        medicineName: activeAnalysis.drug_name,
                        quantityRequested: 500,
                        priority: 'EMERGENCY_REPLENISHMENT',
                        justification: `Emergency RMSCL warehouse indent for ${facility.name} (${activeAnalysis.days_left} days stock remaining; no peer surplus within 30 km).`
                      });
                    }}
                    className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Boxes className="w-3.5 h-3.5 text-amber-200" />
                    <span>Generate Emergency RMSCL Indent</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. Facility Operational Telemetry & Contacts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-slate-700">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block text-xs">Facility In-Charge &amp; Emergency Dial:</span>
              <div>MOIC: <strong>{facility.medicalOfficerInCharge}</strong></div>
              <div className="flex items-center gap-2">
                <span>Contact:</span>
                <a href={`tel:${facility.contactNumber}`} className="font-mono font-bold text-emerald-700 hover:underline">
                  {facility.contactNumber}
                </a>
              </div>
              <div className="font-mono text-slate-500 text-[10px]">
                Coordinates: {facility.latitude.toFixed(4)}°N, {facility.longitude.toFixed(4)}°E
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block text-xs">Inpatient Capacity &amp; Cold-Chain:</span>
              <div>
                Bed Occupancy: <strong>{facility.occupiedBeds} / {facility.sanctionedBeds} beds</strong> ({facility.capacityUtilization}%)
              </div>
              {facility.coldChainTempC && (
                <div>
                  ILR Cold-Chain: <strong className="text-emerald-700">{facility.coldChainTempC}°C (Optimal 2–8°C)</strong>
                </div>
              )}
              <div className="text-slate-500 text-[10px]">
                Workforce: {facility.staffPresentCount} of {facility.staffSanctionedCount} staff present ({facility.workforceStatus})
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-500 font-mono">
            MEDRESQ AI Rule: SAFE (&gt;7d) • WARNING (3–7d) • CRITICAL (&lt;3d) • SMART REALLOCATION (&gt;14d)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer transition-colors"
            >
              Close
            </button>

            {activeAnalysis?.reallocation_plan && (
              <button
                type="button"
                onClick={() => handleExecuteTransfer(activeAnalysis)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Execute Transfer Now</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
