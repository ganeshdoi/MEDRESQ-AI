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
import { PredictiveConsumptionTrend, EvaluatedSupplyItem } from './PredictiveConsumptionTrend.tsx';
import { generatePreparednessPdf } from '../../utils/generatePreparednessPdf.ts';
import { WhyThisAlertModal, AlertMathBreakdown } from '../ui/WhyThisAlertModal.tsx';
import { MLSurgeCapacityAlertsPanel } from './MLSurgeCapacityAlertsPanel.tsx';
import { calculateMedicineForecast, simulateSupplyDisruption } from '../../utils/inventoryForecast.ts';
import { generateEssentialMedicinesForPHC } from '../../data/nationalEssentialMedicines.ts';
import {
  EpidemicSeasonKey,
  RegionalSeasonScenarioPreset,
  getDefaultSeasonForZone,
  getRegionalGeographySeasonProfile,
  resolveAgroClimaticZone
} from '../../utils/regionalDemandProfile.ts';

const SEASON_OPTIONS: Array<{ key: EpidemicSeasonKey; label: string; months: string }> = [
  { key: 'SUMMER_HEATWAVE', label: 'Summer Heatwave & Loo', months: 'Apr – Jun' },
  { key: 'MONSOON_VECTOR_FLOOD', label: 'Monsoon Vector & Snakebite', months: 'Jul – Sep' },
  { key: 'POST_MONSOON_SCRUB_TYPHUS', label: 'Post-Monsoon Scrub Typhus', months: 'Oct – Nov' },
  { key: 'WINTER_COLD_RESPIRATORY', label: 'Winter Cold Wave & ARI', months: 'Dec – Feb' }
];

