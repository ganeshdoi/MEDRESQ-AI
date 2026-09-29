import React, { useState, useMemo, useEffect } from 'react';
import {
  Pill,
  AlertTriangle,
  Calendar,
  TrendingDown,
  TrendingUp,
  ArrowUpDown,
  Search,
  Plus,
  ArrowRightLeft,
  Truck,
  Sparkles,
  Layers,
  CheckCircle2,
  FilterX,
  X,
  ChevronRight,
  Activity,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine
} from 'recharts';
import { useApp } from '../../context/AppContext.tsx';
import { StatusBadge } from '../ui/StatusBadge.tsx';
import { OrderModal } from '../ui/OrderModal.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { MedicineItem, RedistributionOpportunity } from '../../types.ts';
import { PredictiveInventoryTrendChart } from './PredictiveInventoryTrendChart.tsx';
import { resolveMedicineMatch } from '../../utils/medicineMatcher.ts';
import { calculateMedicineForecast } from '../../utils/inventoryForecast.ts';
import { matchesSearchKeywords } from '../../utils/globalSearch.ts';

interface ConsumptionLogEntry {
  id: string;
  medicineId: string;
  timestamp: string;
  quantity: number;
  wardOrEncounter: string;
  dispensedBy: string;
  batchNumber: string;
  balanceAfter: number;
}

const INITIAL_CONSUMPTION_LOGS: Record<string, ConsumptionLogEntry[]> = {
  'med-ors-osian': [
    {
      id: 'log-ors-1',
      medicineId: 'med-ors-osian',
      timestamp: '2026-09-22 09:15',
      quantity: 25,
      wardOrEncounter: 'Casualty / Heat Exhaustion Stabilization',
      dispensedBy: 'M. L. Sharma (Pharmacist)',
      batchNumber: 'ORS-RJ-2604',
      balanceAfter: 210
    },
    {
      id: 'log-ors-2',
      medicineId: 'med-ors-osian',
      timestamp: '2026-09-22 08:30',
      quantity: 15,
      wardOrEncounter: 'OPD Diarrhea Consultation',
      dispensedBy: 'Pooja Verma (Staff Nurse)',
      batchNumber: 'ORS-RJ-2604',
      balanceAfter: 235
    },
    {
      id: 'log-ors-3',
      medicineId: 'med-ors-osian',
      timestamp: '2026-09-21 16:40',
      quantity: 30,
      wardOrEncounter: 'Sub-Centre HSC Hamir Nagar Supply',
      dispensedBy: 'M. L. Sharma (Pharmacist)',
      batchNumber: 'ORS-RJ-2604',
      balanceAfter: 250
    },
    {
      id: 'log-ors-4',
      medicineId: 'med-ors-osian',
      timestamp: '2026-09-21 11:20',
      quantity: 20,
      wardOrEncounter: 'Inpatient Ward Pediatric Dehydration',
      dispensedBy: 'Dr. Rajesh Sharma (MO I/C)',
      batchNumber: 'ORS-RJ-2604',
      balanceAfter: 280
    }
  ],
  'med-pcm-osian': [
    {
      id: 'log-pcm-1',
      medicineId: 'med-pcm-osian',
      timestamp: '2026-09-22 10:00',
      quantity: 60,
      wardOrEncounter: 'General OPD Fever Dispensary',
      dispensedBy: 'M. L. Sharma (Pharmacist)',
      batchNumber: 'PCM-T-440',
      balanceAfter: 4200
    },
    {
      id: 'log-pcm-2',
      medicineId: 'med-pcm-osian',
      timestamp: '2026-09-21 15:30',
      quantity: 80,
      wardOrEncounter: 'Antenatal Care Clinic (ANC)',
      dispensedBy: 'Pooja Verma (Staff Nurse)',
      batchNumber: 'PCM-T-440',
      balanceAfter: 4260
    }
  ],
  'med-ns-osian': [
    {
      id: 'log-ns-1',
      medicineId: 'med-ns-osian',
      timestamp: '2026-09-22 07:45',
      quantity: 6,
      wardOrEncounter: 'Emergency Inpatient Heatstroke',
      dispensedBy: 'Pooja Verma (Staff Nurse)',
      batchNumber: 'NS-IV-998',
      balanceAfter: 64
    },
    {
      id: 'log-ns-2',
      medicineId: 'med-ns-osian',
      timestamp: '2026-09-21 18:20',
      quantity: 8,
      wardOrEncounter: 'Labor & Delivery Room',
      dispensedBy: 'Pooja Verma (Staff Nurse)',
      batchNumber: 'NS-IV-998',
      balanceAfter: 70
    }
  ],
  'med-rl-osian': [
    {
      id: 'log-rl-1',
      medicineId: 'med-rl-osian',
      timestamp: '2026-09-22 08:10',
      quantity: 4,
      wardOrEncounter: 'Casualty Fluid Resuscitation',
      dispensedBy: 'Pooja Verma (Staff Nurse)',
      batchNumber: 'RL-RJ-512',
      balanceAfter: 48
    }
  ]
};

