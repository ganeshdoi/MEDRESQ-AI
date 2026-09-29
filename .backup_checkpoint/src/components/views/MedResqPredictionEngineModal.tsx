import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  Truck,
  Flame,
  CloudRain,
  ShieldCheck,
  Copy,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  MapPin,
  ChevronRight,
  FileCode,
  Sliders,
  Send,
  Building2,
  HelpCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { PHCFacility } from '../../types.ts';

interface MedResqPredictionItem {
  drug_name: string;
  days_left: number;
  risk_level: 'SAFE' | 'WARNING' | 'CRITICAL';
  surge_factor_applied: string;
  reallocation_plan: {
    source_facility: string;
    distance_km: number;
    contact?: string;
    donor_current_stock?: number;
    donor_days_left?: number;
    transfer_amount: number;
    unit: string;
    delivery_vehicle: string;
    estimated_transit_time_minutes: number;
    logistics_mode: string;
  } | null;
  rmscl_requisition_needed: {
    requisition_required: boolean;
    indent_type: string;
    recommended_quantity: number;
    unit: string;
    source_depot: string;
    portal: string;
    urgency: string;
  } | null;
}

interface MedResqEngineProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFacility?: PHCFacility;
}

export const MedResqPredictionEngineModal: React.FC<MedResqEngineProps> = ({
  isOpen,
  onClose,
  defaultFacility
}) => {
  const { selectedPHC, facilities, showNotification, createOrder } = useApp();

  const activePHC = defaultFacility || selectedPHC;

  // Seasonal surge states
  const [selectedSeason, setSelectedSeason] = useState<'heatwave' | 'monsoon' | 'baseline'>('heatwave');
  const [surgePercent, setSurgePercent] = useState<number>(45);
  const [showJsonView, setShowJsonView] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Editable inventory for key emergency drugs
  const [inventoryState, setInventoryState] = useState([
    {
      drug_name: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
      current_stock: 210,
      daily_burn_rate: 58,
      unit: 'Sachets',
      surge_applicable: true
    },
    {
      drug_name: 'Normal Saline (0.9% NaCl) IV Infusion 500ml',
      current_stock: 64,
      daily_burn_rate: 16,
      unit: 'Bottles',
      surge_applicable: true
    },
    {
      drug_name: 'Polyvalent Anti-Snake Venom (ASV) 10ml',
      current_stock: 8,
      daily_burn_rate: 2,
      unit: 'Vials',
      surge_applicable: true
    },
    {
      drug_name: 'Oxytocin Injection IP 10 IU/ml',
      current_stock: 45,
      daily_burn_rate: 5,
      unit: 'Ampoules',
      surge_applicable: false
    },
    {
      drug_name: 'Paracetamol IV Infusion 100ml / 500mg',
      current_stock: 120,
      daily_burn_rate: 25,
      unit: 'Vials',
      surge_applicable: true
    }
  ]);

  // Nearby facilities within 30 km radius
  const nearbyFacilities = [
    {
      facility_name: 'CHC Baori',
      distance_km: 18.4,
      contact: '+91 2928 233044',
      stocks: {
        'Oral Rehydration Salts (ORS) Sachets 20.5g': { current_stock: 3200, daily_burn_rate: 45, unit: 'Sachets' },
        'Normal Saline (0.9% NaCl) IV Infusion 500ml': { current_stock: 900, daily_burn_rate: 18, unit: 'Bottles' },
        'Polyvalent Anti-Snake Venom (ASV) 10ml': { current_stock: 42, daily_burn_rate: 1.5, unit: 'Vials' },
        'Oxytocin Injection IP 10 IU/ml': { current_stock: 160, daily_burn_rate: 4, unit: 'Ampoules' },
        'Paracetamol IV Infusion 100ml / 500mg': { current_stock: 450, daily_burn_rate: 12, unit: 'Vials' }
      }
    },
    {
      facility_name: 'PHC Tinwari',
      distance_km: 24.1,
      contact: '+91 2927 241030',
      stocks: {
        'Oral Rehydration Salts (ORS) Sachets 20.5g': { current_stock: 800, daily_burn_rate: 20, unit: 'Sachets' },
        'Normal Saline (0.9% NaCl) IV Infusion 500ml': { current_stock: 180, daily_burn_rate: 10, unit: 'Bottles' },
        'Polyvalent Anti-Snake Venom (ASV) 10ml': { current_stock: 14, daily_burn_rate: 0.8, unit: 'Vials' },
        'Oxytocin Injection IP 10 IU/ml': { current_stock: 50, daily_burn_rate: 2, unit: 'Ampoules' },
        'Paracetamol IV Infusion 100ml / 500mg': { current_stock: 140, daily_burn_rate: 8, unit: 'Vials' }
      }
    },
    {
      facility_name: 'PHC Mandore',
      distance_km: 28.6,
      contact: '+91 291 2570889',
      stocks: {
        'Oral Rehydration Salts (ORS) Sachets 20.5g': { current_stock: 2150, daily_burn_rate: 22, unit: 'Sachets' },
        'Normal Saline (0.9% NaCl) IV Infusion 500ml': { current_stock: 520, daily_burn_rate: 8, unit: 'Bottles' },
        'Polyvalent Anti-Snake Venom (ASV) 10ml': { current_stock: 25, daily_burn_rate: 0.5, unit: 'Vials' },
        'Oxytocin Injection IP 10 IU/ml': { current_stock: 95, daily_burn_rate: 3, unit: 'Ampoules' },
        'Paracetamol IV Infusion 100ml / 500mg': { current_stock: 310, daily_burn_rate: 10, unit: 'Vials' }
      }
    }
  ];

  // Calculated predictions adhering directly to output rules
  const [predictions, setPredictions] = useState<MedResqPredictionItem[]>([]);

  const runPredictionCalculation = () => {
    setIsLoading(true);

    setTimeout(() => {
      const calculated: MedResqPredictionItem[] = inventoryState.map((item) => {
        let surgeMultiplier = 1.0;
        let surgeDescription = 'None (0% surge - baseline)';

        if (selectedSeason === 'heatwave') {
          const isHeatImpacted = /ORS|Saline|Fluid|Ringer|Paracetamol/i.test(item.drug_name);
          if (isHeatImpacted) {
            surgeMultiplier = 1 + surgePercent / 100;
            surgeDescription = `+${surgePercent}% (May Heatwave Acute Dehydration Surge applied)`;
          }
        } else if (selectedSeason === 'monsoon') {
          const isMonsoonImpacted = /Venom|Paracetamol|Saline/i.test(item.drug_name);
          if (isMonsoonImpacted) {
            surgeMultiplier = 1 + surgePercent / 100;
            surgeDescription = `+${surgePercent}% (Post-Monsoon Snakebite & Dengue Surge applied)`;
          }
        }

        const adjustedDailyBurn = item.daily_burn_rate * surgeMultiplier;
        const daysLeft = Number((item.current_stock / (adjustedDailyBurn || 1)).toFixed(1));

        // Risk Level: SAFE (>7 days left), WARNING (3–7 days left), CRITICAL (<3 days left)
        let riskLevel: 'SAFE' | 'WARNING' | 'CRITICAL' = 'SAFE';
        if (daysLeft < 3.0) {
          riskLevel = 'CRITICAL';
        } else if (daysLeft <= 7.0) {
          riskLevel = 'WARNING';
        } else {
          riskLevel = 'SAFE';
        }

        // SMART REALLOCATION: Neighbor with surplus stock (>14 days left) within 30 km radius
        let reallocationPlan: MedResqPredictionItem['reallocation_plan'] = null;
        let rmsclRequisition: MedResqPredictionItem['rmscl_requisition_needed'] = null;

        if (riskLevel === 'CRITICAL' || riskLevel === 'WARNING') {
          let donorCandidate: any = null;
          let bestDays = 14;

          for (const neighbor of nearbyFacilities) {
            const stockInfo = (neighbor.stocks as any)[item.drug_name];
            if (stockInfo) {
              const neighborDays = stockInfo.current_stock / (stockInfo.daily_burn_rate || 1);
              if (neighborDays > 14 && neighborDays > bestDays) {
                bestDays = neighborDays;
                const surplusAbove14Days = Math.max(0, Math.floor(stockInfo.current_stock - (stockInfo.daily_burn_rate * 14)));
                const deficitFor7DaysSafe = Math.max(0, Math.ceil((adjustedDailyBurn * 7) - item.current_stock));
                const transferAmount = Math.min(surplusAbove14Days, Math.max(deficitFor7DaysSafe, Math.ceil(adjustedDailyBurn * 4)));

                if (transferAmount > 0) {
                  donorCandidate = {
                    source_facility: neighbor.facility_name,
                    distance_km: neighbor.distance_km,
                    contact: neighbor.contact,
                    donor_current_stock: stockInfo.current_stock,
                    donor_days_left: Number(neighborDays.toFixed(1)),
                    transfer_amount: transferAmount,
                    unit: item.unit,
                    delivery_vehicle: neighbor.distance_km <= 20 ? '104 Janani / Health Logistics Van' : 'Dial 108 Emergency Logistics Courier',
                    estimated_transit_time_minutes: Math.round(neighbor.distance_km * 1.5 + 8),
                    logistics_mode: 'Inter-PHC Lateral Emergency Loan (Form 14-B signed by MOIC)'
                  };
                }
              }
            }
          }

          if (donorCandidate) {
            reallocationPlan = donorCandidate;
          }

          const target14Days = Math.ceil(adjustedDailyBurn * 14);
          const reqQty = Math.max(0, target14Days - item.current_stock);
          rmsclRequisition = {
            requisition_required: true,
            indent_type: riskLevel === 'CRITICAL' ? 'EMERGENCY_SPECIAL_INDENT' : 'FAST_TRACK_MONTHLY_INDENT',
            recommended_quantity: reqQty,
            unit: item.unit,
            source_depot: 'District Drug Warehouse Mandore (RMSCL Jodhpur)',
            portal: 'e-Aushadhi Rajasthan NHM Portal',
            urgency: riskLevel === 'CRITICAL' ? 'DISPATCH_WITHIN_12_HOURS' : 'DISPATCH_WITHIN_48_HOURS'
          };
        } else {
          rmsclRequisition = {
            requisition_required: false,
            indent_type: 'ROUTINE_CYCLE',
            recommended_quantity: 0,
            unit: item.unit,
            source_depot: 'District Drug Warehouse Mandore (RMSCL)',
            portal: 'e-Aushadhi Rajasthan',
            urgency: 'MONITOR_REGULAR_INDENT_CYCLE'
          };
        }

        return {
          drug_name: item.drug_name,
          days_left: daysLeft,
          risk_level: riskLevel,
          surge_factor_applied: surgeDescription,
          reallocation_plan: reallocationPlan,
          rmscl_requisition_needed: rmsclRequisition
        };
      });

      setPredictions(calculated);
      setIsLoading(false);
    }, 200);
  };

  useEffect(() => {
    if (isOpen) {
      runPredictionCalculation();
    }
  }, [isOpen, selectedSeason, surgePercent]);

  if (!isOpen) return null;

  const structuredJsonOutput = JSON.stringify(predictions, null, 2);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(structuredJsonOutput);
    setCopiedJson(true);
    showNotification('Structured MEDRESQ AI predictions copied to clipboard');
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleTriggerReallocation = (pred: MedResqPredictionItem) => {
    if (!pred.reallocation_plan) return;
    showNotification(
      `Dispatched Lateral Reallocation: ${pred.reallocation_plan.transfer_amount} ${pred.reallocation_plan.unit} of ${pred.drug_name.split(' ')[0]} via ${pred.reallocation_plan.delivery_vehicle} from ${pred.reallocation_plan.source_facility}. Form 14-B generated.`
    );
  };

  const handleTriggerIndent = (pred: MedResqPredictionItem) => {
    if (!pred.rmscl_requisition_needed) return;
    createOrder({
      medicineName: pred.drug_name,
      quantityRequested: pred.rmscl_requisition_needed.recommended_quantity,
      priority: pred.risk_level === 'CRITICAL' ? 'EMERGENCY_REPLENISHMENT' : 'URGENT',
      justification: `Automated MEDRESQ AI indent: ${pred.days_left} days left under ${pred.surge_factor_applied}.`
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="medresq-engine-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="medresq-engine-title" className="text-base font-bold tracking-tight text-white">
                  MEDRESQ AI Clinical Supply Chain Prediction Engine
                </h2>
                <span className="text-[10px] font-mono uppercase bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded font-bold border border-indigo-400/30">
                  NHM Rajasthan Standard
                </span>
              </div>
              <p className="text-xs text-indigo-200/80">
                Pre-emptive stockout triage, seasonal surge depletion modeling, and 30 km radius lateral reallocation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowJsonView(!showJsonView)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                showJsonView
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-xs'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{showJsonView ? 'Visual Cards' : 'Structured JSON'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Facility & Context Strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-bold text-slate-800">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Target Facility:</span>
            </span>
            <span className="font-semibold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200 shadow-2xs">
              {activePHC.name} ({activePHC.district}, Rajasthan)
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600">
              Nearby PHCs within <strong>30 km</strong>: CHC Baori (18.4 km), PHC Tinwari (24.1 km), PHC Mandore (28.6 km)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600">Burn Rate Surge:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setSelectedSeason('heatwave');
                  setSurgePercent(45);
                }}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  selectedSeason === 'heatwave'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>May Heatwave (+45%)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedSeason('monsoon');
                  setSurgePercent(50);
                }}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  selectedSeason === 'monsoon'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CloudRain className="w-3.5 h-3.5" />
                <span>Post-Monsoon (+50%)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedSeason('baseline');
                  setSurgePercent(0);
                }}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  selectedSeason === 'baseline'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Baseline (0%)
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {showJsonView ? (
            /* Structured JSON Format Output */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
                    Official Output Format Specification
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-mono font-semibold">
                    Keys: drug_name • days_left • risk_level • surge_factor_applied • reallocation_plan • rmscl_requisition_needed
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied JSON</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Structured JSON</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner max-h-[500px] leading-relaxed">
                {structuredJsonOutput}
              </pre>
            </div>
          ) : (
            /* Visual Actionable Dashboard Cards */
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">
                      Critical (&lt;3 Days Buffer)
                    </span>
                    <div className="text-2xl font-bold font-mono text-red-950 mt-1">
                      {predictions.filter(p => p.risk_level === 'CRITICAL').length} Drugs
                    </div>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500 opacity-80" />
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                      Warning (3–7 Days Buffer)
                    </span>
                    <div className="text-2xl font-bold font-mono text-amber-950 mt-1">
                      {predictions.filter(p => p.risk_level === 'WARNING').length} Drugs
                    </div>
                  </div>
                  <Clock className="w-8 h-8 text-amber-500 opacity-80" />
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                      Safe (&gt;7 Days Buffer)
                    </span>
                    <div className="text-2xl font-bold font-mono text-emerald-950 mt-1">
                      {predictions.filter(p => p.risk_level === 'SAFE').length} Drugs
                    </div>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-80" />
                </div>
              </div>

              {/* Drug Rows */}
              <div className="space-y-3">
                {predictions.map((pred) => {
                  const isCritical = pred.risk_level === 'CRITICAL';
                  const isWarning = pred.risk_level === 'WARNING';

                  const badgeClass = isCritical
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : isWarning
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300';

                  return (
                    <div
                      key={pred.drug_name}
                      className={`rounded-xl border p-4 transition-all bg-white shadow-2xs hover:shadow-xs ${
                        isCritical
                          ? 'border-red-300/80 ring-1 ring-red-200'
                          : isWarning
                          ? 'border-amber-300/80 ring-1 ring-amber-200'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">
                              {pred.drug_name}
                            </h3>
                            <span
                              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-bold border ${badgeClass}`}
                            >
                              {pred.risk_level} ({pred.days_left} Days Left)
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                            <span>
                              Depletion Surge Factor:{' '}
                              <strong className="text-slate-700 font-mono">
                                {pred.surge_factor_applied}
                              </strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start md:self-auto">
                          {pred.reallocation_plan && (
                            <button
                              type="button"
                              onClick={() => handleTriggerReallocation(pred)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              <span>Execute Reallocation</span>
                            </button>
                          )}
                          {pred.rmscl_requisition_needed?.requisition_required && (
                            <button
                              type="button"
                              onClick={() => handleTriggerIndent(pred)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>RMSCL Indent</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Detail Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-1 text-xs">
                        {/* Reallocation Strategy */}
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                          <span className="font-bold text-slate-700 flex items-center gap-1 mb-1.5 text-[11px] uppercase tracking-wider">
                            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Smart Reallocation Plan (within 30 km)</span>
                          </span>

                          {pred.reallocation_plan ? (
                            <div className="space-y-1 text-slate-600">
                              <p>
                                <strong>Source Facility:</strong>{' '}
                                <span className="text-slate-900 font-semibold">
                                  {pred.reallocation_plan.source_facility}
                                </span>{' '}
                                ({pred.reallocation_plan.distance_km} km away, ~{pred.reallocation_plan.estimated_transit_time_minutes} mins)
                              </p>
                              <p>
                                <strong>Transfer Amount:</strong>{' '}
                                <span className="text-indigo-700 font-bold font-mono">
                                  +{pred.reallocation_plan.transfer_amount} {pred.reallocation_plan.unit}
                                </span>{' '}
                                (Donor surplus buffer: {pred.reallocation_plan.donor_days_left} days)
                              </p>
                              <p className="text-[11px] text-slate-500">
                                <strong>Logistics Vehicle:</strong> {pred.reallocation_plan.delivery_vehicle} • {pred.reallocation_plan.logistics_mode}
                              </p>
                            </div>
                          ) : (
                            <p className="text-slate-500 italic">
                              Stock level safe (&gt;7 days). No emergency lateral reallocation required.
                            </p>
                          )}
                        </div>

                        {/* RMSCL Requisition */}
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                          <span className="font-bold text-slate-700 flex items-center gap-1 mb-1.5 text-[11px] uppercase tracking-wider">
                            <Truck className="w-3.5 h-3.5 text-slate-700" />
                            <span>RMSCL e-Aushadhi Requisition Plan</span>
                          </span>

                          {pred.rmscl_requisition_needed?.requisition_required ? (
                            <div className="space-y-1 text-slate-600">
                              <p>
                                <strong>Recommended Requisition:</strong>{' '}
                                <span className="text-slate-900 font-bold font-mono">
                                  {pred.rmscl_requisition_needed.recommended_quantity} {pred.rmscl_requisition_needed.unit}
                                </span>{' '}
                                ({pred.rmscl_requisition_needed.indent_type})
                              </p>
                              <p>
                                <strong>Fulfillment Hub:</strong> {pred.rmscl_requisition_needed.source_depot}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                <strong>SLA Urgency:</strong>{' '}
                                <span className="text-red-700 font-bold">
                                  {pred.rmscl_requisition_needed.urgency}
                                </span>{' '}
                                via {pred.rmscl_requisition_needed.portal}
                              </p>
                            </div>
                          ) : (
                            <p className="text-slate-500 italic">
                              Routine replenishment buffer adequate. Maintain standard monthly indent cycle.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Calculated via MEDRESQ AI Clinical Prediction Engine • Rajasthan Health System Compliant
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyJson}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
