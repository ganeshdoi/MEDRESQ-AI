import React from 'react';
import {
  X,
  AlertTriangle,
  Clock,
  Package,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Truck,
  ArrowRightLeft,
  CheckCircle2,
  Info
} from 'lucide-react';

export interface AlertMathBreakdown {
  title?: string;
  medicineName?: string;
  currentStock: number;
  unit?: string;
  avgDailyConsumption: number;
  recentTrendPercent: number;
  forecastDemand: number;
  nextReplenishmentDays: number;
  safetyBufferDays: number;
  projectedRisk: 'CRITICAL' | 'HIGH' | 'WARNING' | 'MODERATE' | 'LOW';
  reason: string;
  onRemediate?: () => void;
  onLateralTransfer?: () => void;
}

interface WhyThisAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: AlertMathBreakdown | null;
}

export const WhyThisAlertModal: React.FC<WhyThisAlertModalProps> = ({
  isOpen,
  onClose,
  data
}) => {
  if (!isOpen) return null;

  // Default to the exact scenario specified by the clinical telemetry
  const breakdown: AlertMathBreakdown = data || {
    title: 'Potential Stock-Out Risk: ORS Sachets',
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
      'Current projected consumption exceeds available stock before expected replenishment.'
  };

  const {
    title = 'Potential Stock-Out Risk: ORS Sachets',
    medicineName = 'Oral Rehydration Salts (ORS) Sachets 20.5g',
    currentStock = 210,
    unit = 'units',
    avgDailyConsumption = 58,
    recentTrendPercent = 21,
    forecastDemand = 67,
    nextReplenishmentDays = 3.9,
    safetyBufferDays = 1.5,
    projectedRisk = 'HIGH',
    reason = 'Current projected consumption exceeds available stock before expected replenishment.',
    onRemediate,
    onLateralTransfer
  } = breakdown;

  // Safe mathematical derivations
  const safeStock = Number.isFinite(currentStock) && currentStock >= 0 ? currentStock : 0;
  const safeAvgDaily = Number.isFinite(avgDailyConsumption) && avgDailyConsumption >= 0 ? avgDailyConsumption : 0;
  const safeForecastDemand = Number.isFinite(forecastDemand) && forecastDemand > 0 ? forecastDemand : safeAvgDaily;
  const safeLeadTime = Number.isFinite(nextReplenishmentDays) && nextReplenishmentDays > 0 ? nextReplenishmentDays : 3.5;
  const safeBuffer = Number.isFinite(safetyBufferDays) && safetyBufferDays >= 0 ? safetyBufferDays : 3.0;

  const runwayDays = safeForecastDemand > 0 ? parseFloat((safeStock / safeForecastDemand).toFixed(1)) : null;
  const rawGapDays = runwayDays !== null ? parseFloat((safeLeadTime - runwayDays).toFixed(1)) : 0;
  const stockoutGapDays = Math.max(0, rawGapDays);
  const stockoutHours = Math.round(stockoutGapDays * 24);
  const totalRequiredRunway = parseFloat((safeLeadTime + safeBuffer).toFixed(1));
  const bufferDeficitDays = runwayDays !== null ? Math.max(0, parseFloat((totalRequiredRunway - runwayDays).toFixed(1))) : 0;
  const deficitUnits = Math.round(Math.max(0, totalRequiredRunway * safeForecastDemand - safeStock));

  // Risk styling
  const isHighOrCritical = projectedRisk === 'HIGH' || projectedRisk === 'CRITICAL';
  const riskColor = isHighOrCritical ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-amber-700 bg-amber-50 border-amber-200';
  const riskBadge = isHighOrCritical ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="why-alert-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 animate-in fade-in duration-150 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300 uppercase tracking-wider">
                  Algorithmic Audit
                </span>
                <span className="text-[11px] font-mono text-slate-500">Real-Time Exception</span>
              </div>
              <h2
                id="why-alert-modal-title"
                className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight mt-0.5"
              >
                WHY THIS ALERT?
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Item Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/80 border border-slate-200/90 text-xs">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-600 shrink-0" />
              <span className="font-bold text-slate-900">{medicineName}</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 font-bold">
              {title}
            </span>
          </div>

          {/* Telemetry Metrics Grid (The exact card parameters) */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Current stock */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Current stock
              </span>
              <div className="text-xl font-extrabold font-mono text-slate-900 mt-0.5">
                {currentStock} {unit}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Physically verified on-shelf
              </div>
            </div>

            {/* Average daily consumption */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Average daily consumption
              </span>
              <div className="text-xl font-extrabold font-mono text-slate-900 mt-0.5">
                {avgDailyConsumption} {unit}/day
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                7-day rolling historical baseline
              </div>
            </div>

            {/* Recent consumption trend */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block flex items-center justify-between">
                <span>Recent trend</span>
                <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
              </span>
              <div className="text-xl font-extrabold font-mono text-amber-800 mt-0.5">
                {recentTrendPercent >= 0 ? `+${recentTrendPercent}%` : `${recentTrendPercent}%`}
              </div>
              <div className="text-[10px] text-amber-700 mt-0.5">
                Heatwave surge elasticity
              </div>
            </div>

            {/* Forecast demand */}
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">
                Forecast demand
              </span>
              <div className="text-xl font-extrabold font-mono text-rose-800 mt-0.5">
                {forecastDemand} {unit}/day
              </div>
              <div className="text-[10px] text-rose-700 mt-0.5">
                Predictive burn rate
              </div>
            </div>

            {/* Next replenishment */}
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 block flex items-center justify-between">
                <span>Next replenishment</span>
                <Truck className="w-3.5 h-3.5 text-indigo-600" />
              </span>
              <div className="text-xl font-extrabold font-mono text-indigo-800 mt-0.5">
                {nextReplenishmentDays} days
              </div>
              <div className="text-[10px] text-indigo-700 mt-0.5">
                RMSCL transit window
              </div>
            </div>

            {/* Safety buffer */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                Safety buffer
              </span>
              <div className="text-xl font-extrabold font-mono text-emerald-800 mt-0.5">
                {safetyBufferDays} days
              </div>
              <div className="text-[10px] text-emerald-700 mt-0.5">
                Mandatory contingency floor
              </div>
            </div>
          </div>

          {/* Visual Timeline Comparison Bar */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Depletion Runway vs Transit Horizon</span>
              </span>
              <span className="font-mono text-rose-700 font-bold text-[11px]">
                {stockoutGapDays > 0 ? `Stockout Gap: ${stockoutGapDays}d (${stockoutHours}h)` : 'Runway OK'}
              </span>
            </div>

            {/* Progress track */}
            <div className="space-y-1.5 text-[11px]">
              <div className="relative h-6 bg-slate-200 rounded-lg overflow-hidden flex items-center">
                {/* Available runway */}
                <div
                  className="h-full bg-rose-500 flex items-center justify-center text-white font-mono font-bold text-[10px]"
                  style={{
                    width: `${
                      runwayDays !== null && totalRequiredRunway > 0
                        ? Math.min(100, (runwayDays / totalRequiredRunway) * 100)
                        : 100
                    }%`
                  }}
                >
                  Stock: {runwayDays !== null ? `${runwayDays}d` : 'N/A'}
                </div>
                {/* Deficit / Gap */}
                {stockoutGapDays > 0 && (
                  <div
                    className="h-full bg-rose-200/90 border-l border-dashed border-rose-600 flex items-center justify-center text-rose-900 font-mono font-bold text-[10px]"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100 - ((runwayDays ?? 0) / totalRequiredRunway) * 100,
                          (stockoutGapDays / totalRequiredRunway) * 100
                        )
                      )}%`
                    }}
                  >
                    Gap: {stockoutGapDays}d
                  </div>
                )}
                {/* Safety buffer missing */}
                <div className="h-full bg-amber-100 flex-1 flex items-center justify-center text-amber-900 font-mono text-[9px] font-bold">
                  Buffer: {safeBuffer}d
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Day 0 (Now)</span>
                <span className="text-rose-600 font-bold">
                  Stock Cover: {runwayDays !== null ? `Day ${runwayDays}` : 'N/A'}
                </span>
                <span className="text-indigo-600 font-bold">Lead Time: Day {safeLeadTime}</span>
                <span>Cycle Target: Day {totalRequiredRunway}</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-slate-300" />

          {/* Projected Risk & Reason (Exact format from prompt) */}
          <div className={`p-4 rounded-xl border ${riskColor} space-y-2`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Projected risk:
              </span>
              <span className={`text-xs font-mono font-extrabold px-3 py-1 rounded-md tracking-wider uppercase ${riskBadge}`}>
                {projectedRisk}
              </span>
            </div>

            <div className="pt-2 border-t border-rose-200/80">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                Reason:
              </span>
              <p className="text-xs text-slate-900 font-semibold leading-relaxed mt-0.5">
                {reason}
              </p>
            </div>
          </div>

          {/* 4-Stage Decision-Support Provenance Strip (Observed -> Calculated -> Forecast -> Recommendation) */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Decision-Support Provenance (Deterministic vs. Forecast Signal)
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                Human Review Required
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="font-mono font-bold text-[10px] uppercase text-slate-600 block">
                  1. OBSERVED DATA (Recorded Ledger)
                </span>
                <span className="text-slate-800">
                  Usable Stock: <strong>{safeStock} {unit}</strong> (expired excluded) • Historical Avg: <strong>{safeAvgDaily} {unit}/day</strong>
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-indigo-200">
                <span className="font-mono font-bold text-[10px] uppercase text-indigo-700 block">
                  2. CALCULATED (Deterministic Local Math)
                </span>
                <span className="text-slate-800">
                  Runway: <strong>{runwayDays !== null ? `${runwayDays}d` : 'N/A'}</strong> vs Lead Time <strong>{safeLeadTime}d</strong> + Buffer <strong>{safeBuffer}d</strong>
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-amber-200">
                <span className="font-mono font-bold text-[10px] uppercase text-amber-800 block">
                  3. FORECAST / DEMAND SIGNAL
                </span>
                <span className="text-slate-800">
                  Projected Burn: <strong>{safeForecastDemand} {unit}/day</strong> ({recentTrendPercent >= 0 ? `+${recentTrendPercent}%` : `${recentTrendPercent}%`} seasonal/trend shift)
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-emerald-200">
                <span className="font-mono font-bold text-[10px] uppercase text-emerald-800 block">
                  4. RECOMMENDATION (Decision Support)
                </span>
                <span className="text-slate-800">
                  {deficitUnits > 0
                    ? `Review replenishment (+${deficitUnits} ${unit}) or peer PHC transfer via Medical Officer approval.`
                    : `Monitor FEFO dispensing queue; no immediate emergency indent required.`}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Mathematical Explanation Accordion / Callout */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
              <Info className="w-3.5 h-3.5 text-slate-500" />
              <span>Step-by-Step Deterministic Calculation Audit (Local Code — Not LLM Generated)</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-600 font-mono">
              <li className="flex items-start gap-1.5">
                <span className="text-slate-400 font-bold">1.</span>
                <span>
                  <strong>Runway Calculation:</strong>{' '}
                  {safeForecastDemand > 0 ? (
                    <>
                      {safeStock} {unit} ÷ {safeForecastDemand} {unit}/day ={' '}
                      <strong className="text-rose-700">{runwayDays} days of supply</strong>.
                    </>
                  ) : (
                    <strong className="text-slate-700">Consumption rate is 0/day (runway not applicable).</strong>
                  )}
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-slate-400 font-bold">2.</span>
                <span>
                  <strong>Delivery Lead Time (Demo Config):</strong> Expected in{' '}
                  <strong className="text-indigo-700">{safeLeadTime} days</strong> (Max allowed: 3.5 days).
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-slate-400 font-bold">3.</span>
                <span>
                  <strong>Lead-Time Coverage Check:</strong>{' '}
                  {runwayDays === null ? (
                    <span>Evaluated against static minimum floor ({safeStock} {unit}).</span>
                  ) : stockoutGapDays > 0 ? (
                    <>
                      Stock cover ({runwayDays}d) is below delivery lead time ({safeLeadTime}d) by{' '}
                      <strong className="text-rose-700">
                        {stockoutGapDays} days ({stockoutHours} hours)
                      </strong>
                      .
                    </>
                  ) : (
                    <>
                      Stock cover ({runwayDays}d) covers the {safeLeadTime}d delivery lead time (no lead-time stockout gap; alert is driven by safety buffer / minimum threshold floor).
                    </>
                  )}
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-slate-400 font-bold">4.</span>
                <span>
                  <strong>Safety Buffer Target:</strong>{' '}
                  {deficitUnits > 0
                    ? `Shortfall of ${deficitUnits} ${unit} relative to the ${totalRequiredRunway}d (${safeLeadTime}d lead + ${safeBuffer}d buffer) demo target.`
                    : `Current stock meets the ${totalRequiredRunway}d demo cycle buffer.`}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-semibold transition-colors cursor-pointer"
          >
            Close Breakdown
          </button>

          <div className="flex items-center gap-2">
            {onLateralTransfer && (
              <button
                type="button"
                onClick={() => {
                  onLateralTransfer();
                  onClose();
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Lateral Transfer (+600)</span>
              </button>
            )}

            {onRemediate && (
              <button
                type="button"
                onClick={() => {
                  onRemediate();
                  onClose();
                }}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <span>Remediate Requisition</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
