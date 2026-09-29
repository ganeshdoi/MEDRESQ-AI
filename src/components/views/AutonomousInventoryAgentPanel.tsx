import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  Zap,
  FastForward,
  Sliders,
  History,
  ArrowUpRight,
  Truck
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';

export interface InventoryTrendProposal {
  id: string;
  phcId: string;
  medicineId: string;
  medicineName: string;
  category: string;
  unit: string;
  batchNumber: string;
  currentStock: number;
  pendingOrders: number;
  effectiveSupply: number;
  staticMinThreshold: number;
  staticThresholdStatus: 'BELOW_MIN' | 'ABOVE_MIN_SAFE';
  isPreThresholdVelocityCatch: boolean;
  historical14DaySeries: number[];
  baselineDailyBurn: number;
  ewmaDailyVelocity: number;
  trendSlopePerDay: number;
  velocityAccelerationPct: number;
  demandStdDev: number;
  leadTimeDays: number;
  projectedLeadTimeDemand: number;
  dynamicReorderPoint: number;
  naiveStaticRunwayDays: number;
  trendAdjustedRunwayDays: number;
  trendAdjustedRunwayHours: number;
  suggestedOrderQty: number;
  urgency: 'CRITICAL_TREND_BREACH' | 'PRE_EMPTIVE_VELOCITY_SURGE' | 'CYCLE_REPLENISHMENT';
  patternClassification: 'ACCELERATING_SURGE' | 'STEADY_HIGH_LOAD' | 'VOLATILE_SPIKE' | 'DECELERATING';
  analyticalRationale: string;
  status: 'SUGGESTED' | 'APPROVED_DISPATCHED';
  generatedAt: string;
}

interface HourlyAgentScanRecord {
  scanId: string;
  phcId: string;
  runTimestamp: string;
  triggerType: 'SCHEDULED_HOURLY_CRON' | 'MANUAL_PROACTIVE_SCAN' | 'SIMULATED_HOUR_TICK';
  itemsAnalyzed: number;
  proposalsGenerated: number;
  preThresholdCatches: number;
  autoDispatchedCount: number;
  summary: string;
}

interface SchedulerState {
  enabled: boolean;
  intervalMinutes: number;
  autoApproveCriticalTrends: boolean;
  leadTimeDays: number;
  targetCycleDays: number;
  lastRunAt: string;
  nextRunAt: string;
  totalChecksExecuted: number;
}

