import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Sparkles,
  AlertTriangle,
  Activity,
  BedDouble,
  Pill,
  Users,
  RefreshCw,
  CheckCircle2,
  Truck,
  TrendingUp,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  generateProactiveSurgeCapacityAlerts,
  HealthPreparednessSurgeResponse,
  ProactiveSurgeAlert
} from '../../services/healthPreparednessService.ts';
import { MedicineItem, PHCFacility } from '../../types.ts';

interface MLSurgeCapacityAlertsPanelProps {
  phc: PHCFacility;
  medicines: MedicineItem[];
  temperatureC: number;
  humidityPct: number;
  currentOpdFootfall: number;
  leadTimeDays: number;
  onDispatchEmergencyOrder: (medicineName: string, qty: number, justification: string) => Promise<void>;
  onNavigateModule: (module: string) => void;
  onShowNotification: (msg: string) => void;
}

export const MLSurgeCapacityAlertsPanel: React.FC<MLSurgeCapacityAlertsPanelProps> = ({
  phc,
  medicines,
  temperatureC,
  humidityPct,
  currentOpdFootfall,
  leadTimeDays,
  onDispatchEmergencyOrder,
  onNavigateModule,
  onShowNotification
}) => {
  const [epidemicSeason, setEpidemicSeason] = useState<
    'SUMMER_HEATWAVE' | 'MONSOON_DENGUE_MALARIA' | 'POST_MONSOON_SCRUB_TYPHUS'
  >('SUMMER_HEATWAVE');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [surgeData, setSurgeData] = useState<HealthPreparednessSurgeResponse | null>(null);
  const [executedAlertIds, setExecutedAlertIds] = useState<Record<string, boolean>>({});

  const runMLPreparednessEngine = async (silent = false) => {
    setIsLoading(true);
    try {
      const res = await generateProactiveSurgeCapacityAlerts({
        phc,
        medicines,
        temperatureC,
        humidityPct,
        currentOpdFootfall,
        leadTimeDays,
        epidemicSeason,
        useLiveAi: !silent
      });
      setSurgeData(res);
      if (!silent) {
        onShowNotification(
          `Gemini AI + ML HealthPreparedness Service generated ${res.proactiveSurgeAlerts.length} proactive surge capacity alerts.`
        );
      }
    } catch (err) {
      console.error('ML HealthPreparedness error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runMLPreparednessEngine(true);
  }, [phc.id, temperatureC, currentOpdFootfall, epidemicSeason]);

  const handleEnactSurgeAlert = async (alert: ProactiveSurgeAlert) => {
    setExecutedAlertIds((prev) => ({ ...prev, [alert.id]: true }));
    await onDispatchEmergencyOrder(
      alert.targetMedicineOrResource || 'Oral Rehydration Salts (ORS) Sachets 20.5g',
      alert.recommendedOrderQty || 500,
      `[ML + Gemini Surge Alert: ${alert.title}] ${alert.epidemiologicalDriver} ${alert.recommendedAction}`
    );
    onShowNotification(
      `Enacted Proactive Surge Alert: Dispatched ${alert.recommendedOrderQty} units indent for ${alert.targetMedicineOrResource}.`
    );
  };

  const domainIcon = (domain: ProactiveSurgeAlert['domain']) => {
    switch (domain) {
      case 'BED_CAPACITY':
        return <BedDouble className="w-4 h-4 text-rose-600" />;
      case 'PHARMACEUTICAL_BUFFER':
        return <Pill className="w-4 h-4 text-emerald-600" />;
      case 'CLINICAL_STAFFING':
        return <Users className="w-4 h-4 text-amber-600" />;
      default:
        return <Activity className="w-4 h-4 text-sky-600" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border-2 border-indigo-600/80 shadow-xs overflow-hidden">
      {/* Top Header */}
      <div className="bg-slate-900 text-white px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
              <BrainCircuit className="w-3 h-3" />
              <span>ML Time-Series Regression + Gemini 3.8 Flash</span>
            </span>
            <span className="text-[11px] font-mono text-slate-300">
              6-Month Historical Throughput × Seasonal Epidemic Velocity
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
            <span>
              ML &amp; Gemini AI Proactive Surge Capacity Alert Service
            </span>
          </h2>
          <p className="text-xs text-slate-300 max-w-3xl">
            Synthesizes 6-month historical OPD/IPD facility throughput with live IDSP seasonal epidemic trajectories to forecast bed saturation and pre-empt pharmaceutical stockouts before peak load arrives.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            aria-label="Select Seasonal Epidemic Profile"
            value={epidemicSeason}
            onChange={(e) => setEpidemicSeason(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="SUMMER_HEATWAVE">Season: May–Jun Heatwave &amp; ADD Epidemic</option>
            <option value="MONSOON_DENGUE_MALARIA">Season: Jul–Sep Monsoon Dengue / Malaria</option>
            <option value="POST_MONSOON_SCRUB_TYPHUS">Season: Oct–Nov Scrub Typhus &amp; AFI Wave</option>
          </select>

          <button
            type="button"
            onClick={() => runMLPreparednessEngine(false)}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Running ML + Gemini...' : 'Recompute ML Surge Alerts'}</span>
          </button>
        </div>
      </div>

      {surgeData && (
        <div className="p-5 space-y-5">
          {/* ML Feature Vector & Model Executive Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                ML Surge Risk Score
              </span>
              <div className="text-xl font-bold font-mono text-rose-700 mt-1">
                {surgeData.overallSurgeRiskScore}/100
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Peak in +{surgeData.projectedPeakDayOffset} Days
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Effective R_e (Epidemic)
              </span>
              <div className="text-xl font-bold font-mono text-indigo-700 mt-1">
                {surgeData.mlFeatures.effectiveReproductionIndex}x
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Transmission Velocity
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Projected Peak OPD
              </span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {surgeData.projectedPeakOpdFootfall}/day
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                6m Avg: {Math.round(surgeData.mlFeatures.sixMonthAvgMonthlyOpdThroughput / 30)}/d
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                OPD → IPD Conversion
              </span>
              <div className="text-xl font-bold font-mono text-amber-700 mt-1">
                {surgeData.mlFeatures.opdToIpdConversionRatePct}%
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Casualty Admission Rate
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Bed Saturation ETA
              </span>
              <div className="text-xl font-bold font-mono text-rose-700 mt-1">
                {surgeData.mlFeatures.estimatedHoursToBedSaturation} hrs
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Peak Ward Load: {surgeData.projectedBedOccupancyPct}%
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                6-Mo ORS Growth
              </span>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                +{surgeData.mlFeatures.orsConsumptionGrowthPct}%
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Elasticity: {surgeData.mlFeatures.ivFluidElasticityCoefficient}x
              </span>
            </div>
          </div>

          {/* Model Synthesis Callout */}
          <div className="p-3.5 rounded-xl bg-indigo-50/90 border border-indigo-200 flex items-start gap-3 text-xs text-indigo-950">
            <BrainCircuit className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold uppercase font-mono text-[10px] text-indigo-800 block">
                {surgeData.engine} — Epidemiological &amp; Throughput Synthesis
              </span>
              <p className="mt-0.5 font-medium leading-relaxed">{surgeData.modelSummary}</p>
            </div>
          </div>

          {/* Main Grid: Left 5 Cols = 7-Day ML Throughput & Bed Saturation LineChart, Right 7 Cols = Proactive Surge Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left 5 Cols: 7-Day ML Throughput Trajectory Chart */}
            <div className="lg:col-span-5 bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span>7-Day ML Facility Throughput &amp; Surge Horizon</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Historical OPD baseline vs. ML projected epidemic throughput
                  </p>
                </div>
              </div>

              <div className="h-60 w-full text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={surgeData.sevenDayForecastSeries}
                    margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#475569' }} stroke="#cbd5e1" />
                    <YAxis tick={{ fontSize: 10, fill: '#475569' }} stroke="#cbd5e1" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '11px'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '6px' }} />
                    <ReferenceLine
                      y={260}
                      stroke="#e11d48"
                      strokeDasharray="3 3"
                      label={{
                        value: 'PHC Surge Triage Threshold (260/d)',
                        position: 'insideTopRight',
                        fill: '#be123c',
                        fontSize: 9,
                        fontWeight: 700
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="historicalBaselineOpd"
                      name="Historical Baseline OPD"
                      stroke="#64748b"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="mlProjectedOpdThroughput"
                      name="ML Projected OPD Surge"
                      stroke="#4f46e5"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                <span>OLS Bed Occupancy Trend Slope:</span>
                <strong className="font-mono text-rose-700">
                  +{surgeData.mlFeatures.bedOccupancySlopePerMonth}% / month
                </strong>
              </div>
            </div>

            {/* Right 7 Cols: Proactive Surge Capacity Alerts Generated by Gemini AI */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>
                    Proactive Surge Capacity Alerts ({surgeData.proactiveSurgeAlerts.length} Active Predictions)
                  </span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Pre-Emptive Lead Window: 24h–48h
                </span>
              </div>

              {surgeData.proactiveSurgeAlerts.map((alert) => {
                const isExecuted = executedAlertIds[alert.id];
                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-rose-50/60 border-rose-200'
                        : 'bg-amber-50/60 border-amber-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {domainIcon(alert.domain)}
                        <span className="font-bold text-xs text-slate-900">{alert.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 flex items-center gap-1 font-bold">
                          <Clock className="w-3 h-3 text-indigo-600" />
                          <span>T-{alert.predictionWindowHours}h Window</span>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            alert.severity === 'CRITICAL'
                              ? 'bg-rose-200 text-rose-950'
                              : 'bg-amber-200 text-amber-950'
                          }`}
                        >
                          {alert.confidenceScore}% ML Conf
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700 bg-white/90 p-2.5 rounded-lg border border-slate-200/80">
                      <div>
                        <span className="font-bold text-slate-900 block">Epidemiological Driver:</span>
                        <span>{alert.epidemiologicalDriver}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">Throughput Bottleneck:</span>
                        <span>{alert.throughputBottleneck}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                      <div className="text-[11px] text-slate-800 font-medium">
                        <strong>Directive:</strong> {alert.recommendedAction}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {alert.domain === 'BED_CAPACITY' && (
                          <button
                            type="button"
                            onClick={() => onNavigateModule('capacity')}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-[11px] font-bold cursor-pointer"
                          >
                            Open Ward Triage
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEnactSurgeAlert(alert)}
                          disabled={isExecuted}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                            isExecuted
                              ? 'bg-emerald-700 text-white'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          {isExecuted ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Surge Indent Dispatched</span>
                            </>
                          ) : (
                            <>
                              <Truck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Pre-Empt Surge (+{alert.recommendedOrderQty})</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
