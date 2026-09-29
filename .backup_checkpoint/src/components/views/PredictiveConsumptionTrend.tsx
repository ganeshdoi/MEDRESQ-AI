import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Truck,
  CheckCircle2,
  Info,
  Download,
  Filter,
  Sliders,
  ChevronRight,
  Flame,
  Activity,
  History,
  ArrowRightLeft,
  Bell,
  PackageCheck,
  CalendarRange,
  Gauge,
  FileDown,
  Loader2
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ReferenceArea
} from 'recharts';

export interface EvaluatedSupplyItem {
  id: string;
  name: string;
  shortName: string;
  unit: string;
  category: string;
  historicalBaseBurn: number;
  surgeMultiplier: number;
  criticalBufferMin: number;
  linkedRedistId: string | null;
  currentStock: number;
  pendingOrders: number;
  effectiveStock: number;
  currentBurn: number;
  projectedDailyBurn: number;
  daysOfSafeStock: number;
  leadTimeDays: number;
  deficitDays: number;
  projectedDeficitUnits: number;
  riskScore: number;
  urgency: 'CRITICAL' | 'WARNING' | 'NORMAL';
  recommendedReorder: number;
}

interface PredictiveConsumptionTrendProps {
  supplies: EvaluatedSupplyItem[];
  customTemp: number;
  customHumidity: number;
  customFootfall: number;
  customLeadTime: number;
  selectedScenarioName: string;
  onExecuteEmergencyIndent: (item: EvaluatedSupplyItem) => void;
  onApproveLateralTransfer: (redistId: string, name: string) => void;
  onOpenReorderModal: (item: EvaluatedSupplyItem) => void;
  onShowNotification: (msg: string) => void;
  onDownloadReport?: () => void;
  isExportingPdf?: boolean;
  selectedMedicineId?: string;
  onSelectMedicine?: (id: string) => void;
}

// 30-Day Seasonal historical surge multiplier curve for Rajasthan desert heatwave cycles
// Models: Initial temperature rise -> Extreme heatwave peak alert -> Convective dust-storm thermal plateau -> Late-season diurnal cooling
const SEASONAL_30DAY_SURGE_FACTORS = [
  1.00, // Day 0: Today
  1.08, 1.16, 1.28, 1.42, 1.60, 1.78, 1.95, 2.05, 2.10, // Days 1-9: Heatwave escalation & peak thermal stress
  2.08, 2.02, 1.94, 1.86, 1.80, 1.74, 1.68, 1.62, 1.58, 1.52, // Days 10-19: Sustained high thermal load
  1.48, 1.42, 1.38, 1.32, 1.28, 1.24, 1.20, 1.18, 1.15, 1.12  // Days 20-29: Late-season atmospheric stabilization
];