const Sparkline14Day: React.FC<{ series: number[]; isAccelerating: boolean }> = ({
  series,
  isAccelerating
}) => {
  if (!series || series.length === 0) return null;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = Math.max(1, max - min);
  const width = 104;
  const height = 28;

  const points = series
    .map((val, idx) => {
      const x = (idx / Math.max(1, series.length - 1)) * (width - 8) + 4;
      const y = height - 4 - ((val - min) / range) * (height - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const strokeColor = isAccelerating ? '#e11d48' : '#0284c7';

  return (
    <div className="flex items-center gap-2">
      <svg width={width} height={height} className="overflow-visible shrink-0">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
      <span className="text-[10px] font-mono text-slate-500">
        {series[0]}→<strong className="text-slate-900">{series[series.length - 1]}</strong>/d
      </span>
    </div>
  );
};

export const AutonomousInventoryAgentPanel: React.FC = () => {
  const { selectedPHC, createOrder, consumeMedicine, showNotification } = useApp();

  const [scheduler, setScheduler] = useState<SchedulerState>({
    enabled: true,
    intervalMinutes: 60,
    autoApproveCriticalTrends: false,
    leadTimeDays: 5,
    targetCycleDays: 14,
    lastRunAt: new Date().toISOString(),
    nextRunAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    totalChecksExecuted: 1
  });

  const [proposals, setProposals] = useState<InventoryTrendProposal[]>([]);
  const [allAnalyses, setAllAnalyses] = useState<InventoryTrendProposal[]>([]);
  const [scanHistory, setScanHistory] = useState<HourlyAgentScanRecord[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [filterView, setFilterView] = useState<'SUGGESTIONS' | 'PRE_THRESHOLD_ONLY' | 'ALL_SERIES' | 'SCAN_LOG'>('SUGGESTIONS');
  const [countdownSec, setCountdownSec] = useState<number>(3600);

  const fetchAgentStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/inventory-agent/status?phcId=${encodeURIComponent(selectedPHC.id)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.scheduler) setScheduler(data.scheduler);
      if (Array.isArray(data.activeProposals)) setProposals(data.activeProposals);
      if (Array.isArray(data.allItemAnalyses)) setAllAnalyses(data.allItemAnalyses);
      if (Array.isArray(data.scanHistory)) setScanHistory(data.scanHistory);
    } catch (err) {
      console.warn('Inventory agent status fetch fallback:', err);
    }
  }, [selectedPHC.id]);

  useEffect(() => {
    fetchAgentStatus();
  }, [fetchAgentStatus]);

  const handleRunHourlyScan = useCallback(
    async (simulateHourTick = false) => {
      setIsScanning(true);
      try {
        const res = await fetch('/api/inventory-agent/run-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phcId: selectedPHC.id,
            simulateHourTick
          })
        });
        if (!res.ok) throw new Error('Scan failed');
        const data = await res.json();
        if (data.scheduler) setScheduler(data.scheduler);
        if (Array.isArray(data.activeProposals)) setProposals(data.activeProposals);
        if (Array.isArray(data.allItemAnalyses)) setAllAnalyses(data.allItemAnalyses);
        if (Array.isArray(data.scanHistory)) setScanHistory(data.scanHistory);
        setCountdownSec((data.scheduler?.intervalMinutes || 60) * 60);

        if (simulateHourTick) {
          // Refresh parent inventory state after simulated hourly consumption tick
          await consumeMedicine(selectedPHC.id, 0, 'Hourly Agent Tick Sync');
        }

        const catchCount = (data.activeProposals || []).filter(
          (p: InventoryTrendProposal) => p.isPreThresholdVelocityCatch
        ).length;

        showNotification(
          simulateHourTick
            ? `Simulated +1h consumption drift: Autonomous Agent analyzed 14d trends and flagged ${data.activeProposals?.length || 0} restock orders (${catchCount} pre-threshold catches).`
            : `Hourly Inventory Agent scan complete: ${data.activeProposals?.length || 0} restock orders suggested from historical consumption trends.`
        );
      } catch (err) {
        console.error(err);
      } finally {
        setIsScanning(false);
      }
    },
    [selectedPHC.id, consumeMedicine, showNotification]
  );

  // Live 1-second countdown timer for the scheduled hourly check
  useEffect(() => {
    if (!scheduler.enabled) return;
    const timer = setInterval(() => {
      setCountdownSec((prev) => {
        if (prev <= 1) {
          handleRunHourlyScan(false);
          return scheduler.intervalMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [scheduler.enabled, scheduler.intervalMinutes, handleRunHourlyScan]);

  const handleToggleConfig = async (updates: Partial<SchedulerState>) => {
    try {
      const res = await fetch('/api/inventory-agent/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.scheduler) setScheduler(data.scheduler);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const handleApproveProposal = async (proposal: InventoryTrendProposal | 'ALL') => {
    const targetId = proposal === 'ALL' ? 'ALL' : proposal.id;
    setApprovingId(targetId);
    try {
      const res = await fetch('/api/inventory-agent/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phcId: selectedPHC.id,
          phcName: selectedPHC.name,
          proposalId: targetId
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.activeProposals)) setProposals(data.activeProposals);
        if (Array.isArray(data.allItemAnalyses)) setAllAnalyses(data.allItemAnalyses);

        // Also sync with AppContext orders state
        if (proposal !== 'ALL') {
          await createOrder({
            medicineName: proposal.medicineName,
            quantityRequested: proposal.suggestedOrderQty,
            priority:
              proposal.urgency === 'CRITICAL_TREND_BREACH' ? 'EMERGENCY_REPLENISHMENT' : 'URGENT',
            justification: proposal.analyticalRationale
          });
        } else if (Array.isArray(data.dispatchedOrders) && data.dispatchedOrders.length > 0) {
          const first = data.dispatchedOrders[0];
          await createOrder({
            medicineName: first.medicineName,
            quantityRequested: first.quantityRequested,
            priority: 'EMERGENCY_REPLENISHMENT',
            justification: `Batch Approved ${data.dispatchedCount} Trend-Based Restock Orders`
          });
        }

        showNotification(
          proposal === 'ALL'
            ? `Dispatched ${data.dispatchedCount} trend-based restock orders to e-Aushadhi warehouse.`
            : `Approved & dispatched ${proposal.suggestedOrderQty} ${proposal.unit} of ${proposal.medicineName} based on 14-day velocity trend.`
        );
      }
    } finally {
      setApprovingId(null);
    }
  };

  const preThresholdCatchesCount = proposals.filter((p) => p.isPreThresholdVelocityCatch).length;
  const pendingSuggestionsCount = proposals.filter((p) => p.status === 'SUGGESTED').length;

  const displayedRows =
    filterView === 'PRE_THRESHOLD_ONLY'
      ? proposals.filter((p) => p.isPreThresholdVelocityCatch)
      : filterView === 'ALL_SERIES'
      ? allAnalyses
      : proposals;

  const formatCountdown = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remSec = sec % 60;
    return `${String(mins).padStart(2, '0')}m ${String(remSec).padStart(2, '0')}s`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* 1. Top Autonomous Scheduler Command Bar */}
      <div className="bg-slate-950 text-white p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="text-emerald-400 font-bold">
                ● AUTONOMOUS INVENTORY AGENT (SCHEDULED EVERY {scheduler.intervalMinutes} MIN)
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-sky-300">
                Next Check in: <strong>{formatCountdown(countdownSec)}</strong>
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400">
                Scans Run: <strong className="text-white">{scheduler.totalChecksExecuted}</strong>
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
              Time-Series Consumption Trend &amp; Proactive Restock Engine (Beyond Static Thresholds)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Analyzes 14-day consumption velocity (EWMA <code className="text-emerald-300">α=0.35</code>), OLS regression slope (<code className="text-emerald-300">β₁</code>), and lead-time volatility (<code className="text-emerald-300">σ_d</code>) every hour to catch accelerating burn rates <strong>before</strong> stock hits static minimum thresholds.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={scheduler.autoApproveCriticalTrends}
              onChange={(e) =>
                handleToggleConfig({ autoApproveCriticalTrends: e.target.checked })
              }
              className="rounded border-slate-700 text-emerald-500"
            />
            <span>Auto-Dispatch on Scan</span>
          </label>

          <button
            type="button"
            disabled={isScanning}
            onClick={() => handleRunHourlyScan(false)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isScanning ? 'animate-spin' : ''}`} />
            <span>Run Hourly Check Now</span>
          </button>

          <button
            type="button"
            disabled={isScanning}
            onClick={() => handleRunHourlyScan(true)}
            className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Advance 1 hour of non-linear OPD consumption and re-run trend regression"
          >
            <FastForward className="w-3.5 h-3.5 fill-slate-950" />
            <span>Simulate +1 Hr Consumption Tick</span>
          </button>
        </div>
      </div>

      {/* 2. Key Analytical Advantage Strip + Filter Bar */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-slate-500 uppercase font-bold">
              Trend Restock Suggestions:
            </span>
            <strong className="font-mono text-sm text-slate-900">{proposals.length} Items</strong>
          </div>

          <span className="text-slate-300">|</span>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-rose-700 uppercase font-bold">
              Caught Before Static Min Threshold:
            </span>
            <strong className="font-mono text-sm text-rose-700">
              {preThresholdCatchesCount} Accelerating Items
            </strong>
          </div>

          <span className="text-slate-300">|</span>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-slate-500 uppercase font-bold">
              Lead-Time Window:
            </span>
            <strong className="font-mono text-slate-800">{scheduler.leadTimeDays}d Delivery · {scheduler.targetCycleDays}d Cycle</strong>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterView('SUGGESTIONS')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterView === 'SUGGESTIONS'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Suggested Orders ({proposals.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterView('PRE_THRESHOLD_ONLY')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterView === 'PRE_THRESHOLD_ONLY'
                  ? 'bg-white text-rose-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pre-Threshold Catches ({preThresholdCatchesCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterView('ALL_SERIES')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterView === 'ALL_SERIES'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All {allAnalyses.length} NLEM Trends
            </button>
            <button
              type="button"
              onClick={() => setFilterView('SCAN_LOG')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                filterView === 'SCAN_LOG'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3 h-3" />
              <span>Hourly Log ({scanHistory.length})</span>
            </button>
          </div>

          {pendingSuggestionsCount > 0 && filterView !== 'SCAN_LOG' && (
            <button
              type="button"
              disabled={approvingId !== null}
              onClick={() => handleApproveProposal('ALL')}
              className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Truck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Approve All ({pendingSuggestionsCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Content: Trend Table OR Hourly Scan History */}
      {filterView === 'SCAN_LOG' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-mono text-[10px] uppercase">
                <th className="py-2.5 px-3">Scan ID &amp; Timestamp</th>
                <th className="py-2.5 px-3">Trigger Type</th>
                <th className="py-2.5 px-3">Series Analyzed</th>
                <th className="py-2.5 px-3">Restock Proposals</th>
                <th className="py-2.5 px-3">Pre-Threshold Catches</th>
                <th className="py-2.5 px-3">Analytical Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {scanHistory.map((scan) => (
                <tr key={scan.scanId} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono">
                    <div className="font-bold text-slate-900">{scan.scanId}</div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(scan.runTimestamp).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-sky-800">
                    {scan.triggerType}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                    {scan.itemsAnalyzed} NLEM items
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                    {scan.proposalsGenerated} orders
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-rose-700">
                    {scan.preThresholdCatches} caught early
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{scan.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-mono text-[10px] uppercase">
                <th className="py-2.5 px-3">Medicine &amp; Threshold vs Trend Catch</th>
                <th className="py-2.5 px-3">14-Day Consumption Trajectory</th>
                <th className="py-2.5 px-3">Velocity (EWMA) &amp; Slope (β₁)</th>
                <th className="py-2.5 px-3">Supply vs Dynamic ROP</th>
                <th className="py-2.5 px-3">Static vs Trend Runway</th>
                <th className="py-2.5 px-3">Agent Rationale</th>
                <th className="py-2.5 px-3 text-right">Suggested Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayedRows.map((item) => {
                const isAccelerating = item.velocityAccelerationPct >= 15;
                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      item.isPreThresholdVelocityCatch
                        ? 'bg-rose-50/40 hover:bg-rose-50/70'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{item.medicineName}</div>
                      <div className="text-[10px] font-mono mt-0.5 flex items-center gap-1.5">
                        {item.isPreThresholdVelocityCatch ? (
                          <span className="text-rose-700 font-bold">
                            ★ PRE-THRESHOLD VELOCITY CATCH (Stock &gt; Min)
                          </span>
                        ) : item.staticThresholdStatus === 'BELOW_MIN' ? (
                          <span className="text-amber-700 font-semibold">
                            Below Static Min + High Velocity
                          </span>
                        ) : (
                          <span className="text-slate-500">{item.patternClassification}</span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <Sparkline14Day
                        series={item.historical14DaySeries}
                        isAccelerating={isAccelerating}
                      />
                    </td>

                    <td className="py-2.5 px-3 font-mono">
                      <div className="font-bold text-slate-900">
                        {item.ewmaDailyVelocity} {item.unit}/d{' '}
                        <span
                          className={
                            item.velocityAccelerationPct > 0 ? 'text-rose-600' : 'text-emerald-700'
                          }
                        >
                          ({item.velocityAccelerationPct > 0 ? '+' : ''}
                          {item.velocityAccelerationPct}%)
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Slope β₁: {item.trendSlopePerDay >= 0 ? '+' : ''}
                        {item.trendSlopePerDay}/d² · σ={item.demandStdDev}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-mono">
                      <div className="text-slate-900">
                        Supply: <strong>{item.effectiveSupply}</strong>{' '}
                        <span className="text-[10px] text-slate-500">
                          (Static Min: {item.staticMinThreshold})
                        </span>
                      </div>
                      <div className="text-[10px] text-indigo-700 font-bold">
                        Dynamic Trend ROP: {item.dynamicReorderPoint} ({item.leadTimeDays}d demand: {item.projectedLeadTimeDemand})
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-mono">
                      <div className="text-[11px] text-slate-500 line-through">
                        Naive: {item.naiveStaticRunwayDays}d
                      </div>
                      <div
                        className={`font-bold ${
                          item.trendAdjustedRunwayDays <= item.leadTimeDays
                            ? 'text-rose-600'
                            : 'text-amber-700'
                        }`}
                      >
                        Trend: {item.trendAdjustedRunwayDays}d ({item.trendAdjustedRunwayHours}h)
                      </div>
                    </td>

                    <td className="py-2.5 px-3 max-w-[280px]">
                      <p className="text-[11px] text-slate-600 leading-snug">
                        {item.analyticalRationale}
                      </p>
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {item.status === 'APPROVED_DISPATCHED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 font-mono font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Ordered +{item.suggestedOrderQty}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={approvingId !== null}
                          onClick={() => handleApproveProposal(item)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-black disabled:opacity-50 text-white rounded-lg font-mono font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>Order +{item.suggestedOrderQty}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