export const MedicineIntelligence: React.FC = () => {
  const { medicines, consumeMedicine, selectedPHC, redistributions, showNotification, approveRedistribution } = useApp();

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'NORMAL' | 'SURPLUS'>('ALL');
  const [expiryFilter, setExpiryFilter] = useState<'ALL' | 'EXPIRING_SOON' | 'STABLE'>('ALL');
  const [sortField, setSortField] = useState<'depletion' | 'stock' | 'burn' | 'name' | 'expiry'>('depletion');

  // View Mode: Table vs 30-Day D3 Predictive Chart
  const [viewMode, setViewMode] = useState<'table' | 'predictive_chart'>('table');

  // Recharts 30-Day Line Chart Mode: Single Critical Medicine vs Multi-Medicine Critical Overlay
  const [trendChartMode, setTrendChartMode] = useState<'single' | 'multi_critical'>('single');

  // Selected Medicine & Deep-Dive Tab
  const [selectedMedId, setSelectedMedId] = useState<string>(medicines[0]?.id || 'med-ors-osian');
  const [activeTab, setActiveTab] = useState<'details' | 'forecast' | 'trend_d3' | 'history' | 'reorder' | 'surplus'>('details');

  // Listen for global search navigation events targeting Medicine Intelligence
  useEffect(() => {
    const handleGlobalSearch = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.medicineId) {
        setSelectedMedId(detail.medicineId);
      }
      if (detail?.query) {
        setSearchTerm(detail.query);
        setCategoryFilter('ALL');
        setStatusFilter('ALL');
        setExpiryFilter('ALL');
      }
    };
    window.addEventListener('medresq:global-search', handleGlobalSearch);
    return () => window.removeEventListener('medresq:global-search', handleGlobalSearch);
  }, []);

  // Dispensing Form State
  const [dispenseQty, setDispenseQty] = useState<number>(10);
  const [dispenseReason, setDispenseReason] = useState('Routine OPD Encounter');
  const [dispensingWard, setDispensingWard] = useState('General OPD Dispensary');
  const [isDispensing, setIsDispensing] = useState(false);

  // Reorder Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderModalData, setOrderModalData] = useState<{
    medicineName: string;
    quantity: number;
    priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY_REPLENISHMENT';
    justification: string;
  }>({
    medicineName: '',
    quantity: 500,
    priority: 'ROUTINE',
    justification: ''
  });

  // Local Consumption History Logs
  const [consumptionLogs, setConsumptionLogs] = useState<Record<string, ConsumptionLogEntry[]>>(INITIAL_CONSUMPTION_LOGS);

  // Currently Selected Medicine
  const selectedMed = useMemo(() => {
    return medicines.find((m) => m.id === selectedMedId) || medicines[0];
  }, [medicines, selectedMedId]);

  // Critical & Warning Medicines for Quick Selector in 30-Day Line Chart
  const criticalAndWarningMeds = useMemo(() => {
    const priorityMeds = medicines.filter(
      (m) => m.stockoutRisk === 'CRITICAL' || m.stockoutRisk === 'WARNING' || m.currentStock <= m.minStockLevel * 1.2
    );
    return priorityMeds.length > 0 ? priorityMeds.slice(0, 6) : medicines.slice(0, 5);
  }, [medicines]);

  // Quick Metric Counters
  const criticalCount = useMemo(() => medicines.filter((m) => m.stockoutRisk === 'CRITICAL').length, [medicines]);
  const surplusCount = useMemo(() => medicines.filter((m) => m.stockoutRisk === 'SURPLUS').length, [medicines]);
  const expiringCount = useMemo(
    () => medicines.filter((m) => m.fefoPriority === 'EXPIRING_SOON' || m.fefoPriority === 'URGENT').length,
    [medicines]
  );
  const totalPipelineCount = useMemo(
    () => medicines.reduce((acc, m) => acc + (m.pendingOrders > 0 ? 1 : 0), 0),
    [medicines]
  );

  // Filtered & Sorted Medicine List
  const filteredMeds = useMemo(() => {
    return medicines
      .filter((m) => {
        const matchesSearch = matchesSearchKeywords(
          searchTerm,
          m.name,
          m.category,
          m.batchNumber,
          m.sourceWarehouse,
          m.unit,
          m.stockoutRisk,
          m.fefoPriority
        );

        const matchesCategory = categoryFilter === 'ALL' || m.category === categoryFilter;
        const matchesStatus = statusFilter === 'ALL' || m.stockoutRisk === statusFilter;
        const matchesExpiry =
          expiryFilter === 'ALL' ||
          (expiryFilter === 'EXPIRING_SOON' && (m.fefoPriority === 'EXPIRING_SOON' || m.fefoPriority === 'URGENT')) ||
          (expiryFilter === 'STABLE' && m.fefoPriority === 'NORMAL');

        return matchesSearch && matchesCategory && matchesStatus && matchesExpiry;
      })
      .sort((a, b) => {
        if (sortField === 'depletion') return a.projectedStockoutDays - b.projectedStockoutDays;
        if (sortField === 'stock') return a.currentStock - b.currentStock;
        if (sortField === 'burn') return b.dailyConsumption - a.dailyConsumption;
        if (sortField === 'expiry') return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        return a.name.localeCompare(b.name);
      });
  }, [medicines, searchTerm, categoryFilter, statusFilter, expiryFilter, sortField]);

  // 30-Day Historical Consumption Trends & Projected Demand Dataset for Recharts LineChart
  const thirtyDayConsumptionAndDemandData = useMemo(() => {
    if (!selectedMed) return [];
    const baseDaily = Math.max(1, selectedMed.dailyConsumption);
    const surgeMultiplier =
      selectedMed.category === 'Essential ORS/Fluids'
        ? 1.32
        : selectedMed.category === 'Vaccines & Antidotes'
        ? 1.25
        : selectedMed.stockoutRisk === 'CRITICAL'
        ? 1.28
        : 1.15;

    // Sustainable daily burn threshold based on minimum safety stock over a 15-day replenishment cycle
    const safeDailyBurnThreshold = Math.max(1, Math.round(selectedMed.minStockLevel / 6));

    // Top 3 critical medicines for multi-drug comparison
    const topCritical = criticalAndWarningMeds.slice(0, 3);
    const medA = topCritical[0] || selectedMed;
    const medB = topCritical[1] || medicines[1] || selectedMed;
    const medC = topCritical[2] || medicines[2] || selectedMed;

    const points: Array<{
      dayLabel: string;
      dayOffset: number;
      phase: 'Historical (30d)' | 'Projected (14d)';
      historicalConsumption: number | null;
      projectedDemand: number;
      safeBurnLimit: number;
      medAConsumption: number;
      medBConsumption: number;
      medCConsumption: number;
    }> = [];

    const anchorDate = new Date('2026-09-22T00:00:00');

    // Generate 30 Historical Days (Day -29 to Day 0 / Today) + 10 Projected Days (Day +1 to Day +10)
    for (let offset = -29; offset <= 10; offset++) {
      const d = new Date(anchorDate);
      d.setDate(anchorDate.getDate() + offset);
      const monthStr = d.toLocaleString('en-US', { month: 'short' });
      const dayNum = String(d.getDate()).padStart(2, '0');
      const label = offset === 0 ? `${monthStr} ${dayNum} (Today)` : offset > 0 ? `${monthStr} ${dayNum} (+${offset}d)` : `${monthStr} ${dayNum}`;

      // Deterministic clinical wave pattern (OPD Monday spikes + progressive heat/seasonal surge)
      const seasonalRamp = 0.78 + ((offset + 29) / 39) * 0.44;
      const weeklyCycle = Math.sin((offset + 29) * 0.95) * 0.11 + Math.cos((offset + 29) * 0.45) * 0.06;

      const histVal =
        offset <= 0
          ? Math.max(1, Math.round(baseDaily * (seasonalRamp + weeklyCycle)))
          : null;

      // Projected demand curve models expected epidemiological demand across both historical baseline and future surge window
      const projFactor =
        offset <= 0
          ? seasonalRamp + 0.04
          : 1.08 + (offset / 10) * (surgeMultiplier - 1.02) + Math.sin(offset * 0.8) * 0.05;
      const projVal = Math.max(1, Math.round(baseDaily * projFactor));

      // Multi-medicine comparison values (normalized or actual daily units)
      const medABase = Math.max(1, medA.dailyConsumption);
      const medBBase = Math.max(1, medB.dailyConsumption);
      const medCBase = Math.max(1, medC.dailyConsumption);

      points.push({
        dayLabel: label,
        dayOffset: offset,
        phase: offset <= 0 ? 'Historical (30d)' : 'Projected (14d)',
        historicalConsumption: histVal,
        projectedDemand: projVal,
        safeBurnLimit: safeDailyBurnThreshold,
        medAConsumption: Math.max(1, Math.round(medABase * (offset <= 0 ? seasonalRamp + weeklyCycle : projFactor))),
        medBConsumption: Math.max(1, Math.round(medBBase * (offset <= 0 ? seasonalRamp * 0.96 - weeklyCycle * 0.5 : projFactor * 0.94))),
        medCConsumption: Math.max(1, Math.round(medCBase * (offset <= 0 ? seasonalRamp * 1.03 + weeklyCycle * 0.4 : projFactor * 1.05)))
      });
    }

    return points;
  }, [selectedMed, criticalAndWarningMeds, medicines]);

  // Summary statistics for the 30-Day Historical & Projected LineChart
  const thirtyDayStats = useMemo(() => {
    const historicalRows = thirtyDayConsumptionAndDemandData.filter((d) => d.historicalConsumption !== null);
    const total30DayHistorical = historicalRows.reduce((sum, r) => sum + (r.historicalConsumption || 0), 0);
    const peakHistoricalDay = historicalRows.reduce(
      (max, r) => ((r.historicalConsumption || 0) > max.val ? { val: r.historicalConsumption || 0, label: r.dayLabel } : max),
      { val: 0, label: '' }
    );
    const projected30DayTotal = selectedMed
      ? Math.max(selectedMed.forecast30Day, Math.round(selectedMed.dailyConsumption * 30 * 1.18))
      : 0;
    const netStockGap = selectedMed
      ? selectedMed.currentStock + selectedMed.pendingOrders - projected30DayTotal
      : 0;

    return {
      total30DayHistorical,
      avgHistoricalDaily: historicalRows.length > 0 ? Math.round(total30DayHistorical / historicalRows.length) : 0,
      peakHistoricalDay,
      projected30DayTotal,
      netStockGap
    };
  }, [thirtyDayConsumptionAndDemandData, selectedMed]);

  // Deterministic Forecast & Replenishment Calculation for Selected Medicine & PHC
  const selectedForecast = useMemo(() => {
    return calculateMedicineForecast({
      medicine: selectedMed,
      phcName: selectedPHC.name,
      leadTimeDays: 3.5,
      safetyBufferDays: 3.0,
      replenishmentCycleDays: 14,
      consumptionPeriodDays: 30,
      isSyntheticData: true
    });
  }, [selectedMed, selectedPHC.name]);

  // Recommended Reorder Calculation derived from deterministic forecast
  const recommendedReorder = useMemo(() => {
    if (!selectedMed) {
      return { qty: 0, urgency: 'ROUTINE' as const, reason: '' };
    }
    let urgency: 'ROUTINE' | 'URGENT' | 'EMERGENCY_REPLENISHMENT' = 'ROUTINE';
    if (selectedForecast.riskLevel === 'CRITICAL') {
      urgency = 'EMERGENCY_REPLENISHMENT';
    } else if (selectedForecast.riskLevel === 'WARNING') {
      urgency = 'URGENT';
    }

    return {
      qty: selectedForecast.suggestedReplenishmentQty,
      urgency,
      reason: selectedForecast.primaryRiskReason
    };
  }, [selectedMed, selectedForecast]);

  // Check if selected medicine has a matching surplus lateral opportunity
  const matchedRedistribution = useMemo(() => {
    if (!selectedMed) return null;
    return redistributions.find(
      (r) => resolveMedicineMatch([selectedMed], r.medicineName).status === 'MATCHED'
    );
  }, [selectedMed, redistributions]);

  // Handle Dispensing Action
  const handleDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed || dispenseQty <= 0) return;

    if (dispenseQty > selectedMed.currentStock) {
      showNotification(`Dispensing Error: Quantity (${dispenseQty}) exceeds physical stock (${selectedMed.currentStock}).`);
      return;
    }

    setIsDispensing(true);
    const ok = await consumeMedicine(selectedMed.id, dispenseQty, `${dispensingWard}: ${dispenseReason}`);
    setIsDispensing(false);

    if (!ok) return;

    const newLog: ConsumptionLogEntry = {
      id: `log-${Date.now()}`,
      medicineId: selectedMed.id,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      quantity: dispenseQty,
      wardOrEncounter: `${dispensingWard} (${dispenseReason})`,
      dispensedBy: 'Authorized PHC Pharmacist',
      batchNumber: selectedMed.batchNumber,
      balanceAfter: Math.max(0, selectedMed.currentStock - dispenseQty)
    };

    setConsumptionLogs((prev) => ({
      ...prev,
      [selectedMed.id]: [newLog, ...(prev[selectedMed.id] || [])]
    }));

    showNotification(
      `Dispensary Recorded: Dispensed ${dispenseQty} ${selectedMed.unit} of ${selectedMed.name}. Balance: ${
        Math.max(0, selectedMed.currentStock - dispenseQty)
      } ${selectedMed.unit}.`
    );
    setDispenseQty(10);
  };

  // Open Reorder Modal with Pre-filled Calculation
  const handleOpenReorderModal = (med: MedicineItem) => {
    const rec =
      med.id === selectedMed.id
        ? recommendedReorder
        : {
            qty: Math.max(100, Math.ceil((med.minStockLevel * 2 - med.currentStock - med.pendingOrders) / 50) * 50),
            urgency: med.projectedStockoutDays <= 4 ? ('EMERGENCY_REPLENISHMENT' as const) : ('ROUTINE' as const),
            reason: `Reorder requisition for ${med.name} based on dynamic lead-time stockout projection.`
          };

    setOrderModalData({
      medicineName: med.name,
      quantity: rec.qty,
      priority: rec.urgency,
      justification: rec.reason
    });
    setIsOrderModalOpen(true);
  };

  // Calculate days until expiry
  const getDaysUntilExpiry = (expiryDateStr: string) => {
    const today = new Date('2026-09-22');
    const exp = new Date(expiryDateStr);
    const diffTime = exp.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const topThreeCritical = criticalAndWarningMeds.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* 1. Header & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded font-mono uppercase tracking-wider">
              Medicine Inventory &amp; FEFO
            </span>
            <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-mono">
              Synthetic / Demo PHC Inventory • Local SQLite + Offline Sync
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Pill className="w-5 h-5 text-emerald-600" />
            <span>Medicine Inventory, Stock Adjustment &amp; FEFO Defense</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Live stock adjustments, 30-day synthetic consumption velocity, lead-time stock-out risk, FEFO batch expiry defense, and replenishment for <strong>{selectedPHC.name}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-100 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              <span>Stock Ledger & 30-Day Line Trend</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('predictive_chart')}
              className={`px-3 py-1.5 rounded-md font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'predictive_chart'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Depletion Simulator (D3.js)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleOpenReorderModal(selectedMed)}
            className="px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Draft RMSCL Indent</span>
          </button>
        </div>
      </div>

      {/* 2. Top Interactive Intelligence Cards (Clickable Quick Filters) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card A: Stock-out Risk */}
        <div
          onClick={() => {
            setStatusFilter(statusFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL');
          }}
          className={`rounded-xl p-4 sm:p-5 shadow-xs transition-all cursor-pointer border flex flex-col justify-between ${
            statusFilter === 'CRITICAL'
              ? 'bg-rose-100/90 border-rose-400 ring-2 ring-rose-300'
              : 'bg-rose-50/80 border-rose-200/90 hover:border-rose-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                <span>Stockout Vulnerability</span>
              </span>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-rose-200 text-rose-950">
                {criticalCount} Critical
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-rose-950 mt-2">
              {criticalCount} Item{criticalCount === 1 ? '' : 's'}
            </div>
            <p className="text-xs text-rose-900 mt-1 font-medium leading-relaxed">
              Depletion projected within <strong>4 days</strong>; below warehouse delivery lead time window.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-rose-200 text-[11px] text-rose-800 font-bold flex items-center justify-between">
            <span>{statusFilter === 'CRITICAL' ? '● Filter Active' : 'Click to filter shortages'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card B: FEFO Expiry Management */}
        <div
          onClick={() => {
            setExpiryFilter(expiryFilter === 'EXPIRING_SOON' ? 'ALL' : 'EXPIRING_SOON');
          }}
          className={`rounded-xl p-4 sm:p-5 shadow-xs transition-all cursor-pointer border flex flex-col justify-between ${
            expiryFilter === 'EXPIRING_SOON'
              ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-300'
              : 'bg-amber-50/80 border-amber-200/90 hover:border-amber-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-700" />
                <span>FEFO Expiry Defense</span>
              </span>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-amber-200 text-amber-950">
                {expiringCount} Batches
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-amber-950 mt-2">
              {expiringCount} Flagged
            </div>
            <p className="text-xs text-amber-900 mt-1 font-medium leading-relaxed">
              Shelf-life expiring within <strong>90 days</strong>. Enforce First-Expiry-First-Out dispensing.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-amber-200 text-[11px] text-amber-800 font-bold flex items-center justify-between">
            <span>{expiryFilter === 'EXPIRING_SOON' ? '● Filter Active' : 'Click to view batches'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card C: Surplus & Lateral Rebalancing */}
        <div
          onClick={() => {
            setStatusFilter(statusFilter === 'SURPLUS' ? 'ALL' : 'SURPLUS');
          }}
          className={`rounded-xl p-4 sm:p-5 shadow-xs transition-all cursor-pointer border flex flex-col justify-between ${
            statusFilter === 'SURPLUS'
              ? 'bg-sky-100/90 border-sky-400 ring-2 ring-sky-300'
              : 'bg-sky-50/80 border-sky-200/90 hover:border-sky-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-sky-700" />
                <span>Surplus Stock Rebalance</span>
              </span>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-sky-200 text-sky-950">
                {surplusCount} Surplus
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-sky-950 mt-2">
              {surplusCount} Drug{surplusCount === 1 ? '' : 's'}
            </div>
            <p className="text-xs text-sky-900 mt-1 font-medium leading-relaxed">
              Inventory exceeding 60-day buffer. Eligible for lateral dispatch to sister PHCs.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-sky-200 text-[11px] text-sky-800 font-bold flex items-center justify-between">
            <span>{statusFilter === 'SURPLUS' ? '● Filter Active' : 'Click to view surplus'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card D: Inward Logistics Pipeline */}
        <div
          onClick={() => {
            setSearchTerm('');
            setCategoryFilter('ALL');
            setStatusFilter('ALL');
            setExpiryFilter('ALL');
            showNotification(`Displaying formulary items with active warehouse indents.`);
          }}
          className="bg-emerald-50/80 border border-emerald-200/90 hover:border-emerald-300 rounded-xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Inward Consignments</span>
              </span>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-emerald-200 text-emerald-950">
                {totalPipelineCount} Indents
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-950 mt-2">
              {totalPipelineCount} In Transit
            </div>
            <p className="text-xs text-emerald-900 mt-1 font-medium leading-relaxed">
              Dispatched from District Warehouse Mandore; next delivery estimated within <strong>48 hours</strong>.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-emerald-200 text-[11px] text-emerald-800 font-bold flex items-center justify-between">
            <span>RMSCL Mandore Hub</span>
            <span className="font-mono">Est. Route ETA</span>
          </div>
        </div>
      </div>

      {/* 2B. Recharts 30-Day Historical Consumption Trends & Projected Demand LineChart Panel */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-sky-100 text-sky-900">
                30-Day Velocity & Surge Projection
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Aug 24 – Sep 22 (Historical) • Sep 23 – Oct 02 (Projected Demand)
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>30-Day Historical Consumption Trends & Projected Demand — Critical Medicines</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Daily dispensing velocity over the past 30 days alongside IDSP syndromic & weather-adjusted projected demand for critical formulary stock.
            </p>
          </div>

          {/* Chart Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setTrendChartMode('single')}
                className={`px-3 py-1.5 rounded-md font-bold transition-colors cursor-pointer ${
                  trendChartMode === 'single'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Selected Medicine ({selectedMed.name.split(' ')[0]})
              </button>
              <button
                type="button"
                onClick={() => setTrendChartMode('multi_critical')}
                className={`px-3 py-1.5 rounded-md font-bold transition-colors cursor-pointer ${
                  trendChartMode === 'multi_critical'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Compare Critical Medicines
              </button>
            </div>
          </div>
        </div>

        {/* Critical Medicine Quick Selector Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            Critical Formulary Focus:
          </span>
          {criticalAndWarningMeds.map((med) => {
            const isSelected = med.id === selectedMed.id;
            return (
              <button
                key={med.id}
                type="button"
                onClick={() => {
                  setSelectedMedId(med.id);
                  setTrendChartMode('single');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : med.stockoutRisk === 'CRITICAL'
                    ? 'bg-rose-50/80 text-rose-900 border-rose-200 hover:bg-rose-100/80'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    med.stockoutRisk === 'CRITICAL'
                      ? 'bg-rose-500'
                      : med.stockoutRisk === 'WARNING'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />
                <span>{med.name}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isSelected ? 'bg-slate-800 text-slate-200' : 'bg-white/80 text-slate-600'
                  }`}
                >
                  {med.projectedStockoutDays}d left
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Recharts LineChart + KPI Summary Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Left 9 Cols: Recharts LineChart */}
          <div className="lg:col-span-9 h-72 w-full bg-slate-50/50 rounded-xl border border-slate-200/80 p-3">
            <ResponsiveContainer width="100%" height="100%">
              {trendChartMode === 'single' ? (
                <LineChart
                  data={thirtyDayConsumptionAndDemandData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="dayLabel"
                    tick={{ fontSize: 10, fill: '#475569' }}
                    stroke="#cbd5e1"
                    interval={3}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#475569' }}
                    stroke="#cbd5e1"
                    unit={` ${selectedMed.unit}`}
                    width={65}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '11px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  <ReferenceLine
                    x="Sep 22 (Today)"
                    stroke="#475569"
                    strokeDasharray="3 3"
                    label={{
                      value: 'Today (Forecast Split)',
                      position: 'insideTopLeft',
                      fill: '#334155',
                      fontSize: 10,
                      fontWeight: 700
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="historicalConsumption"
                    name={`30-Day Historical Consumption (${selectedMed.unit}/day)`}
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    dot={{ r: 2.5, fill: '#0284c7' }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="projectedDemand"
                    name={`Projected Demand Curve (${selectedMed.unit}/day)`}
                    stroke="#059669"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    dot={{ r: 2, fill: '#059669' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="safeBurnLimit"
                    name="Safe Buffer Burn Ceiling"
                    stroke="#e11d48"
                    strokeWidth={1.5}
                    strokeDasharray="2 4"
                    dot={false}
                  />
                </LineChart>
              ) : (
                <LineChart
                  data={thirtyDayConsumptionAndDemandData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="dayLabel"
                    tick={{ fontSize: 10, fill: '#475569' }}
                    stroke="#cbd5e1"
                    interval={3}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#475569' }} stroke="#cbd5e1" width={45} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '11px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  <ReferenceLine
                    x="Sep 22 (Today)"
                    stroke="#475569"
                    strokeDasharray="3 3"
                    label={{
                      value: 'Today → Projected',
                      position: 'insideTopLeft',
                      fill: '#334155',
                      fontSize: 10,
                      fontWeight: 700
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="medAConsumption"
                    name={`${topThreeCritical[0]?.name || 'Critical Drug 1'} (Daily Units)`}
                    stroke="#e11d48"
                    strokeWidth={2.5}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="medBConsumption"
                    name={`${topThreeCritical[1]?.name || 'Critical Drug 2'} (Daily Units)`}
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="medCConsumption"
                    name={`${topThreeCritical[2]?.name || 'Critical Drug 3'} (Daily Units)`}
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Right 3 Cols: 30-Day Consumption & Demand Summary Metrics */}
          <div className="lg:col-span-3 space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                30-Day Historical Dispensed
              </span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {thirtyDayStats.total30DayHistorical.toLocaleString()} {selectedMed.unit}
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5 font-mono">
                Avg: <strong>{thirtyDayStats.avgHistoricalDaily}/day</strong> • Peak: {thirtyDayStats.peakHistoricalDay.val}/day
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                Next 30-Day Projected Demand
              </span>
              <div className="text-xl font-bold font-mono text-emerald-950 mt-1">
                {thirtyDayStats.projected30DayTotal.toLocaleString()} {selectedMed.unit}
              </div>
              <div className="text-[11px] text-emerald-800 mt-0.5">
                Includes +18% seasonal syndrome surge
              </div>
            </div>

            <div
              className={`p-3.5 rounded-xl border ${
                thirtyDayStats.netStockGap < 0
                  ? 'bg-rose-50/90 border-rose-200 text-rose-950'
                  : 'bg-sky-50/90 border-sky-200 text-sky-950'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider block">
                30-Day Net Coverage Balance
              </span>
              <div className="text-xl font-bold font-mono mt-1">
                {thirtyDayStats.netStockGap > 0 ? `+${thirtyDayStats.netStockGap.toLocaleString()}` : thirtyDayStats.netStockGap.toLocaleString()}{' '}
                {selectedMed.unit}
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => handleOpenReorderModal(selectedMed)}
                  className="w-full py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Indent Projected Deficit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Workspace: Full-Width 30-Day D3 Predictive Trend Chart OR Master Inventory Ledger */}
      {viewMode === 'predictive_chart' ? (
        <PredictiveInventoryTrendChart
          selectedMedicine={selectedMed}
          allMedicines={medicines}
          onSelectMedicine={(med) => setSelectedMedId(med.id)}
          onDraftReorder={(med) => handleOpenReorderModal(med)}
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left 7 Columns: Master Inventory Table with Search & Filters */}
          <div className="xl:col-span-7 bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
            {/* Search & Filter Header Toolbar */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/90 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search drug name, salt, batch #, or warehouse..."
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs font-medium"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Reset Filters Button if any filter is active */}
                {(searchTerm || categoryFilter !== 'ALL' || statusFilter !== 'ALL' || expiryFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setCategoryFilter('ALL');
                      setStatusFilter('ALL');
                      setExpiryFilter('ALL');
                    }}
                    className="px-3 py-1.5 text-xs text-slate-700 bg-slate-200/80 hover:bg-slate-300/80 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <FilterX className="w-3.5 h-3.5" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>

              {/* Filter Dropdowns Row */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <select
                  aria-label="Filter by formulary category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
                >
                  <option value="ALL">All Categories ({medicines.length})</option>
                  <option value="Essential ORS/Fluids">Essential ORS/Fluids</option>
                  <option value="Analgesics">Analgesics</option>
                  <option value="Antibiotics">Antibiotics</option>
                  <option value="Maternal & Child">Maternal & Child</option>
                  <option value="Vaccines & Antidotes">Vaccines & Antidotes</option>
                </select>

                <select
                  aria-label="Filter by stockout risk"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
                >
                  <option value="ALL">All Stock Statuses</option>
                  <option value="CRITICAL">Critical Shortage (&lt;5 days)</option>
                  <option value="WARNING">Low Stock Warning (5–10 days)</option>
                  <option value="NORMAL">Normal Buffer (&gt;10 days)</option>
                  <option value="SURPLUS">Surplus Stock (&gt;60 days)</option>
                </select>

                <select
                  aria-label="Filter by FEFO expiry"
                  value={expiryFilter}
                  onChange={(e) => setExpiryFilter(e.target.value as any)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
                >
                  <option value="ALL">All Shelf-Life Stages</option>
                  <option value="EXPIRING_SOON">Expiring in &lt;90 Days (FEFO)</option>
                  <option value="STABLE">Stable Shelf Life (&gt;180 Days)</option>
                </select>

                <div className="ml-auto flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    aria-label="Sort inventory rows by"
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as any)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
                  >
                    <option value="depletion">Sort: Days Remaining (Urgent First)</option>
                    <option value="stock">Sort: Physical Stock (Lowest First)</option>
                    <option value="burn">Sort: Daily Consumption Burn</option>
                    <option value="expiry">Sort: Expiry Date (Earliest First)</option>
                    <option value="name">Sort: Alphabetical (A–Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div className="overflow-x-auto flex-1">
              {filteredMeds.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={FilterX}
                    title="No Matching Medicines Found"
                    description="No formulary items match your active search query, category, or risk filters."
                    actionText="Clear All Filters"
                    onAction={() => {
                      setSearchTerm('');
                      setCategoryFilter('ALL');
                      setStatusFilter('ALL');
                      setExpiryFilter('ALL');
                    }}
                  />
                </div>
              ) : (
                <table className="w-full text-left text-xs" role="table">
                  <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th scope="col" className="px-4 py-3">Medicine & Formulation</th>
                      <th scope="col" className="px-3 py-3">Batch & Expiry</th>
                      <th scope="col" className="px-3 py-3 text-right">Physical Stock</th>
                      <th scope="col" className="px-3 py-3 text-right">Burn Rate</th>
                      <th scope="col" className="px-3 py-3 text-center">Stockout Window</th>
                      <th scope="col" className="px-3 py-3 text-center">Risk Status</th>
                      <th scope="col" className="px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMeds.map((med) => {
                      const isSelected = selectedMed?.id === med.id;
                      const daysUntilExp = getDaysUntilExpiry(med.expiryDate);
                      const stockPercent = Math.min(100, Math.round((med.currentStock / med.maxStockLevel) * 100));

                      return (
                        <tr
                          key={med.id}
                          onClick={() => setSelectedMedId(med.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-emerald-50/90 font-medium border-l-4 border-l-emerald-600'
                              : 'hover:bg-slate-50/90'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{med.name}</div>
                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                                {med.unit}
                              </span>
                              <span>{med.category}</span>
                            </div>
                          </td>

                          <td className="px-3 py-3 font-mono text-[11px]">
                            <div className="text-slate-800 font-bold">{med.batchNumber}</div>
                            <div
                              className={`text-[10px] font-semibold mt-0.5 flex items-center gap-1 ${
                                daysUntilExp <= 90 ? 'text-amber-800 font-bold' : 'text-slate-500'
                              }`}
                            >
                              <span>Exp: {med.expiryDate}</span>
                              {daysUntilExp <= 90 && (
                                <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-900 text-[9px]">
                                  {daysUntilExp}d
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-3 text-right font-mono">
                            <div className="font-bold text-slate-900 text-sm">
                              {med.currentStock.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-slate-500 font-sans">
                              Min Buffer: {med.minStockLevel}
                            </div>
                            <div className="w-16 h-1.5 bg-slate-200 rounded-full ml-auto mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  med.currentStock <= med.minStockLevel
                                    ? 'bg-rose-500'
                                    : med.currentStock >= med.maxStockLevel * 0.9
                                    ? 'bg-sky-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${stockPercent}%` }}
                              />
                            </div>
                          </td>

                          <td className="px-3 py-3 text-right font-mono">
                            <div className="font-bold text-slate-800">{med.dailyConsumption}/day</div>
                            <div className="text-[10px] text-slate-500 font-sans">{med.weeklyConsumption}/wk</div>
                          </td>

                          <td className="px-3 py-3 text-center font-mono">
                            <span
                              className={`font-bold text-xs px-2.5 py-0.5 rounded-full inline-block ${
                                med.projectedStockoutDays <= 4
                                  ? 'bg-rose-100 text-rose-950 border border-rose-300'
                                  : med.projectedStockoutDays <= 8
                                  ? 'bg-amber-100 text-amber-950 border border-amber-300'
                                  : med.projectedStockoutDays >= 60
                                  ? 'bg-sky-100 text-sky-950 border border-sky-300'
                                  : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                              }`}
                            >
                              {med.projectedStockoutDays} Days
                            </span>
                          </td>

                          <td className="px-3 py-3 text-center">
                            <StatusBadge status={med.stockoutRisk} />
                          </td>

                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setSelectedMedId(med.id);
                                  const qty = Math.min(10, med.currentStock);
                                  if (qty > 0) {
                                    await consumeMedicine(med.id, qty, 'Quick 1-Click OPD Dispense');
                                    showNotification(`Dispensed ${qty} ${med.unit} of ${med.name}.`);
                                  }
                                }}
                                title="Quick Dispense 10 units"
                                className="px-2 py-1 text-[11px] font-semibold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                              >
                                -10 Use
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMedId(med.id);
                                  setActiveTab('reorder');
                                  handleOpenReorderModal(med);
                                }}
                                title="Order Replacement Stock"
                                className="px-2 py-1 text-[11px] font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-md transition-colors cursor-pointer whitespace-nowrap"
                              >
                                + Order
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMedId(med.id);
                                  setActiveTab('forecast');
                                }}
                                title="Inspect 30-Day Consumption & Demand Line Chart"
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <TrendingUp className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Table Footer */}
            <div className="p-3.5 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-1.5">
              <span>
                Showing <strong>{filteredMeds.length}</strong> of {medicines.length} essential pharmaceuticals
              </span>
              <span className="font-mono text-slate-500">
                Active Focus: <strong className="text-slate-900">{selectedMed.name}</strong>
              </span>
            </div>
          </div>

          {/* Right 5 Columns: Deep-Dive Intelligence & Action Center for Selected Medicine */}
          <div className="xl:col-span-5 bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4 flex flex-col">
            {/* Header Card for Selected Medicine */}
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded uppercase font-mono tracking-wider">
                    {selectedMed.category}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1 leading-snug">
                    {selectedMed.name}
                  </h2>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    Batch: <strong className="text-slate-800">{selectedMed.batchNumber}</strong> • Expiry: {selectedMed.expiryDate}
                  </div>
                </div>
                <StatusBadge status={selectedMed.stockoutRisk} />
              </div>

              {selectedMed.pendingOrders > 0 && (
                <div className="mt-3 p-2.5 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between text-xs text-blue-900">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>
                      <strong>{selectedMed.pendingOrders} {selectedMed.unit}</strong> In Transit from Mandore
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-blue-100 px-2 py-0.5 rounded">
                    ETA: {selectedMed.expectedDeliveryDate || '48 hrs'}
                  </span>
                </div>
              )}
            </div>

            {/* Deep-Dive Sub-Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200 pb-2 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  activeTab === 'details' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Specifications
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('forecast')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  activeTab === 'forecast' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                30-Day Demand Trend
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('trend_d3')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                  activeTab === 'trend_d3' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>D3 Stockout Sim</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  activeTab === 'history' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Consumption Log
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reorder')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  activeTab === 'reorder' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Reorder Analysis
              </button>
              {selectedMed.stockoutRisk === 'SURPLUS' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('surplus')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                    activeTab === 'surplus' ? 'bg-sky-700 text-white shadow-2xs' : 'text-sky-700 hover:bg-sky-50'
                  }`}
                >
                  Surplus Rebalance
                </button>
              )}
            </div>

            {/* TAB 1: SPECIFICATIONS & GAUGES */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                  <span className="font-mono font-bold uppercase">{selectedForecast.estimateBadgeLabel}</span>
                  <span>PHC: <strong>{selectedPHC.name}</strong> • Deterministic Inventory Arithmetic</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">
                      Usable Stock
                    </span>
                    <div className="text-lg font-bold text-slate-900 mt-1">
                      {selectedForecast.usableStock}
                    </div>
                    <span className="text-[10px] text-slate-500 font-sans">
                      {selectedForecast.expiredBatchStock > 0
                        ? `Excl. ${selectedForecast.expiredBatchStock} expired`
                        : `${selectedMed.unit} (0 expired)`}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">
                      Days Remaining
                    </span>
                    <div className={`text-lg font-bold mt-1 ${selectedForecast.estimatedDaysRemaining !== null && selectedForecast.estimatedDaysRemaining <= 4 ? 'text-rose-700' : 'text-slate-900'}`}>
                      {selectedForecast.estimatedDaysRemaining !== null ? `${selectedForecast.estimatedDaysRemaining}d` : 'N/A'}
                    </div>
                    <span className="text-[10px] text-slate-500 font-sans">
                      {selectedForecast.estimatedStockoutDate ? `Out: ${selectedForecast.estimatedStockoutDate}` : 'Not calculable'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">
                      Avg Daily Burn
                    </span>
                    <div className="text-lg font-bold text-slate-800 mt-1">
                      {selectedForecast.recentAvgDailyConsumption ?? 'N/A'}
                    </div>
                    <span className="text-[10px] text-slate-500 font-sans">30d avg ({selectedMed.unit}/d)</span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">
                      Reorder Point
                    </span>
                    <div className="text-lg font-bold text-indigo-700 mt-1">
                      {selectedForecast.reorderPoint}
                    </div>
                    <span className="text-[10px] text-slate-500 font-sans">SS: {selectedForecast.safetyStock} {selectedMed.unit}</span>
                  </div>
                </div>

                {/* Short Explanation of Main Risk Reason */}
                <div className={`p-3.5 rounded-xl border text-xs ${
                  selectedForecast.riskLevel === 'CRITICAL'
                    ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                    : selectedForecast.riskLevel === 'WARNING'
                    ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                }`}>
                  <div className="font-bold uppercase text-[10px] font-mono mb-1">
                    Primary Risk Explanation ({selectedForecast.riskLevel})
                  </div>
                  <p className="leading-relaxed font-medium">{selectedForecast.primaryRiskReason}</p>
                </div>

                {/* Batch Breakdown (showing Usable vs Expired batches) */}
                {selectedForecast.batchesBreakdown.length > 0 && (
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Batch Shelf-Life &amp; Usable Stock Breakdown</span>
                      <span className="font-mono text-[10px] text-slate-500">
                        Total: {selectedForecast.totalPhysicalStock} • Usable: {selectedForecast.usableStock} • Expired: {selectedForecast.expiredBatchStock}
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {selectedForecast.batchesBreakdown.map((b) => (
                        <div key={b.batchNumber} className="py-1.5 flex items-center justify-between font-mono text-[11px]">
                          <div>
                            <span className="font-bold text-slate-900">{b.batchNumber}</span>
                            <span className="text-slate-500 ml-2">Exp: {b.expiryDate}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{b.quantity} {selectedMed.unit}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              b.isExpired
                                ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                : b.daysToExpiry !== null && b.daysToExpiry <= 90
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-900'
                            }`}>
                              {b.isExpired ? 'EXPIRED (Excluded)' : b.daysToExpiry !== null && b.daysToExpiry <= 90 ? `FEFO (${b.daysToExpiry}d)` : 'USABLE'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs">
                  <div className="font-bold text-slate-900 mb-1 flex items-center justify-between">
                    <span>Supply Chain &amp; Replenishment Parameters</span>
                    <span className="font-mono text-[11px] text-slate-500">Facility: {selectedPHC.code}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600 font-medium">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Consumption Period:</span>
                      <span className="text-slate-800 text-[11px]">{selectedForecast.consumptionPeriodLabel}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Est. Stock-Out Date:</span>
                      <span className="font-mono font-bold text-slate-800">{selectedForecast.estimatedStockoutDateFormatted}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Lead Time &amp; Safety Stock:</span>
                      <span className="font-mono font-bold text-slate-800">{selectedForecast.leadTimeDays}d Lead • SS: {selectedForecast.safetyStock} {selectedMed.unit}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Reorder Point / Suggested Qty:</span>
                      <span className="font-mono font-bold text-emerald-800">ROP: {selectedForecast.reorderPoint} • Order: {selectedForecast.suggestedReplenishmentQty} {selectedMed.unit}</span>
                    </div>
                  </div>
                </div>

                {getDaysUntilExpiry(selectedMed.expiryDate) <= 90 && (
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed">
                      <strong>FEFO Expiry Defense:</strong> Batch <strong>{selectedMed.batchNumber}</strong> expires in{' '}
                      <strong>{getDaysUntilExpiry(selectedMed.expiryDate)} days</strong> ({selectedMed.expiryDate}). Enforce first-out dispensing protocol. At current burn rate of {selectedMed.dailyConsumption} {selectedMed.unit}/day, usable inventory ({selectedForecast.usableStock} {selectedMed.unit}) will require approximately{' '}
                      <strong>{selectedForecast.estimatedDaysRemaining ?? 'N/A'} days</strong> to dispense.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: 30-DAY HISTORICAL CONSUMPTION & PROJECTED DEMAND LINE CHART */}
            {activeTab === 'forecast' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span>30-Day Historical Consumption & Projected Demand</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      30-day actual dispense trajectory vs. projected demand for {selectedMed.name}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    Recharts Line Model
                  </span>
                </div>

                {/* Recharts LineChart inside Deep-Dive Tab */}
                <div className="h-52 w-full text-[10px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={thirtyDayConsumptionAndDemandData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="dayLabel" tick={{ fontSize: 9, fill: '#64748b' }} stroke="#cbd5e1" interval={5} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748b' }} stroke="#cbd5e1" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          fontSize: '11px'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
                      <Line
                        type="monotone"
                        dataKey="historicalConsumption"
                        name="30d Historical Consumption"
                        stroke="#0284c7"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="projectedDemand"
                        name="Projected Demand"
                        stroke="#059669"
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-900 font-bold uppercase block">
                      7-Day Projected Need
                    </span>
                    <div className="text-xl font-bold font-mono text-emerald-950 mt-1">
                      {selectedMed.forecast7Day} {selectedMed.unit}
                    </div>
                    <span className="text-[10px] text-emerald-800 mt-0.5 block">
                      Weekly consumption estimate
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-600 font-bold uppercase block">
                      30-Day Projected Demand
                    </span>
                    <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                      {thirtyDayStats.projected30DayTotal} {selectedMed.unit}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      30d Hist: {thirtyDayStats.total30DayHistorical} {selectedMed.unit}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewMode('predictive_chart')}
                  className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Open Full 30-Day D3 Predictive Depletion Simulator</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* TAB 2B: 30-DAY D3 PREDICTIVE TREND */}
            {activeTab === 'trend_d3' && (
              <PredictiveInventoryTrendChart
                selectedMedicine={selectedMed}
                allMedicines={medicines}
                onSelectMedicine={(med) => setSelectedMedId(med.id)}
                onDraftReorder={(med) => handleOpenReorderModal(med)}
              />
            )}

            {/* TAB 3: CONSUMPTION LOGS & DISPENSE WORKFLOW */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <form onSubmit={handleDispense} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Log Physical Dispensing</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Avail: <strong>{selectedMed.currentStock} {selectedMed.unit}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-slate-600 font-bold block mb-1">Dispense Quantity</label>
                      <input
                        type="number"
                        min="1"
                        max={selectedMed.currentStock}
                        value={dispenseQty}
                        onChange={(e) => setDispenseQty(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 font-bold block mb-1">Ward / Counter</label>
                      <select
                        value={dispensingWard}
                        onChange={(e) => setDispensingWard(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option>General OPD Dispensary</option>
                        <option>Casualty / Heatstroke Room</option>
                        <option>Inpatient Ward</option>
                        <option>Labor & Delivery Ward</option>
                        <option>Sub-Centre Distribution</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-600 font-bold block mb-1">Clinical Rationale / Notes</label>
                    <input
                      type="text"
                      value={dispenseReason}
                      onChange={(e) => setDispenseReason(e.target.value)}
                      placeholder="e.g. Diarrhea dehydration, Fever consultation..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isDispensing || selectedMed.currentStock <= 0}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isDispensing ? 'Committing...' : `Commit Dispense of ${dispenseQty} ${selectedMed.unit}`}</span>
                  </button>
                </form>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-900 block">
                    Recent Physical Dispensing Records
                  </span>

                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                    {(!consumptionLogs[selectedMed.id] || consumptionLogs[selectedMed.id].length === 0) ? (
                      <div className="p-4 text-center text-slate-400 text-xs">
                        No recent physical dispensing transactions logged for this batch.
                      </div>
                    ) : (
                      consumptionLogs[selectedMed.id].map((entry) => (
                        <div key={entry.id} className="p-3 hover:bg-slate-50 transition-colors flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="text-emerald-700 font-mono">-{entry.quantity} {selectedMed.unit}</span>
                              <span>•</span>
                              <span className="text-slate-700">{entry.wardOrEncounter}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              By {entry.dispensedBy} • Batch {entry.batchNumber}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-mono text-slate-400 block">{entry.timestamp}</span>
                            <span className="text-[10px] font-mono font-bold text-slate-700">Bal: {entry.balanceAfter}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: REORDER RECOMMENDATION */}
            {activeTab === 'reorder' && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/80 rounded-xl border border-emerald-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-700" />
                      <span>Deterministic Reorder Suggestion ({selectedForecast.estimateBadgeLabel})</span>
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        recommendedReorder.urgency === 'EMERGENCY_REPLENISHMENT'
                          ? 'bg-rose-200 text-rose-950'
                          : recommendedReorder.urgency === 'URGENT'
                          ? 'bg-amber-200 text-amber-950'
                          : 'bg-emerald-200 text-emerald-950'
                      }`}
                    >
                      {recommendedReorder.urgency.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-emerald-950">
                      {selectedForecast.suggestedReplenishmentQty.toLocaleString()} {selectedMed.unit}
                    </span>
                    <span className="text-xs text-emerald-800 font-medium">suggested replenishment quantity</span>
                  </div>

                  <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                    <strong>Main Risk Reason:</strong> {selectedForecast.primaryRiskReason}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2 font-mono">
                  <span className="font-bold text-slate-800 block uppercase text-[10px] tracking-wider font-sans">
                    Deterministic Inventory Parameters ({selectedPHC.name})
                  </span>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Current Usable Stock (Excl. Expired):</span>
                    <span className="font-bold text-slate-900">
                      {selectedForecast.usableStock} {selectedMed.unit}
                      {selectedForecast.expiredBatchStock > 0 ? ` (${selectedForecast.expiredBatchStock} expired excluded)` : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Recent Avg Daily Consumption:</span>
                    <span className="font-bold text-slate-900">
                      {selectedForecast.recentAvgDailyConsumption ?? 'N/A'} {selectedMed.unit}/day ({selectedForecast.consumptionPeriodDays}d period)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Est. Days Remaining &amp; Stock-Out Date:</span>
                    <span className="font-bold text-rose-700">
                      {selectedForecast.estimatedDaysRemaining !== null
                        ? `${selectedForecast.estimatedDaysRemaining}d (${selectedForecast.estimatedStockoutDate})`
                        : 'Not calculable'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Delivery Lead Time (L):</span>
                    <span className="font-bold text-slate-900">{selectedForecast.leadTimeDays} Days</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Safety Stock (SS):</span>
                    <span className="font-bold text-slate-900">{selectedForecast.safetyStock} {selectedMed.unit}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Reorder Point (ROP = D_LT + SS):</span>
                    <span className="font-bold text-indigo-800">{selectedForecast.reorderPoint} {selectedMed.unit}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Active Inward Pipeline:</span>
                    <span className="font-bold text-blue-700">{selectedForecast.pendingInwardStock} {selectedMed.unit}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-emerald-800">
                    <span>Suggested Replenishment Quantity:</span>
                    <span>{selectedForecast.suggestedReplenishmentQty} {selectedMed.unit}</span>
                  </div>
                </div>

                {/* Visible Formulas & Assumptions */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white text-[11px] space-y-1.5">
                  <div className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                    Formulas &amp; Assumptions
                  </div>
                  <div className="font-mono text-slate-700 space-y-1">
                    <div>• {selectedForecast.formulas.usableStockFormula}</div>
                    <div>• {selectedForecast.formulas.daysRemainingFormula}</div>
                    <div>• {selectedForecast.formulas.safetyStockFormula}</div>
                    <div>• {selectedForecast.formulas.reorderPointFormula}</div>
                    <div>• {selectedForecast.formulas.suggestedReplenishmentFormula}</div>
                  </div>
                  <div className="pt-1.5 border-t border-slate-100 text-slate-500 space-y-0.5">
                    {selectedForecast.formulas.assumptions.map((assump, i) => (
                      <div key={i}>• {assump}</div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenReorderModal(selectedMed)}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Truck className="w-4 h-4" />
                  <span>Submit Indent with Suggested {selectedForecast.suggestedReplenishmentQty} {selectedMed.unit}</span>
                </button>
              </div>
            )}

            {/* TAB 5: SURPLUS DETECTION & LATERAL REBALANCING */}
            {activeTab === 'surplus' && selectedMed.stockoutRisk === 'SURPLUS' && (
              <div className="space-y-4">
                <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-950 uppercase tracking-wider flex items-center gap-1.5">
                      <ArrowRightLeft className="w-4 h-4 text-sky-700" />
                      <span>Surplus Stockpile Detected</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-sky-200 text-sky-950 px-2 py-0.5 rounded">
                      {selectedMed.projectedStockoutDays} Days Coverage
                    </span>
                  </div>

                  <div className="text-xl font-bold font-mono text-sky-950">
                    +{selectedMed.predictedSurplus || Math.max(0, selectedMed.currentStock - selectedMed.minStockLevel * 2)} {selectedMed.unit} Excess
                  </div>

                  <p className="text-xs text-sky-900 leading-relaxed font-medium">
                    Current volume ({selectedMed.currentStock} {selectedMed.unit}) will cover facility consumption for over <strong>{selectedMed.projectedStockoutDays} days</strong>. Lateral transfer to sister PHCs experiencing shortages eliminates district-level procurement lag.
                  </p>
                </div>

                {matchedRedistribution ? (
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
                    <span className="font-bold text-slate-800 block text-xs">
                      Target Redistribution Match
                    </span>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>{matchedRedistribution.sourcePHCName || matchedRedistribution.sourcePHC?.name} → {matchedRedistribution.destinationPHCName || matchedRedistribution.targetPHC?.name}</span>
                        <span className="text-emerald-700 font-mono">{matchedRedistribution.recommendedTransferQuantity || matchedRedistribution.transferQuantity} Units</span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium">
                        {matchedRedistribution.clinicalRationale}
                      </p>
                      <div className="text-[10px] font-mono text-slate-500 pt-1 flex items-center justify-between">
                        <span>Transit distance: {matchedRedistribution.transitDistanceKm} km</span>
                        <span>Status: {matchedRedistribution.status}</span>
                      </div>
                    </div>

                    {matchedRedistribution.status === 'APPROVED' ||
                    matchedRedistribution.status === 'IN_TRANSIT' ||
                    matchedRedistribution.status === 'COMPLETED' ? (
                      <div className="w-full py-2 px-3 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Transfer Approved &amp; Applied ({matchedRedistribution.status})</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          approveRedistribution(matchedRedistribution.id);
                        }}
                        className="w-full py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Authorize Inter-PHC Lateral Transfer</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
                    Surplus registered in District Health MIS. Eligible sub-centre indents will route here first.
                  </div>
                )}
              </div>
            )}

            {/* Quick Action Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className="flex-1 py-2 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors shadow-2xs text-center cursor-pointer"
              >
                Log Dispense
              </button>
              <button
                type="button"
                onClick={() => handleOpenReorderModal(selectedMed)}
                className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs text-center cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Create Indent</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Full Reorder Requisition Modal */}
      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        defaultMedicine={orderModalData.medicineName}
        defaultQuantity={orderModalData.quantity}
        defaultPriority={orderModalData.priority}
        defaultJustification={orderModalData.justification}
      />
    </div>
  );
};