export const PredictiveConsumptionTrend: React.FC<PredictiveConsumptionTrendProps> = ({
  supplies,
  customTemp,
  customHumidity,
  customFootfall,
  customLeadTime,
  selectedScenarioName,
  onExecuteEmergencyIndent,
  onApproveLateralTransfer,
  onOpenReorderModal,
  onShowNotification,
  onDownloadReport,
  isExportingPdf = false,
  selectedMedicineId: controlledSelectedMedicineId,
  onSelectMedicine
}) => {
  // Selected Resource for deep analysis (uncontrolled fallback or controlled)
  const [internalSelectedMedicineId, setInternalSelectedMedicineId] = useState<string>(() => {
    return supplies[0]?.id || 'med-ors-osian';
  });

  const selectedMedicineId = controlledSelectedMedicineId !== undefined
    ? controlledSelectedMedicineId
    : internalSelectedMedicineId;

  const handleSelectMedicine = (id: string) => {
    setInternalSelectedMedicineId(id);
    onSelectMedicine?.(id);
  };

  // Visualization Mode: 'comparative' (30-day dual axis comparison), 'depletion', 'dailyBurn', 'cumulative'
  const [viewMode, setViewMode] = useState<'comparative' | 'depletion' | 'dailyBurn' | 'cumulative'>('comparative');

  // Forecast Horizon: 14d, 30d (Standard), 45d
  const [forecastHorizon, setForecastHorizon] = useState<14 | 30 | 45>(30);

  // Simulation Toggles
  const [showConfidenceBand, setShowConfidenceBand] = useState<boolean>(true);
  const [showHistoricalBenchmark, setShowHistoricalBenchmark] = useState<boolean>(true);
  const [simulatedIntervention, setSimulatedIntervention] = useState<'none' | 'pendingOrder' | 'lateralTransfer'>('none');

  // Currently inspected medicine item
  const activeSupply = useMemo(() => {
    return supplies.find((s) => s.id === selectedMedicineId) || supplies[0];
  }, [supplies, selectedMedicineId]);

  // Generate 30-day timeline dataset: 7 historical days + 30 predictive future days
  const timelineData = useMemo(() => {
    if (!activeSupply) return [];

    const baseBurn = activeSupply.historicalBaseBurn;
    const currentBurn = activeSupply.currentBurn;
    const projectedPeakBurn = activeSupply.projectedDailyBurn;
    const startingStock = activeSupply.currentStock;
    const buffer = activeSupply.criticalBufferMin;

    const leadTimeDays = customLeadTime;
    const arrivalDayIndex = Math.round(leadTimeDays);
    const pendingQty = activeSupply.pendingOrders > 0 ? activeSupply.pendingOrders : 500;
    const lateralQty = activeSupply.linkedRedistId ? 600 : 300;

    const dataPoints = [];

    // Base date: Sep 22, 2026
    const baseDate = new Date(2026, 8, 22);

    // Running cumulative stocks and cumulative consumptions
    let runningStockStatusQuo = startingStock;
    let runningStockMitigated = startingStock;
    let cumulativeProjected = 0;
    let cumulative2025 = 0;

    // 1. Past 7 Days (-7 to -1) - Historical recorded telemetry
    for (let offset = -7; offset <= -1; offset++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + offset);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const progress = (offset + 7) / 7;
      const actualBurn = Math.round(baseBurn + (currentBurn - baseBurn) * progress);
      const seasonal2025 = Math.round(baseBurn * (1.1 + Math.sin((offset + 7) / 2) * 0.25));
      const seasonal5YrAvg = Math.round(baseBurn * 1.05);

      dataPoints.push({
        offset,
        dayLabel: `Day ${offset}`,
        dateLabel: `${dateStr} (${offset}d)`,
        shortDate: dateStr,
        isFuture: false,
        isToday: false,
        actualBurn,
        projectedBurn: null,
        cumulativeBurn: null,
        confidenceUpper: null,
        confidenceLower: null,
        seasonal2025,
        cumulativeSeasonal2025: null,
        seasonal5YrAvg,
        currentInventoryLevel: startingStock,
        stockStatusQuo: null,
        stockMitigated: null,
        criticalBuffer: buffer
      });
    }

    // 2. Day 0 (Today) - Baseline pivot
    {
      const dateStr = baseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const seasonal2025 = Math.round(baseBurn * 1.35);
      const seasonal5YrAvg = Math.round(baseBurn * 1.08);

      cumulativeProjected = currentBurn;
      cumulative2025 = seasonal2025;

      dataPoints.push({
        offset: 0,
        dayLabel: 'Day 0',
        dateLabel: `${dateStr} (Today)`,
        shortDate: dateStr,
        isFuture: false,
        isToday: true,
        actualBurn: currentBurn,
        projectedBurn: currentBurn,
        cumulativeBurn: cumulativeProjected,
        confidenceUpper: currentBurn,
        confidenceLower: currentBurn,
        seasonal2025,
        cumulativeSeasonal2025: cumulative2025,
        seasonal5YrAvg,
        currentInventoryLevel: startingStock,
        stockStatusQuo: startingStock,
        stockMitigated: startingStock,
        criticalBuffer: buffer
      });
    }

    // 3. Future Days (+1 to +forecastHorizon, up to 30 or 45 days)
    for (let offset = 1; offset <= forecastHorizon; offset++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + offset);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Retrieve 30-day seasonal factor
      const factorIndex = Math.min(offset, SEASONAL_30DAY_SURGE_FACTORS.length - 1);
      const curveFactor = SEASONAL_30DAY_SURGE_FACTORS[factorIndex];

      // Day projected consumption for 2026 heatwave model
      const rampUp = Math.min(1.0, offset / 3.0);
      const dayProjectedBurn = Math.round(
        currentBurn + (projectedPeakBurn - currentBurn) * rampUp * (curveFactor / 1.55)
      );

      const confUpper = Math.round(dayProjectedBurn * 1.18);
      const confLower = Math.max(baseBurn, Math.round(dayProjectedBurn * 0.82));

      // 2025 historical heatwave consumption for the same calendar day (43.5°C benchmark)
      const seasonal2025 = Math.round(
        baseBurn * (1.25 + (curveFactor - 1.0) * 0.62)
      );
      // 5-Year Average Seasonal Baseline
      const seasonal5YrAvg = Math.round(baseBurn * (1.08 + Math.sin(offset / 4) * 0.12));

      cumulativeProjected += dayProjectedBurn;
      cumulative2025 += seasonal2025;

      // Deplete unmitigated stock (stops at 0)
      runningStockStatusQuo = Math.max(0, runningStockStatusQuo - dayProjectedBurn);

      // Deplete mitigated stock with interventions
      let interventionAddition = 0;
      if (simulatedIntervention === 'lateralTransfer' && offset === 1) {
        interventionAddition = lateralQty;
      } else if (simulatedIntervention === 'pendingOrder' && offset === arrivalDayIndex) {
        interventionAddition = pendingQty;
      }

      runningStockMitigated = Math.max(
        0,
        runningStockMitigated - dayProjectedBurn + interventionAddition
      );

      dataPoints.push({
        offset,
        dayLabel: `+${offset}d`,
        dateLabel: `${dateStr} (+${offset}d)`,
        shortDate: dateStr,
        isFuture: true,
        isToday: false,
        actualBurn: null,
        projectedBurn: dayProjectedBurn,
        cumulativeBurn: cumulativeProjected,
        confidenceUpper: confUpper,
        confidenceLower: confLower,
        seasonal2025,
        cumulativeSeasonal2025: cumulative2025,
        seasonal5YrAvg,
        currentInventoryLevel: startingStock, // Static initial stock level for horizontal comparison
        stockStatusQuo: runningStockStatusQuo, // Dynamic declining inventory
        stockMitigated: runningStockMitigated,
        criticalBuffer: buffer
      });
    }

    return dataPoints;
  }, [activeSupply, customLeadTime, forecastHorizon, simulatedIntervention]);

  // 30-Day Aggregated Demand vs Inventory Analysis
  const thirtyDayMetrics = useMemo(() => {
    if (!activeSupply) return null;

    const startingStock = activeSupply.currentStock;
    const futurePoints = timelineData.filter((d) => d.isFuture || d.isToday);

    // Sum total 30-day projected demand
    const total30DayDemand = futurePoints.reduce((acc, d) => acc + (d.projectedBurn || 0), 0);
    // Sum total 30-day historical 2025 demand
    const total30DayHistorical2025 = futurePoints.reduce((acc, d) => acc + (d.seasonal2025 || 0), 0);
    // Sum total 30-day 5-year average demand
    const total30Day5YrAvg = futurePoints.reduce((acc, d) => acc + (d.seasonal5YrAvg || 0), 0);

    // Stockout day intercept (first day stockStatusQuo reaches 0)
    const stockoutPoint = timelineData.find((d) => d.isFuture && d.stockStatusQuo === 0);
    const stockoutDayOffset = stockoutPoint ? stockoutPoint.offset : null;

    // Fractional days to stockout
    const daysToStockout =
      activeSupply.projectedDailyBurn > 0
        ? parseFloat((startingStock / activeSupply.projectedDailyBurn).toFixed(1))
        : 99;

    const baseDate = new Date(2026, 8, 22);
    const stockoutMs = baseDate.getTime() + daysToStockout * 24 * 60 * 60 * 1000;
    const stockoutDateObj = new Date(stockoutMs);
    const stockoutDate = stockoutDateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const net30DayDeficit = Math.max(0, total30DayDemand - startingStock);
    const surgeVsHistoricalPercent = Math.round(
      ((total30DayDemand - total30DayHistorical2025) / total30DayHistorical2025) * 100
    );

    return {
      startingStock,
      total30DayDemand,
      total30DayHistorical2025,
      total30Day5YrAvg,
      net30DayDeficit,
      daysToStockout,
      stockoutDate,
      stockoutDayOffset,
      surgeVsHistoricalPercent,
      leadTimeGapHours: Math.max(0, Math.round((customLeadTime - daysToStockout) * 24))
    };
  }, [activeSupply, timelineData, customLeadTime]);

  const handleExportForecast = () => {
    const csvHeader =
      'Day_Offset,Date,Actual_Burn,Projected_Burn,Cumulative_Demand,Historical_2025_Demand,Cumulative_2025,Historical_5Yr_Avg,Current_Inventory_Remaining,Initial_Stock_Level,Critical_Safety_Buffer\n';
    const csvRows = timelineData
      .map(
        (d) =>
          `${d.offset},"${d.shortDate}",${d.actualBurn ?? ''},${d.projectedBurn ?? ''},${d.cumulativeBurn ?? ''},${d.seasonal2025 ?? ''},${d.cumulativeSeasonal2025 ?? ''},${d.seasonal5YrAvg ?? ''},${d.stockStatusQuo !== null ? d.stockStatusQuo : ''},${d.currentInventoryLevel},${d.criticalBuffer}`
      )
      .join('\n');

    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `30day_consumption_forecast_${activeSupply.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    onShowNotification(
      `Exported 30-Day Predictive Consumption & Inventory Dataset (${activeSupply.shortName}) to CSV.`
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden space-y-0">
      {/* 1. Header Bar with Resource Switcher & Predictive Intelligence Badge */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300 uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3 h-3 text-rose-600" />
                <span>30-Day Predictive Trend Engine</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Recharts Multi-Axis Epidemiological Correlation
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-rose-600" />
              <span>30-Day Resource Consumption Predictive Trend & Inventory Comparison</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5 max-w-3xl">
              Visualizing a 30-day predictive trajectory for resource consumption, juxtaposing historical seasonal demand patterns (2022–2025) directly against current inventory levels and minimum critical buffers.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {onDownloadReport && (
              <button
                type="button"
                onClick={onDownloadReport}
                disabled={isExportingPdf}
                className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                title="Download 30-day predictive trend chart & risk alert audit as PDF"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 text-rose-200" />
                )}
                <span>{isExportingPdf ? 'Exporting PDF...' : 'Download Report'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleExportForecast}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export 30-Day CSV</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenReorderModal(activeSupply)}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 text-emerald-200" />
              <span>Reorder {activeSupply.shortName}</span>
            </button>
          </div>
        </div>

        {/* Resource Selector Tabs */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-500 shrink-0 uppercase tracking-wider">
            Select Resource:
          </span>
          {supplies.map((item) => {
            const isSelected = item.id === selectedMedicineId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectMedicine(item.id)}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer text-xs border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                <span>{item.shortName}</span>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-extrabold ${
                    item.urgency === 'CRITICAL'
                      ? 'bg-rose-500 text-white'
                      : item.urgency === 'WARNING'
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-500 text-white'
                  }`}
                >
                  {item.daysOfSafeStock}d runway
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Key 30-Day Comparative Metrics Cards */}
      {thirtyDayMetrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-5 bg-white border-b border-slate-200/80">
          {/* Metric 1: 30-Day Demand vs Current Stock */}
          <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-rose-950">
              <span>30-Day Projected Demand</span>
              <Activity className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold font-mono text-rose-700">
                {thirtyDayMetrics.total30DayDemand.toLocaleString()}{' '}
                <span className="text-xs font-normal text-rose-900">{activeSupply.unit}</span>
              </div>
              <div className="text-[11px] font-semibold text-rose-900 mt-0.5">
                Current Inventory: <strong>{thirtyDayMetrics.startingStock} {activeSupply.unit}</strong>
              </div>
            </div>
            <div className="mt-2 pt-1.5 border-t border-rose-200/80 text-[10px] text-rose-800 font-mono font-bold flex items-center justify-between">
              <span>30-Day Net Deficit:</span>
              <span className="bg-rose-200 text-rose-950 px-1.5 py-0.5 rounded font-extrabold">
                -{thirtyDayMetrics.net30DayDeficit.toLocaleString()} {activeSupply.unit}
              </span>
            </div>
          </div>

          {/* Metric 2: Inventory Stockout Intercept Point */}
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-amber-950">
              <span>Current Stock Exhaustion</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold font-mono text-amber-700">
                {thirtyDayMetrics.daysToStockout} Days
              </div>
              <div className="text-[11px] font-semibold text-amber-900 mt-0.5">
                Zero Stock Intercept: <strong>{thirtyDayMetrics.stockoutDate}</strong>
              </div>
            </div>
            <div className="mt-2 pt-1.5 border-t border-amber-200/80 text-[10px] text-amber-800 font-mono font-bold flex items-center justify-between">
              <span>Lead-Time Gap:</span>
              <span className="text-rose-700 font-bold">
                {thirtyDayMetrics.leadTimeGapHours > 0
                  ? `${thirtyDayMetrics.leadTimeGapHours} hrs unsecured`
                  : 'Buffer secured'}
              </span>
            </div>
          </div>

          {/* Metric 3: Historical Seasonal Surge Comparison */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>Historical Seasonal Surge</span>
              <History className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold font-mono text-slate-900">
                +{thirtyDayMetrics.surgeVsHistoricalPercent}%{' '}
                <span className="text-xs font-normal text-slate-500">vs 2025</span>
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                2025 Total Wave: <strong>{thirtyDayMetrics.total30DayHistorical2025.toLocaleString()} {activeSupply.unit}</strong>
              </div>
            </div>
            <div className="mt-2 pt-1.5 border-t border-slate-200 text-[10px] text-slate-700 font-mono font-bold flex items-center justify-between">
              <span>5-Yr Seasonal Baseline:</span>
              <span>{thirtyDayMetrics.total30Day5YrAvg.toLocaleString()} {activeSupply.unit}</span>
            </div>
          </div>

          {/* Metric 4: Recommended Buffer Requisition */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
              <span>30-Day Buffer Requisition</span>
              <ShieldAlert className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold font-mono text-emerald-800">
                +{activeSupply.recommendedReorder}{' '}
                <span className="text-xs font-normal text-slate-500">{activeSupply.unit}</span>
              </div>
              <div className="text-[11px] font-semibold text-emerald-900 mt-0.5">
                Guarantees 30-Day Critical Resilience
              </div>
            </div>
            <div className="mt-2 pt-1.5 border-t border-emerald-200/80 text-[10px] text-emerald-800 font-mono font-bold flex items-center justify-between">
              <span>Critical Buffer Floor:</span>
              <span>{activeSupply.criticalBufferMin} {activeSupply.unit}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Interactive Visualization Perspective Tabs & Settings */}
      <div className="p-4 sm:p-5 bg-white border-b border-slate-200/80 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          {/* View Perspective Switcher */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('comparative')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'comparative'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📊 30-Day Integrated Comparison (Demand vs Historical vs Inventory)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('depletion')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'depletion'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📉 Inventory Depletion Runway
            </button>
            <button
              type="button"
              onClick={() => setViewMode('dailyBurn')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'dailyBurn'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📈 Daily Burn vs Seasonal Waves
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cumulative')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'cumulative'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📈 Cumulative Consumption Crossover
            </button>
          </div>

          {/* Forecast Horizon Switcher */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <CalendarRange className="w-3.5 h-3.5" />
              Forecast Horizon:
            </span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 font-mono font-bold text-xs">
              <button
                type="button"
                onClick={() => setForecastHorizon(14)}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  forecastHorizon === 14 ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                14d
              </button>
              <button
                type="button"
                onClick={() => setForecastHorizon(30)}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  forecastHorizon === 30
                    ? 'bg-rose-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                30d (Standard)
              </button>
              <button
                type="button"
                onClick={() => setForecastHorizon(45)}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  forecastHorizon === 45 ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                45d
              </button>
            </div>
          </div>
        </div>

        {/* Simulation Options & Layers */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={showHistoricalBenchmark}
                onChange={(e) => setShowHistoricalBenchmark(e.target.checked)}
                className="rounded accent-amber-600"
              />
              <span>Overlay 2025 Seasonal Heatwave Benchmark (43.5°C)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={showConfidenceBand}
                onChange={(e) => setShowConfidenceBand(e.target.checked)}
                className="rounded accent-rose-600"
              />
              <span>Climate Sensitivity Envelope (±18%)</span>
            </label>
          </div>

          {/* Intervention Simulation Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600">Intervention Simulation:</span>
            <select
              value={simulatedIntervention}
              onChange={(e) => setSimulatedIntervention(e.target.value as any)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="none">Status Quo (No Action - Rapid Stockout)</option>
              <option value="pendingOrder">
                RMSCL Scheduled Indent (+{activeSupply.pendingOrders || 500} on Day {Math.round(customLeadTime)})
              </option>
              {activeSupply.linkedRedistId && (
                <option value="lateralTransfer">
                  Sister-PHC Lateral Transfer (+600 from Mandore on Day 1)
                </option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* 4. Main Recharts Visualization Canvas */}
      <div className="p-4 sm:p-6 bg-white space-y-4">
        <div
          id="predictive-trend-chart-container"
          data-chart-container="predictive-trend"
          className="h-96 w-full text-xs bg-white"
        >
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'comparative' ? (
              // 1. Dual-Axis Integrated Comparison View (Daily Demand vs Historical vs Current Inventory)
              <ComposedChart
                data={timelineData}
                margin={{ top: 20, right: 35, left: 10, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="invRunwayFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="confBandFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="shortDate"
                  tick={{ fontSize: 11 }}
                  stroke="#64748b"
                  interval={Math.ceil(timelineData.length / 12)}
                />

                {/* Left Y-Axis: Daily Consumption Rate */}
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11 }}
                  stroke="#e11d48"
                  label={{
                    value: `Daily Demand (${activeSupply.unit}/day)`,
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 11, fill: '#e11d48', fontWeight: 600 }
                  }}
                />

                {/* Right Y-Axis: Current Inventory Level Remaining */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  stroke="#0d9488"
                  label={{
                    value: `Current Inventory Level (${activeSupply.unit})`,
                    angle: 90,
                    position: 'insideRight',
                    style: { fontSize: 11, fill: '#0d9488', fontWeight: 600 }
                  }}
                />

                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl text-xs space-y-2 border border-slate-700 min-w-64">
                        <div className="font-bold flex items-center justify-between border-b border-slate-700 pb-1.5">
                          <span>{item.dateLabel}</span>
                          {item.isToday && (
                            <span className="text-[10px] bg-emerald-700 px-1.5 py-0.2 rounded font-mono font-extrabold">
                              TODAY
                            </span>
                          )}
                        </div>

                        {/* Demand Metrics */}
                        <div className="space-y-1">
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Daily Consumption Rates:
                          </div>
                          {item.actualBurn !== null && (
                            <div className="flex items-center justify-between">
                              <span className="text-sky-300">Recorded Burn:</span>
                              <span className="font-mono font-bold text-sky-200">
                                {item.actualBurn} {activeSupply.unit}/day
                              </span>
                            </div>
                          )}
                          {item.projectedBurn !== null && (
                            <div className="flex items-center justify-between">
                              <span className="text-rose-300 font-bold">Predictive 30-Day Trend:</span>
                              <span className="font-mono font-bold text-rose-200">
                                {item.projectedBurn} {activeSupply.unit}/day
                              </span>
                            </div>
                          )}
                          {item.seasonal2025 && (
                            <div className="flex items-center justify-between">
                              <span className="text-amber-300">2025 Historical Wave:</span>
                              <span className="font-mono text-amber-200">
                                {item.seasonal2025} {activeSupply.unit}/day
                              </span>
                            </div>
                          )}
                          {item.seasonal5YrAvg && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">5-Yr Seasonal Baseline:</span>
                              <span className="font-mono text-slate-300">
                                {item.seasonal5YrAvg} {activeSupply.unit}/day
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Inventory Remaining Metrics */}
                        <div className="pt-1.5 border-t border-slate-800 space-y-1">
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Current Inventory Status:
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-teal-300">Remaining Physical Stock:</span>
                            <span className="font-mono font-bold text-teal-200">
                              {item.stockStatusQuo !== null ? `${item.stockStatusQuo} ${activeSupply.unit}` : `${item.currentInventoryLevel} ${activeSupply.unit}`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Initial On-Hand Stock:</span>
                            <span className="font-mono text-slate-300">
                              {activeSupply.currentStock} {activeSupply.unit}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-rose-400">Critical Safety Floor:</span>
                            <span className="font-mono text-rose-300">
                              {activeSupply.criticalBufferMin} {activeSupply.unit}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                {/* Vertical Reference: Today */}
                <ReferenceLine
                  yAxisId="left"
                  x={timelineData[7]?.shortDate}
                  stroke="#059669"
                  strokeWidth={2}
                  label={{
                    value: 'Today',
                    fill: '#059669',
                    fontSize: 10,
                    position: 'top'
                  }}
                />

                {/* Static Initial Inventory Level Line on Right Axis */}
                <ReferenceLine
                  yAxisId="right"
                  y={activeSupply.currentStock}
                  label={{
                    value: `Current Stock Level (${activeSupply.currentStock})`,
                    fill: '#0284c7',
                    fontSize: 10,
                    position: 'insideTopRight'
                  }}
                  stroke="#0284c7"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />

                {/* Critical Safety Buffer on Right Axis */}
                <ReferenceLine
                  yAxisId="right"
                  y={activeSupply.criticalBufferMin}
                  label={{
                    value: `Critical Buffer Min (${activeSupply.criticalBufferMin})`,
                    fill: '#dc2626',
                    fontSize: 10,
                    position: 'insideBottomRight'
                  }}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />

                {/* Right Axis: Current Inventory Depletion Curve */}
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="stockStatusQuo"
                  name="Current Inventory Depletion Runway"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  fill="url(#invRunwayFill)"
                  dot={{ r: 2, fill: '#0d9488' }}
                />

                {/* Left Axis: Sensitivity Band */}
                {showConfidenceBand && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="confidenceUpper"
                    name="Demand Sensitivity Bound (+18%)"
                    stroke="none"
                    fill="url(#confBandFill)"
                  />
                )}

                {/* Left Axis: Historical 5-Year Baseline */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="seasonal5YrAvg"
                  name="5-Yr Seasonal Baseline (Historical)"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                  dot={false}
                />

                {/* Left Axis: 2025 Seasonal Heatwave Benchmark */}
                {showHistoricalBenchmark && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="seasonal2025"
                    name="2025 Seasonal Heatwave Spike (Historical Benchmark)"
                    stroke="#d97706"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                )}

                {/* Left Axis: Actual Logged Burn */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="actualBurn"
                  name="Actual Consumption (-7d to Today)"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#0284c7' }}
                />

                {/* Left Axis: 30-Day Predictive Consumption Trend Line */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="projectedBurn"
                  name="30-Day Predictive Consumption Trend Line (2026 Model)"
                  stroke="#e11d48"
                  strokeWidth={3.5}
                  dot={{ r: 3, fill: '#e11d48' }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            ) : viewMode === 'cumulative' ? (
              // 2. Cumulative 30-Day Demand vs Current Inventory Level Crossover
              <ComposedChart
                data={timelineData.filter((d) => d.isFuture || d.isToday)}
                margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="shortDate" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#64748b"
                  label={{
                    value: `Cumulative Units (${activeSupply.unit})`,
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 11, fill: '#64748b' }
                  }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload;
                    const deficit = (item.cumulativeBurn || 0) - activeSupply.currentStock;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-56">
                        <div className="font-bold border-b border-slate-700 pb-1">
                          {item.dateLabel}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-rose-300">Cumulative 2026 Demand:</span>
                          <span className="font-mono font-bold text-rose-200">
                            {item.cumulativeBurn} {activeSupply.unit}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-amber-300">Cumulative 2025 Benchmark:</span>
                          <span className="font-mono text-amber-200">
                            {item.cumulativeSeasonal2025} {activeSupply.unit}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-teal-300">Current Inventory Available:</span>
                          <span className="font-mono font-bold text-teal-200">
                            {activeSupply.currentStock} {activeSupply.unit}
                          </span>
                        </div>
                        <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[11px]">
                          <span>Net Inventory Gap:</span>
                          <span className={deficit > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                            {deficit > 0 ? `-${deficit} ${activeSupply.unit} Deficit` : 'Covered'}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                {/* Current Inventory Level Reference Line */}
                <ReferenceLine
                  y={activeSupply.currentStock}
                  label={{
                    value: `Current On-Hand Stock (${activeSupply.currentStock} ${activeSupply.unit})`,
                    fill: '#0d9488',
                    fontSize: 10,
                    position: 'insideTopLeft'
                  }}
                  stroke="#0d9488"
                  strokeWidth={2}
                />

                {/* 2025 Cumulative Demand */}
                <Line
                  type="monotone"
                  dataKey="cumulativeSeasonal2025"
                  name="Cumulative 2025 Seasonal Benchmark"
                  stroke="#d97706"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />

                {/* 2026 Predictive Cumulative Demand */}
                <Line
                  type="monotone"
                  dataKey="cumulativeBurn"
                  name="30-Day Cumulative Predictive Demand"
                  stroke="#e11d48"
                  strokeWidth={3}
                  dot={{ r: 2, fill: '#e11d48' }}
                />
              </ComposedChart>
            ) : viewMode === 'depletion' ? (
              // 3. Inventory Depletion Runway
              <ComposedChart
                data={timelineData}
                margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="depletionFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e11d48" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="mitigatedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="shortDate"
                  tick={{ fontSize: 11 }}
                  stroke="#64748b"
                  interval={Math.ceil(timelineData.length / 10)}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#64748b"
                  label={{
                    value: `Stock Remaining (${activeSupply.unit})`,
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 11, fill: '#64748b' }
                  }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-56">
                        <div className="font-bold flex items-center justify-between border-b border-slate-700 pb-1">
                          <span>{item.dateLabel}</span>
                          {item.isToday && (
                            <span className="text-[10px] bg-emerald-700 px-1.5 py-0.2 rounded font-mono">
                              TODAY
                            </span>
                          )}
                        </div>

                        {item.stockStatusQuo !== null && (
                          <div className="flex items-center justify-between">
                            <span className="text-rose-300">Status Quo Stock:</span>
                            <span className="font-mono font-bold text-rose-200">
                              {item.stockStatusQuo} {activeSupply.unit}
                            </span>
                          </div>
                        )}

                        {simulatedIntervention !== 'none' && item.stockMitigated !== null && (
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-300">Mitigated Trajectory:</span>
                            <span className="font-mono font-bold text-emerald-200">
                              {item.stockMitigated} {activeSupply.unit}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Critical Safety Buffer:</span>
                          <span className="font-mono font-bold text-slate-300">
                            {item.criticalBuffer} {activeSupply.unit}
                          </span>
                        </div>

                        {item.projectedBurn && (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                            <span className="text-amber-300">Projected Daily Burn:</span>
                            <span className="font-mono text-amber-200">
                              {item.projectedBurn} / day
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                {/* Critical Buffer Safety Level */}
                <ReferenceLine
                  y={activeSupply.criticalBufferMin}
                  label={{
                    value: `Critical Buffer Min (${activeSupply.criticalBufferMin})`,
                    fill: '#dc2626',
                    fontSize: 10,
                    position: 'insideBottomRight'
                  }}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />

                {/* Warehouse Delivery Lead Time Arrival Line */}
                <ReferenceLine
                  x={timelineData[7 + Math.round(customLeadTime)]?.shortDate}
                  label={{
                    value: `RMSCL Delivery (Day ${customLeadTime})`,
                    fill: '#2563eb',
                    fontSize: 10,
                    position: 'top'
                  }}
                  stroke="#2563eb"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                />

                {/* Status Quo Depletion Curve */}
                <Area
                  type="monotone"
                  dataKey="stockStatusQuo"
                  name="Unmitigated Stock Depletion (Status Quo)"
                  stroke="#e11d48"
                  strokeWidth={2.5}
                  fill="url(#depletionFill)"
                  dot={{ r: 2, fill: '#e11d48' }}
                  activeDot={{ r: 5 }}
                />

                {/* Mitigated Curve (if active) */}
                {simulatedIntervention !== 'none' && (
                  <Area
                    type="monotone"
                    dataKey="stockMitigated"
                    name={`Mitigated Stock Trajectory (${
                      simulatedIntervention === 'lateralTransfer'
                        ? 'With Inter-PHC Lateral Transfer'
                        : 'With RMSCL Indent Delivery'
                    })`}
                    stroke="#059669"
                    strokeWidth={2.5}
                    fill="url(#mitigatedFill)"
                    dot={{ r: 2, fill: '#059669' }}
                    activeDot={{ r: 5 }}
                  />
                )}
              </ComposedChart>
            ) : (
              // 4. Daily Consumption vs Historical Seasonal Waves
              <ComposedChart
                data={timelineData}
                margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="confidenceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="shortDate"
                  tick={{ fontSize: 11 }}
                  stroke="#64748b"
                  interval={Math.ceil(timelineData.length / 10)}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#64748b"
                  label={{
                    value: `Daily Consumption (${activeSupply.unit}/day)`,
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 11, fill: '#64748b' }
                  }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-56">
                        <div className="font-bold flex items-center justify-between border-b border-slate-700 pb-1">
                          <span>{item.dateLabel}</span>
                          {item.isToday && (
                            <span className="text-[10px] bg-emerald-700 px-1.5 py-0.2 rounded font-mono">
                              TODAY
                            </span>
                          )}
                        </div>

                        {item.actualBurn !== null && (
                          <div className="flex items-center justify-between">
                            <span className="text-sky-300">Actual Logged Burn:</span>
                            <span className="font-mono font-bold text-sky-200">
                              {item.actualBurn} / day
                            </span>
                          </div>
                        )}

                        {item.projectedBurn !== null && (
                          <div className="flex items-center justify-between">
                            <span className="text-rose-300">Projected Heatwave Burn:</span>
                            <span className="font-mono font-bold text-rose-200">
                              {item.projectedBurn} / day
                            </span>
                          </div>
                        )}

                        {item.seasonal2025 && (
                          <div className="flex items-center justify-between">
                            <span className="text-amber-300">2025 Historical Wave:</span>
                            <span className="font-mono font-bold text-amber-200">
                              {item.seasonal2025} / day
                            </span>
                          </div>
                        )}

                        {item.seasonal5YrAvg && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">5-Yr Seasonal Baseline:</span>
                            <span className="font-mono text-slate-300">
                              {item.seasonal5YrAvg} / day
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                <ReferenceLine
                  x={timelineData[7]?.shortDate}
                  label={{
                    value: 'Today (Telemetry Baseline)',
                    fill: '#059669',
                    fontSize: 10,
                    position: 'top'
                  }}
                  stroke="#059669"
                  strokeWidth={2}
                />

                {showConfidenceBand && (
                  <Area
                    type="monotone"
                    dataKey="confidenceUpper"
                    name="Climate Sensitivity Upper Bound (+18%)"
                    stroke="none"
                    fill="url(#confidenceFill)"
                  />
                )}

                <Line
                  type="monotone"
                  dataKey="seasonal5YrAvg"
                  name="5-Yr Historical Seasonal Baseline"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                  dot={false}
                />

                {showHistoricalBenchmark && (
                  <Line
                    type="monotone"
                    dataKey="seasonal2025"
                    name="2025 Seasonal Heatwave Spike (43.5°C Benchmark)"
                    stroke="#d97706"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                )}

                <Line
                  type="monotone"
                  dataKey="actualBurn"
                  name="Actual Recorded Consumption (-7d to Today)"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#0284c7' }}
                />

                <Line
                  type="monotone"
                  dataKey="projectedBurn"
                  name="Predictive Climate Surge Trend (2026 Model)"
                  stroke="#e11d48"
                  strokeWidth={3}
                  dot={{ r: 3, fill: '#e11d48' }}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* 5. Annotated Interpretation & Administrative Directive Footer */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div className="text-slate-700 leading-relaxed text-[11px]">
              <strong>30-Day Epidemiological Directive:</strong> Over the 30-day outlook, total projected demand for <strong>{activeSupply.name}</strong> is <strong>{thirtyDayMetrics?.total30DayDemand.toLocaleString()} {activeSupply.unit}</strong> against an initial inventory of only <strong>{activeSupply.currentStock} {activeSupply.unit}</strong>. Without requisition or lateral redistribution, current inventory is breached on <strong>{thirtyDayMetrics?.stockoutDate}</strong>, falling short by <strong>{thirtyDayMetrics?.net30DayDeficit.toLocaleString()} {activeSupply.unit}</strong>.
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeSupply.linkedRedistId && (
              <button
                type="button"
                onClick={() => onApproveLateralTransfer(activeSupply.linkedRedistId!, activeSupply.shortName)}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-700" />
                <span>Request Sister-PHC Transfer</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onExecuteEmergencyIndent(activeSupply)}
              className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Dispatch Emergency Indent</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
