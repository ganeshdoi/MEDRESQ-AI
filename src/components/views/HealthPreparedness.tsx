import React, { useState, useMemo } from 'react';
import {
  CloudSun,
  Thermometer,
  CloudRain,
  Wind,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  Send,
  Building2,
  Truck,
  Pill,
  Calculator,
  Info,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sliders,
  ShieldAlert,
  ArrowRightLeft,
  Check,
  BarChart3,
  FileDown,
  Loader2,
  HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { useApp } from '../../context/AppContext.tsx';
import { StatusBadge } from '../ui/StatusBadge.tsx';
import { OrderModal } from '../ui/OrderModal.tsx';
import { PredictiveConsumptionTrend } from './PredictiveConsumptionTrend.tsx';
import { generatePreparednessPdf } from '../../utils/generatePreparednessPdf.ts';
import { WhyThisAlertModal, AlertMathBreakdown } from '../ui/WhyThisAlertModal.tsx';

interface ScenarioPreset {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  temp: number;
  humidity: number;
  footfall: number;
  leadTimeDays: number;
  description: string;
}

const SCENARIOS: ScenarioPreset[] = [
  {
    id: 'current-orange',
    name: 'Current: IMD Orange Alert Heatwave',
    badge: 'ORANGE ALERT',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    temp: 44.8,
    humidity: 17,
    footfall: 295,
    leadTimeDays: 3.5,
    description: 'IMD Level-3 advisory: Severe desert heatwave across Jodhpur/Osian block with 44.8°C (+4.2°C anomaly) and dry dust-bearing winds.'
  },
  {
    id: 'peak-red',
    name: 'Escalated: Level-4 Severe Red Alert',
    badge: 'RED ALERT',
    badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
    temp: 47.0,
    humidity: 12,
    footfall: 350,
    leadTimeDays: 4.0,
    description: 'Catastrophic desert heat spike: Extreme temperatures exceeding 47°C, severe sandstorm, critical dehydration caseload (+120%).'
  },
  {
    id: 'baseline-relief',
    name: 'Post-Disturbance Moderation (Baseline)',
    badge: 'NORMAL SUMMER',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    temp: 39.5,
    humidity: 38,
    footfall: 180,
    leadTimeDays: 3.0,
    description: 'Western disturbance cloud cover: Temperatures ease to 39.5°C, humidity recovers, routine patient volume.'
  }
];

export const HealthPreparedness: React.FC = () => {
  const {
    weather,
    medicines,
    selectedPHC,
    orders,
    redistributions,
    showNotification,
    createOrder,
    approveRedistribution,
    setActiveModule
  } = useApp();

  // Active Simulation Controls
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('current-orange');
  const [customTemp, setCustomTemp] = useState<number>(44.8);
  const [customHumidity, setCustomHumidity] = useState<number>(17);
  const [customFootfall, setCustomFootfall] = useState<number>(295);
  const [customLeadTime, setCustomLeadTime] = useState<number>(3.5);
  const [showAdvancedControls, setShowAdvancedControls] = useState<boolean>(false);

  // Expanded Alert Reasoning Accordion
  const [expandedReasoning, setExpandedReasoning] = useState<string | null>('ors-alert');

  // Checklist Actions
  const [completedActions, setCompletedActions] = useState<string[]>([
    'Inspect cold-chain deep freezers for ice-pack storage',
    'Set up shaded emergency hydration triage corner with clean drinking water'
  ]);
  const [alertDispatched, setAlertDispatched] = useState<boolean>(false);

  // Order Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [orderModalData, setOrderModalData] = useState<{
    medicineName: string;
    quantity: number;
    priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY_REPLENISHMENT';
    justification: string;
  }>({
    medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
    quantity: 1000,
    priority: 'EMERGENCY_REPLENISHMENT',
    justification: 'Heatwave surge emergency reorder. Physical stock below lead-time depletion threshold.'
  });

  // Apply a Scenario Preset
  const handleSelectScenario = (scenario: ScenarioPreset) => {
    setSelectedScenarioId(scenario.id);
    setCustomTemp(scenario.temp);
    setCustomHumidity(scenario.humidity);
    setCustomFootfall(scenario.footfall);
    setCustomLeadTime(scenario.leadTimeDays);
    showNotification(`Simulation updated to: ${scenario.name}`);
  };

  // Toggle Action Checklist
  const toggleAction = (action: string) => {
    if (completedActions.includes(action)) {
      setCompletedActions((prev) => prev.filter((a) => a !== action));
    } else {
      setCompletedActions((prev) => [...prev, action]);
      showNotification(`Action logged & verified: "${action}"`);
    }
  };

  // Broadcast Alert to Field ANMs/ASHAs
  const handleBroadcastAlert = () => {
    setAlertDispatched(true);
    showNotification(
      'Administrative Advisory Broadcast: Heatwave clinical protocols & dehydration kits dispatched to all 8 Sub-Centres.'
    );
  };

  // -------------------------------------------------------------
  // TRANSPARENT PREPAREDNESS-RISK MATHEMATICAL MODEL
  // -------------------------------------------------------------
  // Baseline benchmarks: Normal summer non-surge baseline is 40.5°C, 35% humidity, 180 patients/day
  const BASELINE_TEMP = 40.5;
  const BASELINE_HUMIDITY = 35;
  const BASELINE_FOOTFALL = 180;

  // 1. Weather Heat Anomaly & Environmental Surge Multiplier (E_w)
  // Higher temp and lower humidity accelerate insensible perspiration and fluid loss.
  const tempAnomaly = Math.max(0, customTemp - BASELINE_TEMP);
  const humidityPenalty = Math.max(0, (BASELINE_HUMIDITY - customHumidity) / 100);
  const environmentalSurgeFactor = 1 + (tempAnomaly / 10) * 0.75 + humidityPenalty * 0.45;

  // 2. Patient Footfall Surge Ratio (W_f)
  const footfallRatio = customFootfall / BASELINE_FOOTFALL;
  // Estimated portion of patients presenting with heat-related dehydration or gastrointestinal fluid loss
  const heatSyndromicShare = Math.min(0.55, 0.15 + (tempAnomaly / 10) * 0.35 + (footfallRatio - 1) * 0.2);

  // Calculate live calculations for core formulary items
  const suppliesAnalysis = useMemo(() => {
    const targets = [
      {
        id: 'med-ors-osian',
        name: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
        shortName: 'ORS Sachets',
        unit: 'sachets',
        category: 'Fluids & Electrolytes',
        historicalBaseBurn: 45, // normal day burn
        surgeMultiplier: 2.3, // heatwave clinical elasticity
        criticalBufferMin: 250,
        linkedRedistId: 'REDIST-2026-01'
      },
      {
        id: 'med-ns-osian',
        name: 'Normal Saline (0.9% NaCl) IV Infusion 500ml',
        shortName: 'Normal Saline (0.9%)',
        unit: 'bottles',
        category: 'Intravenous Resuscitation',
        historicalBaseBurn: 6,
        surgeMultiplier: 2.8,
        criticalBufferMin: 50,
        linkedRedistId: 'REDIST-2026-02'
      },
      {
        id: 'med-rl-osian',
        name: 'Ringer Lactate Injection 500ml',
        shortName: 'Ringer Lactate (RL)',
        unit: 'bottles',
        category: 'Intravenous Resuscitation',
        historicalBaseBurn: 5,
        surgeMultiplier: 2.6,
        criticalBufferMin: 40,
        linkedRedistId: null
      },
      {
        id: 'med-pcm-osian',
        name: 'Paracetamol Tablets IP 500mg',
        shortName: 'Paracetamol 500mg',
        unit: 'tablets',
        category: 'Antipyretics',
        historicalBaseBurn: 110,
        surgeMultiplier: 1.35,
        criticalBufferMin: 800,
        linkedRedistId: null
      },
      {
        id: 'med-zn-osian',
        name: 'Zinc Sulfate Dispersible Tablets 20mg',
        shortName: 'Zinc Sulfate 20mg',
        unit: 'tablets',
        category: 'Pediatric Care',
        historicalBaseBurn: 25,
        surgeMultiplier: 1.7,
        criticalBufferMin: 150,
        linkedRedistId: null
      }
    ];

    return targets.map((item) => {
      const liveMed = medicines.find((m) => m.id === item.id) || {
        currentStock: item.criticalBufferMin,
        dailyConsumption: item.historicalBaseBurn,
        pendingOrders: 0
      };

      // Current logged consumption
      const currentBurn = liveMed.dailyConsumption;

      // Weather & Footfall Projected Surge Burn:
      // Form: BaseBurn * (1 + (environmentalSurgeFactor - 1) * surgeMultiplier) * (footfallRatio * 0.7 + 0.3)
      const projectedDailyBurn = Math.max(
        item.historicalBaseBurn,
        Math.round(
          item.historicalBaseBurn *
            (1 + (environmentalSurgeFactor - 1) * (item.surgeMultiplier - 1) * 1.5) *
            (footfallRatio * 0.75 + 0.25)
        )
      );

      // Days of safe stock remaining
      const effectiveStock = liveMed.currentStock + liveMed.pendingOrders;
      const daysOfSafeStock =
        projectedDailyBurn > 0 ? parseFloat((effectiveStock / projectedDailyBurn).toFixed(1)) : 99.9;

      // Deficit before Mandore warehouse truck arrives
      const deficitDays = parseFloat((customLeadTime - daysOfSafeStock).toFixed(1));
      const projectedDeficitUnits =
        deficitDays > 0 ? Math.round(deficitDays * projectedDailyBurn + item.criticalBufferMin * 0.5) : 0;

      // Risk score: 0 to 100
      let riskScore = 0;
      if (deficitDays > 0) {
        riskScore = Math.min(100, Math.round(65 + (deficitDays / customLeadTime) * 35));
      } else if (daysOfSafeStock < customLeadTime * 1.8) {
        riskScore = Math.round(40 + (1 - daysOfSafeStock / (customLeadTime * 1.8)) * 25);
      } else {
        riskScore = Math.max(5, Math.round(30 - (daysOfSafeStock / 30) * 20));
      }

      const urgency: 'CRITICAL' | 'WARNING' | 'NORMAL' =
        riskScore >= 70 ? 'CRITICAL' : riskScore >= 45 ? 'WARNING' : 'NORMAL';

      return {
        ...item,
        currentStock: liveMed.currentStock,
        pendingOrders: liveMed.pendingOrders,
        effectiveStock,
        currentBurn,
        projectedDailyBurn,
        daysOfSafeStock,
        leadTimeDays: customLeadTime,
        deficitDays,
        projectedDeficitUnits,
        riskScore,
        urgency,
        recommendedReorder: Math.max(
          100,
          Math.ceil((projectedDailyBurn * 20 + item.criticalBufferMin - effectiveStock) / 50) * 50
        )
      };
    });
  }, [medicines, environmentalSurgeFactor, footfallRatio, customLeadTime]);

  // Overall Facility Preparedness Index (0 - 100)
  const facilityPreparednessIndex = useMemo(() => {
    const avgRisk =
      suppliesAnalysis.reduce((acc, curr) => acc + curr.riskScore, 0) / suppliesAnalysis.length;
    return Math.max(10, Math.min(100, Math.round(100 - avgRisk * 0.75)));
  }, [suppliesAnalysis]);

  // Handle Dispatch of Emergency RMSCL Indent directly
  const handleCreateEmergencyIndent = async (item: (typeof suppliesAnalysis)[0]) => {
    await createOrder({
      medicineName: item.name,
      quantityRequested: item.recommendedReorder,
      priority: 'EMERGENCY_REPLENISHMENT',
      justification: `IMD Heatwave Surge: Depletion projected in ${item.daysOfSafeStock} days vs ${item.leadTimeDays} days delivery window. Deficit: ${item.projectedDeficitUnits} ${item.unit}.`
    });

    showNotification(
      `Emergency Replenishment Indent created: ${item.recommendedReorder} ${item.unit} of ${item.shortName}. Sent to RMSCL Mandore.`
    );
  };

  // Handle Sister-PHC Lateral Redistribution Transfer
  const handleApproveLateralTransfer = async (redistId: string, name: string) => {
    await approveRedistribution(redistId);
    showNotification(
      `Inter-PHC Transfer Approved: Emergency dispatch of ${name} from PHC Mandore dispatched via green corridor (ETA 1.2 hrs).`
    );
  };

  // Open Reorder Modal Pre-filled
  const handleOpenCustomReorderModal = (item: (typeof suppliesAnalysis)[0]) => {
    setOrderModalData({
      medicineName: item.name,
      quantity: item.recommendedReorder,
      priority: 'EMERGENCY_REPLENISHMENT',
      justification: `Heatwave Epidemiological Surge: ${customTemp}°C ambient heatwave with ${(
        heatSyndromicShare * 100
      ).toFixed(0)}% dehydration syndromic cluster presentations. Stock covers ${item.daysOfSafeStock} days against ${
        item.leadTimeDays
      } days RMSCL lead time.`
    });
    setIsOrderModalOpen(true);
  };

  // Chart data comparing Baseline vs Current vs Projected Surge Burn
  const chartData = useMemo(() => {
    return suppliesAnalysis.slice(0, 4).map((s) => ({
      name: s.shortName,
      historical: s.historicalBaseBurn,
      current: s.currentBurn,
      projected: s.projectedDailyBurn
    }));
  }, [suppliesAnalysis]);

  const activeScenario = SCENARIOS.find((s) => s.id === selectedScenarioId);
  const activeScenarioName = activeScenario ? activeScenario.name : 'Custom Meteorological Simulation';

  // PDF Report Export State
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [selectedMedicineId, setSelectedMedicineId] = useState<string>(() => suppliesAnalysis[0]?.id || 'med-ors-osian');

  // "Why This Alert?" Modal State
  const [whyAlertModalData, setWhyAlertModalData] = useState<AlertMathBreakdown | null>(null);
  const [isWhyModalOpen, setIsWhyModalOpen] = useState(false);

  // Handle Export of Predictive Trend Chart & Risk Alert Summaries to PDF
  const handleDownloadReport = async () => {
    try {
      setIsExportingPdf(true);
      showNotification('Generating Health Preparedness PDF Report with 30-day predictive trend chart & risk alerts...');

      // Yield frame so chart DOM is settled
      await new Promise((resolve) => setTimeout(resolve, 200));

      await generatePreparednessPdf({
        phc: selectedPHC,
        scenarioName: activeScenarioName,
        temperature: customTemp,
        humidity: customHumidity,
        heatIndex: weather.feelsLikeC || Math.round(customTemp + 4.5),
        footfall: customFootfall,
        leadTimeDays: customLeadTime,
        facilityPreparednessIndex,
        supplies: suppliesAnalysis,
        selectedMedicineId,
        completedActions,
        totalActionsCount: weather.recommendedPreparatoryActions.length,
        recommendedActions: weather.recommendedPreparatoryActions
      });

      showNotification('Health Preparedness PDF Report downloaded successfully!');
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
      showNotification('Failed to generate PDF report. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded font-mono uppercase tracking-wider">
              IMD Meteorological Telemetry
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Rajasthan Heatwave Epidemiological Model
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <CloudSun className="w-5 h-5 text-amber-600" />
            <span>Seasonal & Climate Health Preparedness Intelligence</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Real-time integration of India Meteorological Department signals, patient footfall surges, and lead-time supply vulnerability for <strong>{selectedPHC.name}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Download Report Button */}
          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={isExportingPdf}
            className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            title="Download 30-day predictive trend chart and risk alert summaries as a PDF document"
          >
            {isExportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-rose-200" />
            ) : (
              <FileDown className="w-4 h-4 text-rose-200" />
            )}
            <span>{isExportingPdf ? 'Generating PDF...' : 'Download Report'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('medicine')}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Pill className="w-4 h-4 text-emerald-600" />
            <span>View Medicine Intelligence</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('orders')}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Truck className="w-4 h-4 text-blue-600" />
            <span>Track Orders & Transfers</span>
          </button>
          <button
            type="button"
            onClick={handleBroadcastAlert}
            disabled={alertDispatched}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{alertDispatched ? 'Sub-Centres Alerted' : 'Broadcast Sub-Centre Advisory'}</span>
          </button>
        </div>
      </div>

      {/* 2. Institutional Early Warning Advisory Banner with Non-Diagnostic Disclaimer */}
      <div
        role="region"
        aria-label="IMD Meteorological Advisory"
        className="bg-amber-50/90 border-l-4 border-amber-500 rounded-r-xl p-4 sm:p-5 shadow-xs transition-all space-y-2"
      >
        <div className="flex items-start gap-3.5">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
            <Thermometer className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-sm text-amber-950 flex items-center gap-2">
                <span>IMD Level-3 Severe Heatwave Warning: Western Rajasthan Desert Belt</span>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300 uppercase">
                  Telemetry Active
                </span>
              </div>
              <div className="text-xs font-mono font-bold text-amber-900 bg-amber-200/80 px-2.5 py-1 rounded">
                Facility Readiness Index: <strong>{facilityPreparednessIndex}%</strong>
              </div>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              Maximum temperatures are persisting between <strong>{customTemp}°C and 45.8°C</strong> across the Thar desert fringe. Historical surveillance demonstrates an estimated <strong>65% surge in acute dehydration</strong> and a <strong>3.5× spike in heat exhaustion syndromes</strong>.
            </p>
          </div>
        </div>

        {/* Explicit Non-Diagnostic Medical Guardrail Disclaimer */}
        <div className="bg-amber-100/70 rounded-lg p-2.5 border border-amber-200 flex items-start gap-2 text-[11px] text-amber-950">
          <Info className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Epidemiological Surveillance Notice:</strong> This module models aggregate population-level footfall surges and syndromic clusters (acute dehydration, vomiting, heat exhaustion) to calculate supply-chain buffers and logistics lead times. <em>It does not assert clinical individual disease diagnosis, etiology, or clinical certainty.</em>
          </p>
        </div>
      </div>

      {/* 3. Interactive Rajasthan Heatwave Simulation Scenarios */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>Rajasthan Heatwave Simulation & Stress-Test Presets</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select or tune environmental conditions to preview dynamic supply buffer depletion across western Rajasthan.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvancedControls(!showAdvancedControls)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
          >
            <span>{showAdvancedControls ? 'Hide Calibration Sliders' : 'Calibrate Simulation Sliders'}</span>
            {showAdvancedControls ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Preset Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SCENARIOS.map((sc) => {
            const isSelected = selectedScenarioId === sc.id;
            return (
              <div
                key={sc.id}
                onClick={() => handleSelectScenario(sc)}
                className={`p-4 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-300/60 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${sc.badgeColor}`}>
                      {sc.badge}
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800">
                        <Check className="w-3 h-3 text-emerald-600" /> Active
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-slate-900 text-sm">{sc.name}</div>
                  <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">{sc.description}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/80 grid grid-cols-3 gap-1 text-[10px] font-mono text-slate-700">
                  <div>
                    <span className="text-slate-400 block font-sans">Temp:</span>
                    <strong className="text-slate-900">{sc.temp}°C</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-sans">Footfall:</span>
                    <strong className="text-slate-900">{sc.footfall}/d</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-sans">Lead Time:</span>
                    <strong className="text-slate-900">{sc.leadTimeDays}d</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Advanced Slider Calibration Controls (Optional Accordion) */}
        {showAdvancedControls && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <div className="flex justify-between font-bold text-slate-800 mb-1">
                <span>Ambient Temp:</span>
                <span className="font-mono text-rose-700">{customTemp.toFixed(1)}°C</span>
              </div>
              <input
                type="range"
                min="38"
                max="48"
                step="0.2"
                value={customTemp}
                onChange={(e) => {
                  setCustomTemp(parseFloat(e.target.value));
                  setSelectedScenarioId('custom');
                }}
                className="w-full accent-rose-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Anomaly: +{(customTemp - BASELINE_TEMP).toFixed(1)}°C</span>
            </div>

            <div>
              <div className="flex justify-between font-bold text-slate-800 mb-1">
                <span>Relative Humidity:</span>
                <span className="font-mono text-blue-700">{customHumidity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="1"
                value={customHumidity}
                onChange={(e) => {
                  setCustomHumidity(parseInt(e.target.value));
                  setSelectedScenarioId('custom');
                }}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Dry spell fluid drain</span>
            </div>

            <div>
              <div className="flex justify-between font-bold text-slate-800 mb-1">
                <span>Daily Footfall:</span>
                <span className="font-mono text-slate-900">{customFootfall} / day</span>
              </div>
              <input
                type="range"
                min="150"
                max="400"
                step="5"
                value={customFootfall}
                onChange={(e) => {
                  setCustomFootfall(parseInt(e.target.value));
                  setSelectedScenarioId('custom');
                }}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Normal base: 180 patients</span>
            </div>

            <div>
              <div className="flex justify-between font-bold text-slate-800 mb-1">
                <span>RMSCL Transit Lead Time:</span>
                <span className="font-mono text-amber-800">{customLeadTime.toFixed(1)} Days</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="6.0"
                step="0.5"
                value={customLeadTime}
                onChange={(e) => {
                  setCustomLeadTime(parseFloat(e.target.value));
                  setSelectedScenarioId('custom');
                }}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Mandore Hub to Osian Store</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. The 6-Input Matrix Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Input 1: Weather Signal */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>1. Weather Signal</span>
            <Thermometer className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-rose-700">{customTemp}°C</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Heat Index: {(customTemp * 1.05).toFixed(1)}°C
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] font-mono text-rose-900 font-bold">
            Env Mult: {environmentalSurgeFactor.toFixed(2)}x
          </div>
        </div>

        {/* Input 2: Historical Consumption */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>2. Historical Base</span>
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-slate-800">45 pkts</div>
            <div className="text-[10px] text-slate-500 mt-0.5">ORS Non-Surge Base</div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] font-mono text-slate-600">
            DHS 2025 Registry
          </div>
        </div>

        {/* Input 3: Current Consumption */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>3. Current Burn</span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-amber-700">58 pkts</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Logged last 48 hrs</div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] font-mono text-amber-800 font-bold">
            +28% Initial Burn
          </div>
        </div>

        {/* Input 4: Patient Footfall */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>4. Patient Footfall</span>
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-slate-900">{customFootfall} / d</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Normal: 180 / d (+{((footfallRatio - 1) * 100).toFixed(0)}%)
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] font-mono text-emerald-800 font-bold">
            {(heatSyndromicShare * 100).toFixed(0)}% Fluid Loss
          </div>
        </div>

        {/* Input 5: Current Physical Stock */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>5. Current Stock</span>
            <Layers className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-rose-700">210 pkts</div>
            <div className="text-[10px] text-slate-500 mt-0.5">ORS in pharmacy</div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] font-mono text-rose-900 font-bold">
            Buffer: 250 pkts Min
          </div>
        </div>

        {/* Input 6: Delivery Lead Time */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>6. Delivery Lead Time</span>
            <Truck className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-indigo-700">{customLeadTime} Days</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Mandore Hub to Store</div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] font-mono text-indigo-900 font-bold">
            RMSCL Truck Route
          </div>
        </div>
      </div>

      {/* 5. Predictive Consumption Trend & Stockout Trajectory */}
      <PredictiveConsumptionTrend
        supplies={suppliesAnalysis}
        customTemp={customTemp}
        customHumidity={customHumidity}
        customFootfall={customFootfall}
        customLeadTime={customLeadTime}
        selectedScenarioName={activeScenarioName}
        onExecuteEmergencyIndent={handleCreateEmergencyIndent}
        onApproveLateralTransfer={handleApproveLateralTransfer}
        onOpenReorderModal={handleOpenCustomReorderModal}
        onShowNotification={showNotification}
        onDownloadReport={handleDownloadReport}
        isExportingPdf={isExportingPdf}
        selectedMedicineId={selectedMedicineId}
        onSelectMedicine={setSelectedMedicineId}
      />

      {/* 6. Transparent Preparedness-Risk Calculation & Vulnerability Matrix */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Table Header & Explanation */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                Transparent Risk Algorithmic Audit
              </span>
              <span className="text-xs text-slate-500 font-mono">Formula: Deficit Gap = Lead Time - (Stock / Surge Burn)</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-600" />
              <span>Preparedness Vulnerability Table & Reorder Requisitions</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={isExportingPdf}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-rose-600" />
              )}
              <span>Download PDF Audit</span>
            </button>
            <span className="text-xs text-slate-500 hidden sm:inline">
              Correlated with <strong className="text-slate-800">RMSCL Mandore Hub</strong>
            </span>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" role="table">
            <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th scope="col" className="px-4 py-3">Pharmaceutical / Fluid</th>
                <th scope="col" className="px-3 py-3 text-right">Historical Base</th>
                <th scope="col" className="px-3 py-3 text-right">Current Burn</th>
                <th scope="col" className="px-3 py-3 text-right">Weather Surge Burn</th>
                <th scope="col" className="px-3 py-3 text-right">Physical Stock</th>
                <th scope="col" className="px-3 py-3 text-center">Days to Depletion</th>
                <th scope="col" className="px-3 py-3 text-center">Lead Time Deficit</th>
                <th scope="col" className="px-3 py-3 text-center">Risk Score</th>
                <th scope="col" className="px-3 py-3 text-right">Intervention Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliesAnalysis.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Name & Category */}
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-slate-900">{item.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {item.category} • Buffer: {item.criticalBufferMin} {item.unit}
                    </div>
                  </td>

                  {/* Historical Base */}
                  <td className="px-3 py-3.5 text-right font-mono text-slate-600">
                    <div>{item.historicalBaseBurn}</div>
                    <div className="text-[10px] text-slate-400 font-sans">{item.unit}/day</div>
                  </td>

                  {/* Current Burn */}
                  <td className="px-3 py-3.5 text-right font-mono text-slate-800 font-bold">
                    <div>{item.currentBurn}</div>
                    <div className="text-[10px] text-slate-400 font-sans">{item.unit}/day</div>
                  </td>

                  {/* Projected Weather Surge Burn */}
                  <td className="px-3 py-3.5 text-right font-mono text-rose-700 font-bold">
                    <div className="text-sm">{item.projectedDailyBurn}</div>
                    <div className="text-[10px] text-rose-800 font-sans">
                      +{(
                        ((item.projectedDailyBurn - item.historicalBaseBurn) / item.historicalBaseBurn) *
                        100
                      ).toFixed(0)}
                      % surge
                    </div>
                  </td>

                  {/* Physical Stock & Pipeline */}
                  <td className="px-3 py-3.5 text-right font-mono">
                    <div className="text-sm font-bold text-slate-900">{item.currentStock}</div>
                    {item.pendingOrders > 0 ? (
                      <div className="text-[10px] text-blue-700 font-sans font-semibold">
                        +{item.pendingOrders} in-transit
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 font-sans">No pending orders</div>
                    )}
                  </td>

                  {/* Days to Depletion */}
                  <td className="px-3 py-3.5 text-center font-mono">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.daysOfSafeStock <= item.leadTimeDays
                          ? 'bg-rose-100 text-rose-950 border border-rose-300'
                          : item.daysOfSafeStock <= item.leadTimeDays * 1.8
                          ? 'bg-amber-100 text-amber-950 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                      }`}
                    >
                      {item.daysOfSafeStock} Days
                    </span>
                  </td>

                  {/* Lead Time Deficit Gap */}
                  <td className="px-3 py-3.5 text-center font-mono">
                    {item.deficitDays > 0 ? (
                      <span className="text-rose-700 font-bold flex items-center justify-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>-{item.deficitDays}d Deficit</span>
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium">
                        +{(Math.abs(item.deficitDays)).toFixed(1)}d Buffer Safe
                      </span>
                    )}
                  </td>

                  {/* Risk Score & Status Badge */}
                  <td className="px-3 py-3.5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                          item.riskScore >= 70
                            ? 'bg-rose-100 text-rose-950'
                            : item.riskScore >= 45
                            ? 'bg-amber-100 text-amber-950'
                            : 'bg-emerald-100 text-emerald-950'
                        }`}
                      >
                        {item.riskScore}/100
                      </span>
                      <StatusBadge status={item.urgency} />
                    </div>
                  </td>

                  {/* Actions (Connected to Medicine Intelligence & Orders & Logistics) */}
                  <td className="px-3 py-3.5 text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCreateEmergencyIndent(item)}
                        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Truck className="w-3 h-3" />
                        <span>Draft Indent ({item.recommendedReorder})</span>
                      </button>

                      {item.linkedRedistId && (
                        <button
                          type="button"
                          onClick={() =>
                            handleApproveLateralTransfer(item.linkedRedistId!, item.shortName)
                          }
                          className="px-2.5 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <ArrowRightLeft className="w-2.5 h-2.5 text-blue-700" />
                          <span>Request Lateral Transfer</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Formula Footnote Explanation */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              <strong>Transparent Formula:</strong> Projected Daily Burn = Historical Base × (1 + Env Weather Anomaly × Elasticity) × (Footfall Ratio). Stockout Gap = Mandore Lead Time ({customLeadTime}d) - (Stock / Projected Burn).
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleOpenCustomReorderModal(suppliesAnalysis[0])}
            className="text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer text-xs shrink-0"
          >
            Open Comprehensive Indent Dialog →
          </button>
        </div>
      </div>

      {/* 7. In-Depth Epidemiological Reasoning Cards Behind Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Transparent Reasoning Behind Each Trigger */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Surveillance Reasoning & Logic Audits Behind Alerts</span>
            </h3>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-mono">
              Syndromic Early Warning
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Alert 1: ORS Stockout Risk */}
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-950 flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Critical Alert: ORS Buffer Depletion Gap Before Delivery</span>
                </span>
                <span className="font-mono text-[10px] font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded">
                  Risk Score: 94/100
                </span>
              </div>

              <div className="text-slate-700 leading-relaxed space-y-1">
                <p>
                  <strong>1. Observed Signal:</strong> IMD temperature of {customTemp}°C with {customHumidity}% humidity has triggered acute dehydration presentations across the OPD (surged to {customFootfall} patients/day).
                </p>
                <p>
                  <strong>2. Syndromic Correlation (Non-Diagnostic):</strong> Clinical presentations reflect heat exhaustion and profuse fluid deficit rather than specific pathogen-based enteric infections. Demand elasticity for ORS surges to 2.3× baseline.
                </p>
                <p>
                  <strong>3. Supply Bottleneck:</strong> Current physical reserve of 210 sachets at {suppliesAnalysis[0].projectedDailyBurn} pkts/day depletion will exhaust in <strong>1.8 days</strong>. With RMSCL Mandore delivery lead time of <strong>{customLeadTime} days</strong>, a <strong>1.7-day stockout gap</strong> will occur unless emergency supply is enacted.
                </p>
                <p className="text-rose-900 font-bold pt-1 border-t border-rose-200/80">
                  Administrative Directive: Expedite pending shipment #ORD-2026-904 and approve lateral transfer of 600 sachets from PHC Mandore.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setWhyAlertModalData({
                      title: 'Potential Stock-Out Risk: ORS Sachets within 3.6 Days',
                      medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
                      currentStock: 210,
                      unit: 'units',
                      avgDailyConsumption: 58,
                      recentTrendPercent: 21,
                      forecastDemand: 67,
                      nextReplenishmentDays: 3.9,
                      safetyBufferDays: 1.5,
                      projectedRisk: 'HIGH',
                      reason:
                        'Current projected consumption exceeds available stock before expected replenishment.',
                      onRemediate: () => handleCreateEmergencyIndent(suppliesAnalysis[0]),
                      onLateralTransfer: () => handleApproveLateralTransfer('REDIST-2026-01', 'ORS Sachets')
                    });
                    setIsWhyModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Inspect algorithmic breakdown"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Why this alert?</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateEmergencyIndent(suppliesAnalysis[0])}
                  className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Execute Emergency RMSCL Indent</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModule('orders')}
                  className="px-3 py-1.5 bg-white border border-rose-300 text-rose-900 hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Inspect in Orders & Logistics</span>
                </button>
              </div>
            </div>

            {/* Alert 2: Intravenous Fluid Stockout Vulnerability */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>High Alert: Intravenous Fluid Buffer Depletion (Normal Saline & RL)</span>
                </span>
                <span className="font-mono text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                  Risk Score: 86/100
                </span>
              </div>

              <div className="text-slate-700 leading-relaxed space-y-1">
                <p>
                  <strong>1. Observed Signal:</strong> Inpatient heat-collapse admissions and severe pediatric dehydration cases requiring IV resuscitation have risen from 2 cases/day to 9 cases/day.
                </p>
                <p>
                  <strong>2. Syndromic Correlation:</strong> Patients exhibiting hypotension, electrolyte collapse, and hyperthermia require immediate isotonic saline resuscitation.
                </p>
                <p>
                  <strong>3. Supply Bottleneck:</strong> Normal Saline inventory stands at 64 bottles against a projected burn of 19 bottles/day. Safe stock covers 3.4 days, creating zero contingency buffer against potential road transit delays.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setWhyAlertModalData({
                      title: 'High Alert: Intravenous Fluid Buffer Depletion',
                      medicineName: 'Normal Saline (0.9% NaCl) IV Infusion 500ml',
                      currentStock: 64,
                      unit: 'bottles',
                      avgDailyConsumption: 6,
                      recentTrendPercent: 28,
                      forecastDemand: 19,
                      nextReplenishmentDays: customLeadTime,
                      safetyBufferDays: 2.0,
                      projectedRisk: 'HIGH',
                      reason:
                        'Current projected consumption exceeds available stock before expected replenishment.',
                      onRemediate: () => handleCreateEmergencyIndent(suppliesAnalysis[1])
                    });
                    setIsWhyModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Inspect algorithmic breakdown"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                  <span>Why this alert?</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateEmergencyIndent(suppliesAnalysis[1])}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Draft Normal Saline Indent (200 bottles)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModule('medicine')}
                  className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Pill className="w-3.5 h-3.5" />
                  <span>Check Batch Shelf-Life</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Facility Readiness & Preparatory Action Plan Checklist */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Facility Action Readiness Checklist (NDMA & DHS Rajasthan)</span>
              </h3>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                {completedActions.length}/{weather.recommendedPreparatoryActions.length} Completed
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {weather.recommendedPreparatoryActions.map((action, idx) => {
                const isChecked = completedActions.includes(action.action);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleAction(action.action)}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                      isChecked
                        ? 'border-emerald-300 bg-emerald-50/70 text-slate-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-900'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-emerald-700 border-slate-300 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className={`font-bold ${isChecked ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {action.action}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>
                          Priority: <strong className="text-slate-700">{action.priority}</strong>
                        </span>
                        <span>•</span>
                        <span>Category: {action.category}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span>Protocol: National Action Plan on Heat-Related Illnesses (NAP-HRI)</span>
            <span className="font-mono text-emerald-700 font-bold">100% Cold Chain Compliant</span>
          </div>
        </div>
      </div>

      {/* 8. Recharts Visual Comparison: Baseline vs Current vs Heatwave Surge Burn */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>Comparative Burn Rate Acceleration Under Heatwave Surge</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Contrasting Historical Baseline (normal day) against Current Logged Burn and Projected Heatwave Burn.
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
            Units: Daily Consumption
          </span>
        </div>

        <div className="h-56 w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  borderRadius: '8px',
                  fontSize: '11px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="historical" name="Historical Baseline" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="current" name="Current Recorded Burn" fill="#0284c7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="projected" name="Projected Heatwave Surge Burn" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 8. Reorder Modal Integration */}
      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        defaultMedicine={orderModalData.medicineName}
        defaultQuantity={orderModalData.quantity}
        defaultPriority={orderModalData.priority}
        defaultJustification={orderModalData.justification}
      />

      {/* 9. "Why This Alert?" Algorithmic Audit Modal */}
      <WhyThisAlertModal
        isOpen={isWhyModalOpen}
        onClose={() => setIsWhyModalOpen(false)}
        data={whyAlertModalData}
      />
    </div>
  );
};