export const HealthPreparedness: React.FC = () => {
  const {
    weather,
    medicines,
    selectedPHC,
    setSelectedPHC,
    facilities,
    orders,
    redistributions,
    showNotification,
    createOrder,
    approveRedistribution,
    setActiveModule
  } = useApp();

  // Active Season & Regional Profile State
  const [activeSeason, setActiveSeason] = useState<EpidemicSeasonKey>(() =>
    getDefaultSeasonForZone(resolveAgroClimaticZone(selectedPHC))
  );

  const regionalProfile = useMemo(
    () => getRegionalGeographySeasonProfile(selectedPHC, activeSeason),
    [selectedPHC, activeSeason]
  );

  // Active Simulation Controls
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('current-orange');
  const [customTemp, setCustomTemp] = useState<number>(regionalProfile.activeDefaultTempC);
  const [customHumidity, setCustomHumidity] = useState<number>(regionalProfile.activeDefaultHumidityPct);
  const [customFootfall, setCustomFootfall] = useState<number>(regionalProfile.activeDefaultFootfall);
  const [customLeadTime, setCustomLeadTime] = useState<number>(regionalProfile.defaultLeadTimeDays);
  const [showAdvancedControls, setShowAdvancedControls] = useState<boolean>(false);

  // Auto-sync default season when user switches PHC to a different agro-climatic zone
  React.useEffect(() => {
    const recommendedSeason = getDefaultSeasonForZone(resolveAgroClimaticZone(selectedPHC));
    setActiveSeason(recommendedSeason);
  }, [selectedPHC.id]);

  // Sync environmental sliders & checklist when PHC or activeSeason changes
  React.useEffect(() => {
    const profile = getRegionalGeographySeasonProfile(selectedPHC, activeSeason);
    setSelectedScenarioId('current-orange');
    setCustomTemp(profile.activeDefaultTempC);
    setCustomHumidity(profile.activeDefaultHumidityPct);
    setCustomFootfall(profile.activeDefaultFootfall);
    setCustomLeadTime(profile.defaultLeadTimeDays);
    setCompletedActions(
      profile.recommendedActions.slice(0, 2).map((a) => a.action)
    );
  }, [selectedPHC.id, activeSeason]);

  // Expanded Alert Reasoning Accordion
  const [expandedReasoning, setExpandedReasoning] = useState<string | null>('ors-alert');

  // Checklist Actions
  const [completedActions, setCompletedActions] = useState<string[]>(() =>
    regionalProfile.recommendedActions.slice(0, 2).map((a) => a.action)
  );
  const [alertDispatched, setAlertDispatched] = useState<boolean>(false);

  // Order Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [orderModalData, setOrderModalData] = useState<{
    medicineName: string;
    quantity: number;
    priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY_REPLENISHMENT';
    justification: string;
  }>({
    medicineName: 'Oral Rehydration Salts (ORS) Sachets IP 20.5g',
    quantity: 1000,
    priority: 'EMERGENCY_REPLENISHMENT',
    justification: 'Regional seasonal surge emergency reorder. Physical stock below lead-time depletion threshold.'
  });

  // Apply a Scenario Preset
  const handleSelectScenario = (scenario: RegionalSeasonScenarioPreset) => {
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
      `Advisory Broadcast: ${regionalProfile.seasonLabel} protocols dispatched to all ${selectedPHC.subCentresCovered} Sub-Centres under ${selectedPHC.name}.`
    );
  };

  // -------------------------------------------------------------
  // TRANSPARENT REGIONAL & SEASONAL PREPAREDNESS-RISK MODEL
  // -------------------------------------------------------------
  const BASELINE_TEMP = regionalProfile.baselineTempC;
  const BASELINE_HUMIDITY = regionalProfile.baselineHumidityPct;
  const BASELINE_FOOTFALL = regionalProfile.baselineFootfall;

  // 1. Weather & Seasonal Anomaly Multiplier (E_w) tailored by active season
  const tempAnomaly = Math.max(0, customTemp - BASELINE_TEMP);
  const coldAnomaly = Math.max(0, BASELINE_TEMP - customTemp);
  const humidityDelta =
    activeSeason === 'SUMMER_HEATWAVE'
      ? Math.max(0, (BASELINE_HUMIDITY - customHumidity) / 100)
      : Math.max(0, (customHumidity - BASELINE_HUMIDITY) / 100);

  const environmentalSurgeFactor =
    activeSeason === 'SUMMER_HEATWAVE'
      ? 1 + (tempAnomaly / 10) * 0.8 + humidityDelta * 0.45
      : activeSeason === 'MONSOON_VECTOR_FLOOD'
      ? 1 + humidityDelta * 1.15 + (tempAnomaly / 10) * 0.25
      : activeSeason === 'POST_MONSOON_SCRUB_TYPHUS'
      ? 1 + humidityDelta * 0.95 + 0.22
      : 1 + (coldAnomaly / 10) * 0.75 + humidityDelta * 0.35;

  // 2. Patient Footfall Surge Ratio (W_f)
  const footfallRatio = customFootfall / Math.max(1, BASELINE_FOOTFALL);
  const heatSyndromicShare = Math.min(
    0.65,
    0.18 + Math.max(0, environmentalSurgeFactor - 1) * 0.45 + Math.max(0, footfallRatio - 1) * 0.22
  );

  // Calculate live calculations for region- and season-specific formulary items
  const suppliesAnalysis = useMemo(() => {
    const targets = regionalProfile.targetSupplies;

    return targets.map((item) => {
      const liveMed =
        medicines.find(
          (m) =>
            m.id === item.id ||
            m.name.toLowerCase() === item.name.toLowerCase() ||
            m.name.toLowerCase().includes(item.shortName.split(' ')[0].toLowerCase())
        ) || {
          id: item.id,
          phcId: selectedPHC.id,
          name: item.name,
          unit: item.unit,
          currentStock: item.criticalBufferMin,
          dailyConsumption: item.historicalBaseBurn,
          minStockLevel: item.criticalBufferMin,
          maxStockLevel: item.criticalBufferMin * 5,
          pendingOrders: 0
        };

      // Current logged consumption
      const currentBurn = liveMed.dailyConsumption;

      // Weather, Geography & Footfall Projected Surge Burn:
      const projectedDailyBurn = Math.max(
        item.historicalBaseBurn,
        Math.round(
          item.historicalBaseBurn *
            (1 + Math.max(0.05, environmentalSurgeFactor - 1) * (item.surgeMultiplier - 1) * 1.45) *
            (footfallRatio * 0.75 + 0.25)
        )
      );

      const surgeRatio = currentBurn > 0 ? projectedDailyBurn / currentBurn : 1.0;
      const forecast = calculateMedicineForecast({
        medicine: liveMed,
        phcName: selectedPHC.name,
        leadTimeDays: customLeadTime,
        safetyBufferDays: 3.0,
        replenishmentCycleDays: 14,
        demandSurgeMultiplier: surgeRatio,
        consumptionPeriodDays: 30,
        isSyntheticData: true
      });

      // Days of usable stock remaining
      const effectiveStock = forecast.usableStock + forecast.pendingInwardStock;
      const daysOfSafeStock =
        forecast.estimatedDaysRemaining !== null ? forecast.estimatedDaysRemaining : 99.9;

      // Deficit before district warehouse truck arrives
      const deficitDays = parseFloat((customLeadTime - daysOfSafeStock).toFixed(1));
      const projectedDeficitUnits =
        deficitDays > 0 ? Math.round(deficitDays * projectedDailyBurn + forecast.safetyStock * 0.5) : 0;

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
        forecast.riskLevel === 'CRITICAL'
          ? 'CRITICAL'
          : forecast.riskLevel === 'WARNING'
          ? 'WARNING'
          : 'NORMAL';

      return {
        ...item,
        currentStock: forecast.usableStock,
        totalPhysicalStock: forecast.totalPhysicalStock,
        expiredBatchStock: forecast.expiredBatchStock,
        pendingOrders: forecast.pendingInwardStock,
        effectiveStock,
        currentBurn,
        projectedDailyBurn,
        daysOfSafeStock,
        estimatedStockoutDate: forecast.estimatedStockoutDate,
        safetyStock: forecast.safetyStock,
        reorderPoint: forecast.reorderPoint,
        leadTimeDays: customLeadTime,
        deficitDays,
        projectedDeficitUnits,
        riskScore,
        urgency,
        primaryRiskReason: forecast.primaryRiskReason,
        recommendedReorder: forecast.suggestedReplenishmentQty
      };
    });
  }, [
    regionalProfile.targetSupplies,
    medicines,
    selectedPHC.id,
    selectedPHC.name,
    environmentalSurgeFactor,
    footfallRatio,
    customLeadTime
  ]);

  // Overall Facility Preparedness Index (0 - 100)
  const facilityPreparednessIndex = useMemo(() => {
    const avgRisk =
      suppliesAnalysis.reduce((acc, curr) => acc + curr.riskScore, 0) / Math.max(1, suppliesAnalysis.length);
    return Math.max(10, Math.min(100, Math.round(100 - avgRisk * 0.75)));
  }, [suppliesAnalysis]);

  // Handle Dispatch of Emergency Warehouse Indent directly
  const handleCreateEmergencyIndent = async (item: EvaluatedSupplyItem) => {
    const ok = await createOrder({
      medicineName: item.name,
      quantityRequested: item.recommendedReorder,
      priority: 'EMERGENCY_REPLENISHMENT',
      justification: `${regionalProfile.seasonLabel} (${selectedPHC.district} • ${regionalProfile.zoneBadge}): Depletion projected in ${item.daysOfSafeStock} days vs ${item.leadTimeDays} days delivery window. Deficit: ${item.projectedDeficitUnits} ${item.unit}.`
    });

    if (ok) {
      showNotification(
        `Emergency Replenishment Indent created: ${item.recommendedReorder} ${item.unit} of ${item.shortName}. Sent to ${regionalProfile.warehouseHubName}.`
      );
    }
  };

  // Handle Sister-PHC Lateral Redistribution Transfer
  const handleApproveLateralTransfer = async (redistId: string, name: string) => {
    const ok = await approveRedistribution(redistId);
    if (ok) {
      showNotification(
        `Inter-PHC Transfer Approved: Emergency dispatch of ${name} dispatched via green corridor.`
      );
    }
  };

  // Open Reorder Modal Pre-filled
  const handleOpenCustomReorderModal = (item: EvaluatedSupplyItem) => {
    setOrderModalData({
      medicineName: item.name,
      quantity: item.recommendedReorder,
      priority: 'EMERGENCY_REPLENISHMENT',
      justification: `${regionalProfile.seasonLabel} (${selectedPHC.district} • ${regionalProfile.zoneName}): ${customTemp}°C, ${customHumidity}% RH with ${(
        heatSyndromicShare * 100
      ).toFixed(0)}% syndromic cluster presentations. Stock covers ${item.daysOfSafeStock} days against ${
        item.leadTimeDays
      } days warehouse lead time.`
    });
    setIsOrderModalOpen(true);
  };

  // Chart data comparing Baseline vs Current vs Projected Surge Burn
  const chartData = useMemo(() => {
    return suppliesAnalysis.slice(0, 5).map((s) => ({
      name: s.shortName,
      historical: s.historicalBaseBurn,
      current: s.currentBurn,
      projected: s.projectedDailyBurn
    }));
  }, [suppliesAnalysis]);

  const activeScenario = regionalProfile.scenarios.find((s) => s.id === selectedScenarioId);
  const activeScenarioName = activeScenario ? activeScenario.name : 'Custom Regional Meteorological Simulation';

  // PDF Report Export State
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [selectedMedicineId, setSelectedMedicineId] = useState<string>(() => suppliesAnalysis[0]?.id || 'med-ors-osian');
  const [selectedFormularyMedId, setSelectedFormularyMedId] = useState<string>(() => medicines[0]?.id || '');

  // What-If Supply Disruption Simulation State (Strictly Read-Only — never mutates inventory/orders/transfers)
  const [simPHCId, setSimPHCId] = useState<string>(() => selectedPHC.id);
  const [hypotheticalDelayDays, setHypotheticalDelayDays] = useState<number>(3.0);

  // Sync simPHCId when global selectedPHC changes
  React.useEffect(() => {
    setSimPHCId(selectedPHC.id);
  }, [selectedPHC.id]);

  // Resolve target PHC and its formulary medicines for inspection/simulation without mutating global state
  const targetSimPHC = useMemo(() => {
    return facilities.find((f) => f.id === simPHCId) || selectedPHC;
  }, [facilities, simPHCId, selectedPHC]);

  const targetSimMedicines = useMemo(() => {
    if (targetSimPHC.id === selectedPHC.id) {
      return medicines;
    }
    return generateEssentialMedicinesForPHC(
      targetSimPHC.id,
      `${targetSimPHC.district} District Drug Warehouse`
    );
  }, [targetSimPHC, selectedPHC.id, medicines]);

  // Keep selectedFormularyMedId synced when PHC changes or user selects a medicine tab
  const activeFormularyMed = useMemo(() => {
    const byFormularyId = targetSimMedicines.find((m) => m.id === selectedFormularyMedId);
    if (byFormularyId) return byFormularyId;
    // Try matching by name if user switched simPHCId
    const prevMed = medicines.find((m) => m.id === selectedFormularyMedId);
    if (prevMed) {
      const byName = targetSimMedicines.find((m) => m.name === prevMed.name);
      if (byName) return byName;
    }
    return targetSimMedicines[0];
  }, [targetSimMedicines, medicines, selectedFormularyMedId]);

  const activeScenarioMult = useMemo(() => {
    return selectedScenarioId === 'baseline-relief'
      ? 1.0
      : Number((1 + (environmentalSurgeFactor - 1) * 0.65).toFixed(2));
  }, [selectedScenarioId, environmentalSurgeFactor]);

  const activeDeterministicForecast = useMemo(() => {
    if (!activeFormularyMed) return null;
    return calculateMedicineForecast({
      medicine: activeFormularyMed,
      phcName: targetSimPHC.name,
      leadTimeDays: customLeadTime,
      safetyBufferDays: 3.0,
      replenishmentCycleDays: 14,
      demandSurgeMultiplier: activeScenarioMult,
      consumptionPeriodDays: 30,
      isSyntheticData: true
    });
  }, [activeFormularyMed, targetSimPHC.name, customLeadTime, activeScenarioMult]);

  // Pure Read-Only What-If Supply Disruption Simulation Result
  const supplyDisruptionSimulation = useMemo(() => {
    if (!activeFormularyMed) return null;
    const candidateDonors = facilities
      .filter((f) => f.id !== targetSimPHC.id)
      .map((f) => ({
        phc: f,
        medicines:
          f.id === selectedPHC.id
            ? medicines
            : generateEssentialMedicinesForPHC(f.id, `${f.district} District Drug Warehouse`)
      }));

    return simulateSupplyDisruption({
      recipientPHC: targetSimPHC,
      recipientMedicine: activeFormularyMed,
      baseLeadTimeDays: customLeadTime,
      deliveryDelayDays: hypotheticalDelayDays,
      demandSurgeMultiplier: activeScenarioMult,
      candidateDonors,
      referenceDate: '2026-09-22'
    });
  }, [
    activeFormularyMed,
    facilities,
    targetSimPHC,
    selectedPHC.id,
    medicines,
    customLeadTime,
    hypotheticalDelayDays,
    activeScenarioMult
  ]);

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
              Demand Estimation &amp; Surge Forecast
            </span>
            <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-mono">
              Synthetic Weather &amp; Consumption Simulation • Deterministic + Optional Gemini AI
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <CloudSun className="w-5 h-5 text-amber-600" />
            <span>Seasonal Medicine Demand Estimation &amp; Stock-Out Forecast</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Simulate how ambient temperature, patient footfall, and delivery lead times impact essential medicine depletion and replenishment requirements at <strong>{selectedPHC.name}</strong>.
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

      {/* 1A. 4-Stage Causal Chain & Provenance Strip: Observed -> Calculated -> Forecast/AI Signal -> Recommendation */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-white">
              Decision-Support Causal Flow
            </span>
            <span className="text-xs font-bold text-slate-800">
              Observed Data → Demand Signal → Deterministic Calculation → Forecast Risk → Operational Response
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Deterministic stock/ROP math runs locally; AI/forecast signals provide non-diagnostic decision support only
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-900">
                1. OBSERVED
              </span>
              <span className="text-[10px] font-mono text-slate-500">Recorded Ledger</span>
            </div>
            <div className="font-bold text-slate-900 mt-1">
              Facility Stock &amp; Historical OPD Burn
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Physical batches ({medicines.length} items at {selectedPHC.name}), 30-day historical dispensing rate, and baseline footfall ({regionalProfile.baselineFootfall}/day).
            </p>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-950 border border-indigo-300">
                2. CALCULATED
              </span>
              <span className="text-[10px] font-mono text-indigo-700">Deterministic Code</span>
            </div>
            <div className="font-bold text-slate-900 mt-1">
              Usable Stock, FEFO, Safety Buffer &amp; ROP
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Computed deterministically by local code (<code className="font-mono text-[10px]">inventoryForecast.ts</code>): excludes expired batches, computes Safety Stock, Reorder Point, and lead-time gap.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300">
                3. FORECAST / AI SIGNAL
              </span>
              <span className="text-[10px] font-mono text-amber-800">{activeScenarioMult}x Surge</span>
            </div>
            <div className="font-bold text-slate-900 mt-1">
              Seasonal Demand Signal ({regionalProfile.seasonLabel})
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Models {customTemp}°C / {customHumidity}% RH &amp; {customFootfall} OPD/day demand elasticity + optional Gemini AI narrative synthesis (decision-support only).
            </p>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 border border-emerald-300">
                4. RECOMMENDATION
              </span>
              <span className="text-[10px] font-mono text-emerald-800">MO Approval Gate</span>
            </div>
            <div className="font-bold text-slate-900 mt-1">
              Operational Replenishment &amp; Lateral Transfer
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Suggests warehouse indent quantities or sister-PHC surplus transfers. Requires explicit Medical Officer review before execution.
            </p>
          </div>
        </div>
      </div>

      {/* 1B. Location Geography, District Hazard Profile & Seasonal Selector Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold font-mono uppercase tracking-wider px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                {regionalProfile.zoneBadge}
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                District: {selectedPHC.district}, {selectedPHC.state}
              </span>
              <span className="text-[11px] font-mono text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                Hub: {regionalProfile.warehouseHubName} ({regionalProfile.defaultLeadTimeDays}d Transit)
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              {regionalProfile.zoneName} — Geography &amp; Seasonal Epidemiology Calibration
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
              {regionalProfile.geographicalCharacteristics} <strong>Topography &amp; Water:</strong> {regionalProfile.topographyAndWaterNote}
            </p>
          </div>

          {/* Quick PHC / District Geography Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="text-[11px] font-bold text-slate-700 px-1">
              Active Facility &amp; Geography:
            </div>
            <select
              aria-label="Switch PHC Location for Demand Forecast"
              value={selectedPHC.id}
              onChange={(e) => {
                const found = facilities.find((f) => f.id === e.target.value);
                if (found) {
                  setSelectedPHC(found);
                  showNotification(`Switched Demand Forecast to ${found.name} (${found.district})`);
                }
              }}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {facilities.map((f) => {
                const z = resolveAgroClimaticZone(f);
                const zTag =
                  z === 'THAR_HYPER_ARID_DESERT'
                    ? 'Thar Desert Heatwave Belt'
                    : z === 'ARAVALLI_TRIBAL_FOREST_HILLS'
                    ? 'Aravalli Tribal Hills (Vector/Snakebite)'
                    : z === 'CHAMBAL_HADOTI_RIVERINE_BASIN'
                    ? 'Chambal Riverine (Dengue/Scrub Typhus)'
                    : z === 'SEMI_ARID_MARWAR_SHEKHAWATI'
                    ? 'Marwar/Shekhawati Thermal Swing'
                    : z === 'EASTERN_FLOOD_NCR_PLAINS'
                    ? 'Eastern Semi-Arid Plains'
                    : z === 'CANAL_IRRIGATED_GHAGGAR_PLAINS'
                    ? 'Canal Irrigated Ghaggar Belt'
                    : f.state;
                return (
                  <option key={f.id} value={f.id}>
                    {f.name} — {f.district} [{zTag}]
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* 4-Season Selector Tabs + District Representative Quick-Jump Buttons */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
              Select Seasonal Epidemiological Regime (Recalibrates Weather, Syndromes &amp; Drug Elasticity):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {SEASON_OPTIONS.map((sOpt) => {
                const isActive = activeSeason === sOpt.key;
                const isZoneRecommended =
                  getDefaultSeasonForZone(resolveAgroClimaticZone(selectedPHC)) === sOpt.key;
                return (
                  <button
                    key={sOpt.key}
                    type="button"
                    onClick={() => {
                      setActiveSeason(sOpt.key);
                      showNotification(`Season switched to ${sOpt.label} (${sOpt.months}) for ${selectedPHC.district}`);
                    }}
                    className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold truncate">{sOpt.label}</span>
                      {isZoneRecommended && (
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                            isActive
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          Peak Risk
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] font-mono mt-0.5 ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                      {sOpt.months}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Regional Archetype Switcher for Rajasthan Districts */}
          <div className="space-y-1.5 shrink-0">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
              Compare Rajasthan District Geographies:
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: 'Thar Heatwave (Jodhpur/Jaisalmer)', matchId: 'phc-osian' },
                { label: 'Aravalli Tribal (Udaipur/Kotra)', matchId: 'phc-kotra' },
                { label: 'Chambal Basin (Kota/Hadoti)', matchId: 'phc-sultanpur-kota' },
                { label: 'Frost/Loo Belt (Churu/Sikar)', matchId: 'phc-fatehpur-sikar' },
                { label: 'Semi-Arid Plains (Jaipur)', matchId: 'phc-sanganer' }
              ].map((preset) => {
                const targetFacility = facilities.find((f) => f.id === preset.matchId);
                if (!targetFacility) return null;
                const isSelected = selectedPHC.id === targetFacility.id;
                return (
                  <button
                    key={preset.matchId}
                    type="button"
                    onClick={() => {
                      setSelectedPHC(targetFacility);
                      showNotification(`Switched to ${targetFacility.name} (${targetFacility.district})`);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
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
                <span>{regionalProfile.advisoryTitle}</span>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300 uppercase">
                  {regionalProfile.seasonLabel} ({regionalProfile.seasonMonths})
                </span>
              </div>
              <div className="text-xs font-mono font-bold text-amber-900 bg-amber-200/80 px-2.5 py-1 rounded">
                Facility Readiness Index: <strong>{facilityPreparednessIndex}%</strong>
              </div>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              {regionalProfile.advisorySummary}{' '}
              <span className="font-mono font-bold">
                [Active Env: {customTemp}°C • {customHumidity}% RH • {customFootfall} OPD/day]
              </span>
            </p>
          </div>
        </div>

        {/* Explicit Non-Diagnostic Medical Guardrail Disclaimer */}
        <div className="bg-amber-100/70 rounded-lg p-2.5 border border-amber-200 flex items-start gap-2 text-[11px] text-amber-950">
          <Info className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Epidemiological Surveillance Notice ({selectedPHC.district}):</strong>{' '}
            {regionalProfile.primarySyndromicClusters.map((c) => `${c.condition} (${c.projectedIncrease})`).join(' • ')}.{' '}
            <em>It does not assert clinical individual disease diagnosis, etiology, or clinical certainty.</em>
          </p>
        </div>
      </div>

      {/* 2B. Machine Learning + Gemini AI Proactive Surge Capacity Alert Service */}
      <MLSurgeCapacityAlertsPanel
        phc={selectedPHC}
        medicines={medicines}
        temperatureC={customTemp}
        humidityPct={customHumidity}
        currentOpdFootfall={customFootfall}
        leadTimeDays={customLeadTime}
        activeSeason={activeSeason}
        onSeasonChange={(newSeason) => setActiveSeason(newSeason)}
        onDispatchEmergencyOrder={async (medicineName, qty, justification) => {
          await createOrder({
            medicineName,
            quantityRequested: qty,
            priority: 'EMERGENCY_REPLENISHMENT',
            justification
          });
        }}
        onNavigateModule={setActiveModule}
        onShowNotification={showNotification}
      />

      {/* 3. Interactive Regional & Seasonal Simulation Scenarios */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>
                {selectedPHC.district} ({regionalProfile.zoneBadge}) — {regionalProfile.seasonLabel} Stress-Test Presets
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select or tune environmental conditions for <strong>{selectedPHC.name}</strong> during <strong>{regionalProfile.seasonLabel} ({regionalProfile.seasonMonths})</strong>.
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
          {regionalProfile.scenarios.map((sc) => {
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

                <div className="mt-3 pt-2 border-t border-slate-200/80 grid grid-cols-4 gap-1 text-[10px] font-mono text-slate-700">
                  <div>
                    <span className="text-slate-400 block font-sans">Temp:</span>
                    <strong className="text-slate-900">{sc.temp}°C</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-sans">Humidity:</span>
                    <strong className="text-slate-900">{sc.humidity}%</strong>
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
                min="4"
                max="49"
                step="0.5"
                value={customTemp}
                onChange={(e) => {
                  setCustomTemp(parseFloat(e.target.value));
                  setSelectedScenarioId('custom');
                }}
                className="w-full accent-rose-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                Normal Seasonal Base: {regionalProfile.baselineTempC}°C
              </span>
            </div>

            <div>
              <div className="flex justify-between font-bold text-slate-800 mb-1">
                <span>Relative Humidity:</span>
                <span className="font-mono text-blue-700">{customHumidity}%</span>
              </div>
              <input
                type="range"
                min="8"
                max="96"
                step="1"
                value={customHumidity}
                onChange={(e) => {
                  setCustomHumidity(parseInt(e.target.value));
                  setSelectedScenarioId('custom');
                }}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                Normal Seasonal RH: {regionalProfile.baselineHumidityPct}%
              </span>
            </div>

            <div>
              <div className="flex justify-between font-bold text-slate-800 mb-1">
                <span>Daily Footfall:</span>
                <span className="font-mono text-slate-900">{customFootfall} / day</span>
              </div>
              <input
                type="range"
                min="120"
                max="440"
                step="5"
                value={customFootfall}
                onChange={(e) => {
                  setCustomFootfall(parseInt(e.target.value));
                  setSelectedScenarioId('custom');
                }}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                Normal base: {regionalProfile.baselineFootfall} patients
              </span>
            </div>

            <div>
              <div className="flex justify-between font-bold text-slate-800 mb-1">
                <span>Warehouse Transit Lead Time:</span>
                <span className="font-mono text-amber-800">{customLeadTime.toFixed(1)} Days</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="7.5"
                step="0.5"
                value={customLeadTime}
                onChange={(e) => {
                  setCustomLeadTime(parseFloat(e.target.value));
                  setSelectedScenarioId('custom');
                }}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 truncate block">
                {regionalProfile.warehouseHubName}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Selected Medicine & PHC Deterministic Demand & Stock-Out Forecast Inspector */}
      {activeFormularyMed && activeDeterministicForecast && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold font-mono px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                  {activeDeterministicForecast.estimateBadgeLabel}
                </span>
                <span className="text-xs font-mono text-slate-600">
                  PHC: <strong className="text-slate-900">{targetSimPHC.name}</strong> ({targetSimPHC.district})
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span>Selected Medicine &amp; PHC Deterministic Demand &amp; Stock-Out Forecast</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeDeterministicForecast.disclaimerText}
              </p>
            </div>

            {/* PHC & Medicine Selector Dropdowns across all PHCs and Formulary Items */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <label htmlFor="forecast-phc-select" className="text-xs font-bold text-slate-700">
                  PHC:
                </label>
                <select
                  id="forecast-phc-select"
                  value={targetSimPHC.id}
                  onChange={(e) => setSimPHCId(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.district})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <label htmlFor="forecast-med-select" className="text-xs font-bold text-slate-700">
                  Medicine ({targetSimMedicines.length}):
                </label>
                <select
                  id="forecast-med-select"
                  value={activeFormularyMed.id}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedFormularyMedId(newId);
                    const chosen = targetSimMedicines.find((m) => m.id === newId);
                    if (chosen) {
                      const matchSupply = suppliesAnalysis.find((s) =>
                        chosen.name.toLowerCase().includes(s.shortName.split(' ')[0].toLowerCase())
                      );
                      if (matchSupply) setSelectedMedicineId(matchSupply.id);
                    }
                  }}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {targetSimMedicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.currentStock} {m.unit} • {m.stockoutRisk})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 6-Metric Deterministic Summary Strip for Selected Medicine & PHC */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            {/* 1. Usable Stock Excluding Expired */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-500">
                1. Current Usable Stock
              </span>
              <div className="mt-1.5">
                <div className="text-xl font-bold font-mono text-slate-900">
                  {activeDeterministicForecast.usableStock} {activeDeterministicForecast.unit}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Physical: {activeDeterministicForecast.totalPhysicalStock} • Expired: {activeDeterministicForecast.expiredBatchStock}
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-200/80 text-[10px] font-mono text-emerald-800 font-bold">
                {activeDeterministicForecast.expiredBatchStock > 0
                  ? `Excl. ${activeDeterministicForecast.expiredBatchStock} expired`
                  : 'All batches active'}
              </div>
            </div>

            {/* 2. Recent Average Daily Consumption & Period */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-500">
                2. Avg Daily Consumption
              </span>
              <div className="mt-1.5">
                <div className="text-xl font-bold font-mono text-slate-900">
                  {activeDeterministicForecast.recentAvgDailyConsumption ?? 'N/A'}{' '}
                  <span className="text-xs font-normal">{activeDeterministicForecast.unit}/d</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Period: Last {activeDeterministicForecast.consumptionPeriodDays} days
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-200/80 text-[10px] font-mono text-amber-800 font-bold">
                Active Burn: {activeDeterministicForecast.effectiveDailyDemand ?? 'N/A'}/d ({activeDeterministicForecast.demandSurgeMultiplier}x)
              </div>
            </div>

            {/* 3. Estimated Days Remaining & Stock-Out Date */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-500">
                3. Days Remaining &amp; Out Date
              </span>
              <div className="mt-1.5">
                <div className={`text-xl font-bold font-mono ${
                  activeDeterministicForecast.estimatedDaysRemaining !== null &&
                  activeDeterministicForecast.estimatedDaysRemaining <= activeDeterministicForecast.leadTimeDays
                    ? 'text-rose-700'
                    : 'text-slate-900'
                }`}>
                  {activeDeterministicForecast.estimatedDaysRemaining !== null
                    ? `${activeDeterministicForecast.estimatedDaysRemaining} Days`
                    : 'Not calculable'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Est. Out: <strong>{activeDeterministicForecast.estimatedStockoutDate ?? 'N/A'}</strong>
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-200/80 text-[10px] font-mono text-slate-700 font-bold">
                With Pipeline (+{activeDeterministicForecast.pendingInwardStock}): {activeDeterministicForecast.estimatedDaysWithPipeline ?? 'N/A'}d
              </div>
            </div>

            {/* 4. Lead Time & Safety Stock */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-500">
                4. Lead Time &amp; Safety Stock
              </span>
              <div className="mt-1.5">
                <div className="text-xl font-bold font-mono text-indigo-700">
                  {activeDeterministicForecast.leadTimeDays}d / {activeDeterministicForecast.safetyStock}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Lead-Time Demand: {activeDeterministicForecast.leadTimeDemand} {activeDeterministicForecast.unit}
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-200/80 text-[10px] font-mono text-indigo-900 font-bold">
                Safety Buffer: {activeDeterministicForecast.safetyBufferDays}d ({activeDeterministicForecast.safetyStock} {activeDeterministicForecast.unit})
              </div>
            </div>

            {/* 5. Reorder Point (ROP) */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-500">
                5. Reorder Point (ROP)
              </span>
              <div className="mt-1.5">
                <div className="text-xl font-bold font-mono text-slate-900">
                  {activeDeterministicForecast.reorderPoint} {activeDeterministicForecast.unit}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  D_LT ({activeDeterministicForecast.leadTimeDemand}) + SS ({activeDeterministicForecast.safetyStock})
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-200/80 text-[10px] font-mono font-bold text-slate-700">
                {activeDeterministicForecast.usableStock <= activeDeterministicForecast.reorderPoint
                  ? '● Below ROP (Reorder Now)'
                  : '● Above ROP Buffer'}
              </div>
            </div>

            {/* 6. Suggested Replenishment Quantity */}
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase text-emerald-900">
                6. Suggested Replenishment
              </span>
              <div className="mt-1.5">
                <div className="text-xl font-bold font-mono text-emerald-800">
                  +{activeDeterministicForecast.suggestedReplenishmentQty} {activeDeterministicForecast.unit}
                </div>
                <div className="text-[10px] text-emerald-800 mt-0.5">
                  Target ({activeDeterministicForecast.targetCycleDays}d): {activeDeterministicForecast.targetStockLevel} {activeDeterministicForecast.unit}
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-emerald-200/80 text-[10px] font-mono text-emerald-900 font-bold">
                Pack Multiple: {activeDeterministicForecast.packRoundingUnit} {activeDeterministicForecast.unit}
              </div>
            </div>
          </div>

          {/* Short Explanation of Main Risk + Visible Formulas & Assumptions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
            <div className={`lg:col-span-5 p-4 rounded-xl border flex flex-col justify-between ${
              activeDeterministicForecast.riskLevel === 'CRITICAL'
                ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                : activeDeterministicForecast.riskLevel === 'WARNING'
                ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            }`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/80 border border-current/20">
                    Main Risk Explanation • {activeDeterministicForecast.riskLevel}
                  </span>
                  <span className="font-mono text-[11px] font-bold">
                    Est. Out: {activeDeterministicForecast.estimatedStockoutDateFormatted}
                  </span>
                </div>
                <p className="leading-relaxed font-medium text-xs">
                  {activeDeterministicForecast.primaryRiskReason}
                </p>
                <div className="text-[11px] opacity-90 pt-1 border-t border-current/15 font-mono">
                  Period Used: {activeDeterministicForecast.consumptionPeriodLabel}
                </div>
              </div>

              {activeDeterministicForecast.suggestedReplenishmentQty > 0 && (
                <div className="pt-3 mt-3 border-t border-current/15 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await createOrder({
                        medicineName: activeFormularyMed.name,
                        quantityRequested: activeDeterministicForecast.suggestedReplenishmentQty,
                        priority:
                          activeDeterministicForecast.riskLevel === 'CRITICAL'
                            ? 'EMERGENCY_REPLENISHMENT'
                            : 'URGENT',
                        justification: activeDeterministicForecast.primaryRiskReason
                      });
                      if (ok) {
                        showNotification(
                          `Replenishment order created: ${activeDeterministicForecast.suggestedReplenishmentQty} ${activeDeterministicForecast.unit} of ${activeFormularyMed.name} for ${selectedPHC.name}.`
                        );
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Order Suggested {activeDeterministicForecast.suggestedReplenishmentQty} {activeDeterministicForecast.unit}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="lg:col-span-7 p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2">
              <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                <span>Visible Deterministic Formulas &amp; Explicit Assumptions</span>
                <span className="font-mono text-[10px] text-slate-500">Zero-Invention Arithmetic</span>
              </div>
              <div className="font-mono text-[11px] text-slate-700 space-y-1 bg-white p-2.5 rounded-lg border border-slate-200/80">
                <div>1. {activeDeterministicForecast.formulas.usableStockFormula}</div>
                <div>2. {activeDeterministicForecast.formulas.avgDailyConsumptionFormula}</div>
                <div>3. {activeDeterministicForecast.formulas.daysRemainingFormula}</div>
                <div>4. {activeDeterministicForecast.formulas.stockoutDateFormula}</div>
                <div>5. {activeDeterministicForecast.formulas.safetyStockFormula}</div>
                <div>6. {activeDeterministicForecast.formulas.reorderPointFormula}</div>
                <div>7. {activeDeterministicForecast.formulas.suggestedReplenishmentFormula}</div>
              </div>
              <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                {activeDeterministicForecast.formulas.assumptions.map((a, idx) => (
                  <div key={idx}>• {a}</div>
                ))}
              </div>
            </div>
          </div>

          {/* What-If Supply Disruption Simulation (Strictly Read-Only) */}
          {supplyDisruptionSimulation && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
              {/* Simulation Mode Header & Non-Mutation Guardrail Banner */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-indigo-900 text-white">
                      WHAT-IF SIMULATION ONLY • READ-ONLY
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-white text-indigo-900 border border-indigo-300">
                      Zero Inventory / Order / Transfer Mutation
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    Hypothetical Warehouse Delivery Delay &amp; Nearby PHC Safe Surplus Transfer Simulator
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    {supplyDisruptionSimulation.simulationNotice}
                  </p>
                </div>

                {/* Hypothetical Warehouse Delivery Delay Selector */}
                <div className="bg-white p-3 rounded-lg border border-indigo-200 shrink-0 space-y-1.5 min-w-[260px]">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="whatif-delay-range" className="font-bold text-slate-800">
                      Hypothetical Delivery Delay:
                    </label>
                    <span className="font-mono font-bold text-rose-700">
                      +{hypotheticalDelayDays.toFixed(1)} Days
                    </span>
                  </div>
                  <input
                    id="whatif-delay-range"
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={hypotheticalDelayDays}
                    onChange={(e) => setHypotheticalDelayDays(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    {[0, 2, 3, 5, 7].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setHypotheticalDelayDays(d)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border cursor-pointer transition-colors ${
                          hypotheticalDelayDays === d
                            ? 'bg-indigo-700 text-white border-indigo-700'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        +{d}d
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Current Scenario vs. Delayed-Delivery Scenario Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Current Scenario Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                      1. Current Scenario (No Delay)
                    </span>
                    <span className="font-mono text-[11px] font-bold text-slate-700">
                      Lead Time: {supplyDisruptionSimulation.currentScenario.leadTimeDays} Days
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 bg-white p-3 rounded-lg border border-slate-200/80">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">
                        On-Hand Stock-Out Date
                      </span>
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {supplyDisruptionSimulation.currentScenario.onHandStockoutDate ?? 'Not calculable'}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        ({supplyDisruptionSimulation.currentScenario.onHandDaysRemaining ?? 'N/A'}d usable stock)
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">
                        Est. Stock-Out (With {supplyDisruptionSimulation.currentScenario.leadTimeDays}d Delivery)
                      </span>
                      <span className="font-mono font-bold text-sm text-emerald-800">
                        {supplyDisruptionSimulation.currentScenario.effectiveStockoutDate ?? 'Not calculable'}
                      </span>
                      <span className="text-[10px] text-slate-600 block">
                        Arrival: {supplyDisruptionSimulation.currentScenario.expectedDeliveryDate}
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-700 font-mono flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span>
                      Current ROP: <strong>{supplyDisruptionSimulation.currentScenario.reorderPoint} {supplyDisruptionSimulation.unit}</strong>
                    </span>
                    <span>
                      Unprotected Gap:{' '}
                      <strong>
                        {supplyDisruptionSimulation.currentScenario.unprotectedGapDaysBeforeDelivery}d
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Delayed-Delivery Scenario Card */}
                <div
                  className={`p-4 rounded-xl border space-y-2.5 ${
                    supplyDisruptionSimulation.delayedScenario.stocksOutBeforeDeliveryArrives
                      ? 'bg-rose-50/70 border-rose-200'
                      : 'bg-amber-50/60 border-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-rose-200/80 text-rose-950">
                      2. Delayed-Delivery Scenario (+{supplyDisruptionSimulation.delayedScenario.delayDays}d Delay)
                    </span>
                    <span className="font-mono text-[11px] font-bold text-rose-900">
                      Total Lead Time: {supplyDisruptionSimulation.delayedScenario.totalLeadTimeDays} Days
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 bg-white p-3 rounded-lg border border-rose-200/80">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">
                        Est. Stock-Out (Delayed Scenario)
                      </span>
                      <span className="font-mono font-bold text-sm text-rose-700">
                        {supplyDisruptionSimulation.delayedScenario.effectiveStockoutDate ?? 'Not calculable'}
                      </span>
                      <span className="text-[10px] text-slate-600 block">
                        Delayed Truck: {supplyDisruptionSimulation.delayedScenario.expectedDeliveryDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">
                        Unprotected Deficit Before Truck
                      </span>
                      <span className="font-mono font-bold text-sm text-rose-800">
                        {supplyDisruptionSimulation.delayedScenario.unprotectedDeficitUnits}{' '}
                        {supplyDisruptionSimulation.unit}
                      </span>
                      <span className="text-[10px] text-rose-700 font-bold block">
                        Gap: {supplyDisruptionSimulation.delayedScenario.unprotectedGapDaysBeforeDelivery} days without stock
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-800 leading-relaxed">
                    {supplyDisruptionSimulation.delayedScenario.impactSummary}
                  </p>
                </div>
              </div>

              {/* Nearby PHC Surplus Eligibility & Safe Transfer Table */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                      <span>
                        Nearby PHC Surplus Assessment &amp; Safe Transfer Quantity (Donor Protected ≥ Safety Stock)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Evaluates peer PHCs for verified usable surplus of <strong>{supplyDisruptionSimulation.medicineName}</strong>. A donor is eligible only if its usable stock exceeds its own defined safety/reorder floor.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveModule('orders')}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-[11px] font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                    title="Navigate to the actual Orders & Inter-PHC Transfers workflow (does not mutate stock automatically)"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Open Actual Transfer Workflow</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-mono text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Candidate Donor PHC</th>
                        <th className="px-3 py-2 text-right">Usable Stock</th>
                        <th className="px-3 py-2 text-right">Donor Safety / ROP Floor</th>
                        <th className="px-3 py-2 text-right">Max Safe Surplus</th>
                        <th className="px-3 py-2 text-right">Possible Transfer Qty</th>
                        <th className="px-3 py-2 text-right">Donor Stock After</th>
                        <th className="px-3 py-2">Eligibility &amp; Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {supplyDisruptionSimulation.donorAssessments.map((donor) => (
                        <tr
                          key={donor.phcId}
                          className={donor.isEligible ? 'bg-emerald-50/30' : 'bg-white'}
                        >
                          <td className="px-3 py-2.5 font-bold text-slate-900">
                            <div>{donor.phcName}</div>
                            <div className="text-[10px] font-mono text-slate-500">
                              ~{donor.distanceKm} km transit
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                            {donor.usableStock} {supplyDisruptionSimulation.unit}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                            {donor.definedSafetyStock} {supplyDisruptionSimulation.unit}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-indigo-700">
                            {donor.maxSafeTransferQty} {supplyDisruptionSimulation.unit}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold">
                            {donor.isEligible ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                                {donor.possibleTransferQty} {supplyDisruptionSimulation.unit}
                              </span>
                            ) : (
                              <span className="text-slate-400">0 {supplyDisruptionSimulation.unit}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                            {donor.donorStockAfterTransfer} {supplyDisruptionSimulation.unit}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700 leading-snug max-w-md">
                            <span
                              className={`inline-block font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded mr-1.5 ${
                                donor.isEligible
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {donor.isEligible ? 'ELIGIBLE' : 'INELIGIBLE'}
                            </span>
                            <span>{donor.eligibilityExplanation}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Simulation Assumptions */}
                <div className="text-[11px] text-slate-600 bg-white p-3 rounded-lg border border-slate-200/80 space-y-0.5">
                  <div className="font-bold text-slate-800 mb-1">
                    What-If Simulation Assumptions &amp; Non-Mutation Rules:
                  </div>
                  {supplyDisruptionSimulation.assumptions.map((assumption, idx) => (
                    <div key={idx}>• {assumption}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Predictive Consumption Trend & Stockout Trajectory */}
      <PredictiveConsumptionTrend
        supplies={suppliesAnalysis}
        customTemp={customTemp}
        customHumidity={customHumidity}
        customFootfall={customFootfall}
        customLeadTime={customLeadTime}
        selectedScenarioName={`${selectedPHC.district} • ${regionalProfile.seasonLabel} (${activeScenarioName})`}
        onExecuteEmergencyIndent={handleCreateEmergencyIndent}
        onApproveLateralTransfer={handleApproveLateralTransfer}
        onOpenReorderModal={handleOpenCustomReorderModal}
        onShowNotification={showNotification}
        onDownloadReport={handleDownloadReport}
        isExportingPdf={isExportingPdf}
        selectedMedicineId={selectedMedicineId}
        onSelectMedicine={setSelectedMedicineId}
        thirtyDaySurgeCurve={regionalProfile.thirtyDaySurgeCurve}
      />

      {/* 6. Transparent Preparedness-Risk Calculation & Vulnerability Matrix */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Table Header & Explanation */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                {regionalProfile.zoneBadge} • {regionalProfile.seasonLabel}
              </span>
              <span className="text-xs text-slate-500 font-mono">Formula: Deficit Gap = Lead Time - (Stock / Surge Burn)</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-600" />
              <span>Preparedness Vulnerability Table &amp; Reorder Requisitions ({selectedPHC.name})</span>
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
              Correlated with <strong className="text-slate-800">{regionalProfile.warehouseHubName}</strong>
            </span>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" role="table">
            <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Medicine &amp; Demand Signal
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  <span className="block text-[9px] font-mono text-slate-500">[OBSERVED]</span>
                  Base / Current Burn
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  <span className="block text-[9px] font-mono text-amber-800">[FORECAST SIGNAL]</span>
                  Surge Burn
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  <span className="block text-[9px] font-mono text-indigo-700">[OBSERVED / CALC]</span>
                  Stock vs Safety Buffer
                </th>
                <th scope="col" className="px-3 py-3 text-center">
                  <span className="block text-[9px] font-mono text-indigo-700">[CALCULATED]</span>
                  Days &amp; Lead Deficit
                </th>
                <th scope="col" className="px-3 py-3 text-center">
                  <span className="block text-[9px] font-mono text-rose-800">[RISK LEVEL]</span>
                  Surge Risk
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  <span className="block text-[9px] font-mono text-emerald-800">[RECOMMENDATION]</span>
                  Review &amp; Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliesAnalysis.map((item) => {
                const surgePct = Math.round(
                  ((item.projectedDailyBurn - item.historicalBaseBurn) /
                    Math.max(1, item.historicalBaseBurn)) *
                    100
                );
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name, Category & Demand Signal */}
                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {item.category}
                      </div>
                      <div className="text-[11px] text-amber-900 bg-amber-50/80 border border-amber-200/80 rounded px-2 py-0.5 mt-1 line-clamp-2">
                        <strong>Signal:</strong> {item.clinicalDriverNote}
                      </div>
                    </td>

                    {/* Observed Base & Current Burn */}
                    <td className="px-3 py-3.5 text-right font-mono text-slate-700">
                      <div>
                        Base: <strong>{item.historicalBaseBurn}</strong> {item.unit}/d
                      </div>
                      <div className="text-[11px] text-slate-900 font-bold mt-0.5">
                        Logged: {item.currentBurn} {item.unit}/d
                      </div>
                    </td>

                    {/* Projected Weather Surge Burn */}
                    <td className="px-3 py-3.5 text-right font-mono text-rose-700 font-bold">
                      <div className="text-sm">{item.projectedDailyBurn} {item.unit}/d</div>
                      <div className="text-[10px] text-rose-800 font-sans">
                        +{surgePct}% seasonal surge
                      </div>
                    </td>

                    {/* Usable Stock Position vs Safety/Buffer Position */}
                    <td className="px-3 py-3.5 text-right font-mono">
                      <div className="text-sm font-bold text-slate-900">
                        Usable: {item.currentStock} {item.unit}
                      </div>
                      <div className="text-[10px] text-slate-600 font-sans">
                        Safety Stock: <strong>{item.safetyStock}</strong> • ROP: <strong>{item.reorderPoint}</strong>
                      </div>
                      {item.pendingOrders > 0 ? (
                        <div className="text-[10px] text-blue-700 font-sans font-semibold">
                          +{item.pendingOrders} in-transit
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 font-sans">
                          Min Buffer: {item.criticalBufferMin} {item.unit}
                        </div>
                      )}
                    </td>

                    {/* Days to Depletion & Lead Time Deficit Gap */}
                    <td className="px-3 py-3.5 text-center font-mono">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          item.daysOfSafeStock <= item.leadTimeDays
                            ? 'bg-rose-100 text-rose-950 border border-rose-300'
                            : item.daysOfSafeStock <= item.leadTimeDays * 1.8
                            ? 'bg-amber-100 text-amber-950 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                        }`}
                      >
                        {item.daysOfSafeStock} Days
                      </span>
                      <div className="mt-1 text-[11px]">
                        {item.deficitDays > 0 ? (
                          <span className="text-rose-700 font-bold flex items-center justify-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>-{item.deficitDays}d Deficit ({item.projectedDeficitUnits} {item.unit})</span>
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium">
                            +{Math.abs(item.deficitDays).toFixed(1)}d Buffer Safe
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Risk Score & Status Badge */}
                    <td className="px-3 py-3.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <StatusBadge status={item.urgency} />
                        <span
                          className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                            item.riskScore >= 70
                              ? 'bg-rose-100 text-rose-950'
                              : item.riskScore >= 45
                              ? 'bg-amber-100 text-amber-950'
                              : 'bg-emerald-100 text-emerald-950'
                          }`}
                        >
                          Score: {item.riskScore}/100
                        </span>
                      </div>
                    </td>

                    {/* Actions (Connected to Review Modal, WhyThisAlertModal, Inventory & Transfers) */}
                    <td className="px-3 py-3.5 text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="text-[10px] font-mono font-bold text-emerald-900">
                          Rec: +{item.recommendedReorder} {item.unit}
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenCustomReorderModal(item)}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                          >
                            <Truck className="w-3 h-3" />
                            <span>Review Replenishment</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setWhyAlertModalData({
                                title: `Surge Impact Assessment: ${item.shortName}`,
                                medicineName: item.name,
                                currentStock: item.currentStock,
                                unit: item.unit,
                                avgDailyConsumption: item.historicalBaseBurn,
                                recentTrendPercent: surgePct,
                                forecastDemand: item.projectedDailyBurn,
                                nextReplenishmentDays: customLeadTime,
                                safetyBufferDays: 3.0,
                                projectedRisk:
                                  item.urgency === 'CRITICAL'
                                    ? 'CRITICAL'
                                    : item.urgency === 'WARNING'
                                    ? 'HIGH'
                                    : 'MODERATE',
                                reason: `${regionalProfile.seasonLabel} (${selectedPHC.district}): ${item.clinicalDriverNote} (Safety Stock: ${item.safetyStock} ${item.unit}, ROP: ${item.reorderPoint} ${item.unit}).`,
                                onRemediate: () => handleOpenCustomReorderModal(item),
                                onLateralTransfer: item.linkedRedistId
                                  ? () =>
                                      handleApproveLateralTransfer(
                                        item.linkedRedistId!,
                                        item.shortName
                                      )
                                  : undefined
                              });
                              setIsWhyModalOpen(true);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Why this recommendation?"
                          >
                            <HelpCircle className="w-3 h-3 text-slate-600" />
                            <span>Why?</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-1">
                          {item.linkedRedistId && (
                            <button
                              type="button"
                              onClick={() =>
                                handleApproveLateralTransfer(item.linkedRedistId!, item.shortName)
                              }
                              className="px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <ArrowRightLeft className="w-2.5 h-2.5 text-teal-700" />
                              <span>Review Transfer Rec</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveModule('medicine')}
                            className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-semibold cursor-pointer"
                          >
                            Inventory →
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Formula Footnote Explanation */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              <strong>Transparent Formula:</strong> Projected Daily Burn = Historical Base × (1 + Regional Weather Anomaly × Drug Elasticity) × (Footfall Ratio). Stockout Gap = {regionalProfile.warehouseHubName} Lead Time ({customLeadTime}d) - (Stock / Projected Burn).
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
              <span>Surveillance Reasoning &amp; Logic Audits ({selectedPHC.district})</span>
            </h3>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-mono">
              {regionalProfile.seasonLabel}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Alert 1: Primary Vulnerable Medicine for this Geography & Season */}
            {suppliesAnalysis[0] && (
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-950 flex items-center gap-1.5 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>
                      Priority Alert: {suppliesAnalysis[0].shortName} Buffer Depletion ({selectedPHC.name})
                    </span>
                  </span>
                  <span className="font-mono text-[10px] font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded">
                    Risk Score: {suppliesAnalysis[0].riskScore}/100
                  </span>
                </div>

                <div className="text-slate-700 leading-relaxed space-y-1">
                  <p>
                    <strong>1. Observed Geographical Signal:</strong> In <strong>{selectedPHC.district} ({regionalProfile.zoneBadge})</strong>, {customTemp}°C ambient temperature and {customHumidity}% relative humidity during <strong>{regionalProfile.seasonLabel}</strong> have driven OPD footfall to {customFootfall} patients/day.
                  </p>
                  <p>
                    <strong>2. Syndromic Correlation (Non-Diagnostic):</strong> {suppliesAnalysis[0].clinicalDriverNote}
                  </p>
                  <p>
                    <strong>3. Supply Bottleneck:</strong> Current usable stock of <strong>{suppliesAnalysis[0].currentStock} {suppliesAnalysis[0].unit}</strong> at <strong>{suppliesAnalysis[0].projectedDailyBurn} {suppliesAnalysis[0].unit}/day</strong> projected surge depletion covers <strong>{suppliesAnalysis[0].daysOfSafeStock} days</strong> against a <strong>{customLeadTime}-day</strong> transit window from {regionalProfile.warehouseHubName}.
                  </p>
                  <p className="text-rose-900 font-bold pt-1 border-t border-rose-200/80">
                    Administrative Directive: Dispatch emergency indent of +{suppliesAnalysis[0].recommendedReorder} {suppliesAnalysis[0].unit} to {regionalProfile.warehouseHubName}.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWhyAlertModalData({
                        title: `Potential Stock-Out Risk: ${suppliesAnalysis[0].shortName} within ${suppliesAnalysis[0].daysOfSafeStock} Days`,
                        medicineName: suppliesAnalysis[0].name,
                        currentStock: suppliesAnalysis[0].currentStock,
                        unit: suppliesAnalysis[0].unit,
                        avgDailyConsumption: suppliesAnalysis[0].historicalBaseBurn,
                        recentTrendPercent: Math.round(
                          ((suppliesAnalysis[0].projectedDailyBurn - suppliesAnalysis[0].historicalBaseBurn) /
                            Math.max(1, suppliesAnalysis[0].historicalBaseBurn)) *
                            100
                        ),
                        forecastDemand: suppliesAnalysis[0].projectedDailyBurn,
                        nextReplenishmentDays: customLeadTime,
                        safetyBufferDays: 2.0,
                        projectedRisk: suppliesAnalysis[0].urgency === 'NORMAL' ? 'MODERATE' : 'HIGH',
                        reason: `${regionalProfile.seasonLabel} in ${selectedPHC.district} (${regionalProfile.zoneName}): ${suppliesAnalysis[0].clinicalDriverNote}`,
                        onRemediate: () => handleCreateEmergencyIndent(suppliesAnalysis[0]),
                        onLateralTransfer: suppliesAnalysis[0].linkedRedistId
                          ? () =>
                              handleApproveLateralTransfer(
                                suppliesAnalysis[0].linkedRedistId!,
                                suppliesAnalysis[0].shortName
                              )
                          : undefined
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
                    <span>Execute Emergency Indent (+{suppliesAnalysis[0].recommendedReorder})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModule('orders')}
                    className="px-3 py-1.5 bg-white border border-rose-300 text-rose-900 hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Inspect in Orders &amp; Logistics</span>
                  </button>
                </div>
              </div>
            )}

            {/* Alert 2: Secondary Vulnerable Medicine for this Geography & Season */}
            {suppliesAnalysis[1] && (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Secondary Alert: {suppliesAnalysis[1].shortName} Surge Pressure</span>
                  </span>
                  <span className="font-mono text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                    Risk Score: {suppliesAnalysis[1].riskScore}/100
                  </span>
                </div>

                <div className="text-slate-700 leading-relaxed space-y-1">
                  <p>
                    <strong>1. Observed Signal:</strong> Co-occurring syndromic presentations in <strong>{selectedPHC.district}</strong> during {regionalProfile.seasonLabel} have accelerated daily consumption of {suppliesAnalysis[1].shortName} from {suppliesAnalysis[1].historicalBaseBurn} to {suppliesAnalysis[1].projectedDailyBurn} {suppliesAnalysis[1].unit}/day.
                  </p>
                  <p>
                    <strong>2. Syndromic Correlation:</strong> {suppliesAnalysis[1].clinicalDriverNote}
                  </p>
                  <p>
                    <strong>3. Supply Bottleneck:</strong> Inventory stands at <strong>{suppliesAnalysis[1].currentStock} {suppliesAnalysis[1].unit}</strong> against a projected burn of <strong>{suppliesAnalysis[1].projectedDailyBurn} {suppliesAnalysis[1].unit}/day</strong> ({suppliesAnalysis[1].daysOfSafeStock} days cover vs {customLeadTime}d transit lead time).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWhyAlertModalData({
                        title: `High Alert: ${suppliesAnalysis[1].shortName} Buffer Depletion`,
                        medicineName: suppliesAnalysis[1].name,
                        currentStock: suppliesAnalysis[1].currentStock,
                        unit: suppliesAnalysis[1].unit,
                        avgDailyConsumption: suppliesAnalysis[1].historicalBaseBurn,
                        recentTrendPercent: Math.round(
                          ((suppliesAnalysis[1].projectedDailyBurn - suppliesAnalysis[1].historicalBaseBurn) /
                            Math.max(1, suppliesAnalysis[1].historicalBaseBurn)) *
                            100
                        ),
                        forecastDemand: suppliesAnalysis[1].projectedDailyBurn,
                        nextReplenishmentDays: customLeadTime,
                        safetyBufferDays: 2.0,
                        projectedRisk: 'HIGH',
                        reason: `${regionalProfile.seasonLabel} (${selectedPHC.district}): ${suppliesAnalysis[1].clinicalDriverNote}`,
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
                    <span>Draft {suppliesAnalysis[1].shortName} Indent (+{suppliesAnalysis[1].recommendedReorder})</span>
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
            )}
          </div>
        </div>

        {/* Right: Facility Readiness & Preparatory Action Plan Checklist */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Facility Action Readiness Checklist ({selectedPHC.district} • {regionalProfile.seasonLabel})</span>
              </h3>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                {completedActions.length}/{regionalProfile.recommendedActions.length} Completed
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {regionalProfile.recommendedActions.map((action, idx) => {
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
            <span>Protocol: IDSP &amp; DHS {selectedPHC.state} ({regionalProfile.zoneBadge})</span>
            <span className="font-mono text-emerald-700 font-bold">100% Cold Chain &amp; Buffer Audited</span>
          </div>
        </div>
      </div>

      {/* 8. Recharts Visual Comparison: Baseline vs Current vs Regional Seasonal Surge Burn */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>
                Comparative Burn Rate Acceleration — {selectedPHC.name} ({regionalProfile.seasonLabel})
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Contrasting Historical Baseline against Current Logged Burn and Projected {regionalProfile.seasonLabel} Surge Burn in {selectedPHC.district}.
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
              <Bar dataKey="projected" name={`Projected ${regionalProfile.seasonLabel} Burn`} fill="#dc2626" radius={[4, 4, 0, 0]} />
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
