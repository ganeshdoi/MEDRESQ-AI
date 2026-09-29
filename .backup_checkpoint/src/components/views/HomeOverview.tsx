import React, { useState } from 'react';
import {
  AlertTriangle,
  Pill,
  BedDouble,
  Users,
  CloudSun,
  Truck,
  ArrowRight,
  ScanLine,
  Mic,
  ArrowRightLeft,
  MapPin,
  CheckCircle2,
  Plus,
  Minus,
  Download,
  PackageCheck,
  Stethoscope,
  ThermometerSnowflake,
  Ambulance,
  ClipboardCheck,
  Activity,
  Zap
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusBadge } from '../ui/StatusBadge.tsx';
import { ClinicalReferralModal } from './ClinicalReferralModal.tsx';
import { DoctorInnovationTwinHub } from './DoctorInnovationTwinHub.tsx';

interface ClinicalCaseKit {
  id: string;
  title: string;
  syndromeTag: 'heat' | 'diarrhoea' | 'snakebite' | 'maternal' | 'fever';
  stgGuideline: string;
  items: Array<{
    keyword: string;
    label: string;
    qty: number;
    unit: string;
  }>;
}

const CLINICAL_CASE_KITS: ClinicalCaseKit[] = [
  {
    id: 'kit-heat-plan-b',
    title: 'Acute Heat Exhaustion / Dehydration (Plan B/C)',
    syndromeTag: 'heat',
    stgGuideline: 'NHM Heatwave STG: Rapid IV crystalloid resuscitation + oral electrolyte replacement',
    items: [
      { keyword: 'ORS', label: 'ORS Sachets (20.5g)', qty: 4, unit: 'Sachets' },
      { keyword: 'Ringer Lactate', label: 'Ringer Lactate IV 500ml', qty: 2, unit: 'Bottles' },
      { keyword: 'Paracetamol', label: 'Paracetamol 500mg', qty: 10, unit: 'Tablets' }
    ]
  },
  {
    id: 'kit-pediatric-add',
    title: 'Pediatric Acute Diarrhoeal Disease (WHO ORS + Zinc)',
    syndromeTag: 'diarrhoea',
    stgGuideline: 'IAP / WHO Protocol: Low-osmolarity ORS + 14-day Zinc supplementation',
    items: [
      { keyword: 'ORS', label: 'ORS Sachets (20.5g)', qty: 2, unit: 'Sachets' },
      { keyword: 'Zinc', label: 'Zinc Sulfate Dispersible 20mg', qty: 14, unit: 'Tablets' }
    ]
  },
  {
    id: 'kit-snakebite-asv',
    title: 'Snakebite Envenomation Casualty Stabilization',
    syndromeTag: 'snakebite',
    stgGuideline: 'National Snakebite Protocol: 8–10 vials Polyvalent ASV in NS infusion over 1 hr',
    items: [
      { keyword: 'Anti-Snake', label: 'Polyvalent ASV 10ml', qty: 8, unit: 'Vials' },
      { keyword: 'Normal Saline', label: 'Normal Saline 0.9% 500ml', qty: 2, unit: 'Bottles' }
    ]
  },
  {
    id: 'kit-maternal-amtsl',
    title: 'Safe Delivery & AMTSL PPH Prevention (Labour Room)',
    syndromeTag: 'maternal',
    stgGuideline: 'LaQshya / AMTSL Protocol: Inj. Oxytocin 10 IU IM + IV crystalloid + antibiotic cover',
    items: [
      { keyword: 'Oxytocin', label: 'Oxytocin Inj. 10 IU/ml', qty: 2, unit: 'Ampoules' },
      { keyword: 'Ringer Lactate', label: 'Ringer Lactate IV 500ml', qty: 1, unit: 'Bottles' },
      { keyword: 'Amoxicillin', label: 'Amoxicillin 500mg', qty: 15, unit: 'Capsules' }
    ]
  },
  {
    id: 'kit-febrile-opd',
    title: 'Acute Febrile Illness / Respiratory Infection (OPD)',
    syndromeTag: 'fever',
    stgGuideline: 'IPHS Standard OPD Regimen: 5-day empirical antibiotic + antipyretic course',
    items: [
      { keyword: 'Paracetamol', label: 'Paracetamol 500mg', qty: 15, unit: 'Tablets' },
      { keyword: 'Amoxicillin', label: 'Amoxicillin 500mg', qty: 15, unit: 'Capsules' }
    ]
  }
];

export const HomeOverview: React.FC = () => {
  const {
    selectedPHC,
    medicines,
    capacity,
    workforce,
    weather,
    orders,
    alerts,
    setActiveModule,
    redistributions,
    consumeMedicine,
    createOrder,
    approveRedistribution,
    showNotification
  } = useApp();

  // Dispense Mode: 'kit' (STG Clinical Protocol Bundle) vs 'single' (Single Medicine)
  const [dispenseMode, setDispenseMode] = useState<'kit' | 'single'>('kit');
  const [selectedKitId, setSelectedKitId] = useState<string>(CLINICAL_CASE_KITS[0].id);

  // Interactive Quick Dispense state for single medicine
  const [quickMedId, setQuickMedId] = useState<string>(medicines[0]?.id || '');
  const [quickQty, setQuickQty] = useState<number>(10);
  const [quickReason, setQuickReason] = useState<string>('OPD Patient Dispensing');
  const [isQuickDispensing, setIsQuickDispensing] = useState<boolean>(false);
  const [isOrderingAll, setIsOrderingAll] = useState<boolean>(false);

  // Ground-Level Doctor Morning Readiness & IDSP Syndromic Tally State
  const [ilrTempVerified, setIlrTempVerified] = useState<boolean>(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState<boolean>(false);
  const [showAdvancedHub, setShowAdvancedHub] = useState<boolean>(false);
  const [syndromicTally, setSyndromicTally] = useState({
    heat: 18,
    diarrhoea: 29,
    fever: 64,
    snakebite: 2,
    maternal: 4
  });

  const selectedQuickMed = medicines.find((m) => m.id === quickMedId) || medicines[0];
  const selectedKit =
    CLINICAL_CASE_KITS.find((k) => k.id === selectedKitId) || CLINICAL_CASE_KITS[0];

  const criticalAlerts = alerts.filter((a) => a.status === 'ACTIVE' && a.category === 'CRITICAL');
  const criticalStockMeds = medicines.filter((m) => m.stockoutRisk === 'CRITICAL');
  const warningStockMeds = medicines.filter((m) => m.stockoutRisk === 'WARNING');
  const attentionMeds = [...criticalStockMeds, ...warningStockMeds];
  const incomingDeliveries = orders.filter(
    (o) => o.status === 'IN TRANSIT' || o.status === 'DISPATCHED'
  );

  // Increment IDSP Syndromic Case Counter
  const handleIncrementSyndrome = (key: keyof typeof syndromicTally, label: string) => {
    setSyndromicTally((prev) => ({ ...prev, [key]: prev[key] + 1 }));
    showNotification(
      `IDSP Syndromic Log Updated: +1 ${label} case recorded at ${selectedPHC.name}.`
    );
  };

  // 1-Click Clinical Case Kit Dispense Handler
  const handleDispenseCaseKit = async () => {
    setIsQuickDispensing(true);
    try {
      const dispensedSummary: string[] = [];
      for (const item of selectedKit.items) {
        const matchedMed = medicines.find((m) =>
          m.name.toLowerCase().includes(item.keyword.toLowerCase())
        );
        if (matchedMed && matchedMed.currentStock >= item.qty) {
          await consumeMedicine(
            matchedMed.id,
            item.qty,
            `STG Protocol: ${selectedKit.title}`
          );
          dispensedSummary.push(`${item.qty} ${item.unit} ${item.keyword}`);
        }
      }

      setSyndromicTally((prev) => ({
        ...prev,
        [selectedKit.syndromeTag]: prev[selectedKit.syndromeTag] + 1
      }));

      showNotification(
        `STG Case Kit Dispensed (${selectedKit.title}): ${dispensedSummary.join(', ')} & IDSP tally updated.`
      );
    } finally {
      setIsQuickDispensing(false);
    }
  };

  // 1-Click Quick Dispense Handler (Single Medicine)
  const handleQuickDispenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuickMed || quickQty <= 0) return;
    if (quickQty > selectedQuickMed.currentStock) {
      showNotification(
        `Cannot dispense ${quickQty}: only ${selectedQuickMed.currentStock} ${selectedQuickMed.unit} in stock.`
      );
      return;
    }
    setIsQuickDispensing(true);
    await consumeMedicine(selectedQuickMed.id, quickQty, quickReason);
    setIsQuickDispensing(false);
  };

  // 1-Click Instant Row Dispense (-10 units)
  const handleInstantDispense = async (
    medId: string,
    medName: string,
    unit: string,
    currentStock: number
  ) => {
    const qty = Math.min(10, currentStock);
    if (qty <= 0) {
      showNotification(`${medName} is out of stock. Please place an urgent order.`);
      return;
    }
    await consumeMedicine(medId, qty, 'Quick 1-Click OPD Dispense');
    showNotification(`Dispensed ${qty} ${unit} of ${medName}.`);
  };

  // 1-Click Instant Reorder for a Single Medicine
  const handleInstantOrder = async (
    medName: string,
    suggestedQty: number,
    isCritical: boolean
  ) => {
    await createOrder({
      medicineName: medName,
      quantityRequested: suggestedQty,
      priority: isCritical ? 'EMERGENCY_REPLENISHMENT' : 'URGENT',
      justification: `1-Click restock order from Daily Command Center to restore 30-day safety buffer.`
    });
  };

  // 1-Click Order All Low-Stock Medicines
  const handleRestockAllLowMedicines = async () => {
    if (attentionMeds.length === 0) {
      showNotification('All medicines currently have healthy stock buffers!');
      return;
    }
    setIsOrderingAll(true);
    for (const med of attentionMeds) {
      const neededQty = Math.max(200, med.minStockLevel * 2 - med.currentStock);
      await createOrder({
        medicineName: med.name,
        quantityRequested: neededQty,
        priority: med.stockoutRisk === 'CRITICAL' ? 'EMERGENCY_REPLENISHMENT' : 'URGENT',
        justification: `Batch restock for low-buffer medicine (${med.projectedStockoutDays} days remaining).`
      });
    }
    setIsOrderingAll(false);
    showNotification(
      `Created ${attentionMeds.length} restock orders with the District Warehouse!`
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Clear, Action-First Facility Welcome Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-emerald-700">{selectedPHC.type}</span>
              <span aria-hidden="true">·</span>
              <span>
                {selectedPHC.block} Block, {selectedPHC.district}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Officer In-Charge:{' '}
                <strong className="text-slate-800">
                  {selectedPHC.medicalOfficerInCharge}
                </strong>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {selectedPHC.name} — MOIC Clinical & Logistics Command Center
            </h1>

            <p className="text-xs text-slate-600 max-w-2xl">
              Dispense NHM standard clinical protocol kits, generate 108 emergency FRU referral slips, monitor cold-chain ILR readiness, and reorder low stock in one click.
            </p>
          </div>

          {/* Primary High-Impact Shortcuts */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveModule('directory')}
              className="px-3.5 py-2 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
            >
              <Pill className="w-3.5 h-3.5 text-sky-200" />
              <span>PHCs &amp; Medicines List</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('agents')}
              className="px-3.5 py-2 rounded-lg bg-slate-950 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer shadow-2xs border border-emerald-500/40"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>AI Agents &amp; Triage Solver</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('map')}
              className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-200" />
              <span>All-India PHC Map</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('preparedness')}
              className="px-3.5 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            >
              <CloudSun className="w-3.5 h-3.5 text-indigo-200" />
              <span>Outbreak Surge AI</span>
            </button>

            <button
              type="button"
              onClick={() => setIsReferralModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
            >
              <Ambulance className="w-3.5 h-3.5 text-rose-200" />
              <span>108 Referral Slip</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('analytics')}
              className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>PDF / CSV Report</span>
            </button>
          </div>
        </div>

        {/* Ground-Level Morning MOIC Readiness & IDSP Syndromic Surveillance Strip */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <ThermometerSnowflake className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span className="text-slate-700 font-medium">
                Cold Chain ILR:{' '}
                <strong className="font-mono text-emerald-700">+4.2°C</strong> (Oxytocin & ASV Safe)
              </span>
              <button
                type="button"
                onClick={() => {
                  setIlrTempVerified(true);
                  showNotification(
                    `Morning Cold Chain Log Verified (+4.2°C) by ${selectedPHC.medicalOfficerInCharge}`
                  );
                }}
                className={`ml-1 px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                  ilrTempVerified
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {ilrTempVerified ? '✓ Logged 08:00' : 'Verify Temp'}
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-slate-700 font-medium">
                Crash Cart & O2 Manifold:{' '}
                <strong className="font-mono text-slate-900">140 bar · 6/6 Cylinders Full</strong>
              </span>
            </div>
          </div>

          {/* Interactive IDSP Daily Syndromic Surveillance Quick-Tally */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>IDSP OPD Tally (+1):</span>
            </span>
            {[
              { key: 'fever', label: 'Acute Fever', count: syndromicTally.fever },
              { key: 'diarrhoea', label: 'ADD / Diarrhoea', count: syndromicTally.diarrhoea },
              { key: 'heat', label: 'Heat Stress', count: syndromicTally.heat },
              { key: 'snakebite', label: 'Snake/Bite', count: syndromicTally.snakebite }
            ].map((syn) => (
              <button
                key={syn.key}
                type="button"
                onClick={() =>
                  handleIncrementSyndrome(
                    syn.key as keyof typeof syndromicTally,
                    syn.label
                  )
                }
                className="px-2.5 py-1 rounded-md bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-800 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title={`Click to log +1 ${syn.label} case in today's IDSP surveillance register`}
              >
                <span>{syn.label}:</span>
                <strong className="font-mono text-emerald-700">{syn.count}</strong>
                <span className="text-[10px] font-mono text-slate-400">+1</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Critical Alert Banner (Only when urgent alerts exist) */}
      {criticalAlerts.length > 0 && (
        <div
          role="region"
          aria-label="Urgent Facility Alerts"
          className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="w-5 h-5 text-rose-600 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <div className="font-bold text-sm text-rose-950">
                Urgent Today: {criticalAlerts[0].title}
              </div>
              <p className="text-xs text-rose-900 mt-0.5">
                {criticalAlerts[0].description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveModule('alerts')}
            className="text-xs font-semibold text-rose-950 bg-white hover:bg-rose-100 px-3.5 py-2 rounded-lg border border-rose-300 flex items-center justify-center gap-1.5 shrink-0 transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>Resolve Alert ({criticalAlerts.length})</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* 3. Four Simple At-a-Glance Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Medicine Stock Health */}
        <button
          type="button"
          onClick={() => setActiveModule('medicine')}
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-emerald-500 transition-colors text-left cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Medicine Stock</span>
              <Pill className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {criticalStockMeds.length > 0
                  ? `${criticalStockMeds.length} Critical`
                  : warningStockMeds.length > 0
                  ? `${warningStockMeds.length} Low`
                  : 'All Healthy'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {medicines.length} essential medicines tracked
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
            <span>Open Medicine List</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Card 2: Patient Beds */}
        <button
          type="button"
          onClick={() => setActiveModule('capacity')}
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-sky-500 transition-colors text-left cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Patient Beds Available</span>
              <BedDouble className="w-4 h-4 text-sky-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {capacity.availableBeds} Free Beds
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {capacity.occupiedBeds} of {capacity.totalBeds} beds occupied ({capacity.occupancyRate}%)
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-sky-700">
            <span>Manage Ward Beds</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Card 3: Staff on Duty */}
        <button
          type="button"
          onClick={() => setActiveModule('workforce')}
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-400 transition-colors text-left cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Doctors & Nurses on Duty</span>
              <Users className="w-4 h-4 text-slate-700" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {workforce.staffPresentToday} / {workforce.totalStaffSanctioned} Present
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Workload today: <strong className="text-slate-700">{workforce.workloadIndex}</strong>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>View Staff Roster</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Card 4: Weather & Outbreak Alert */}
        <button
          type="button"
          onClick={() => setActiveModule('preparedness')}
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-amber-500 transition-colors text-left cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Local Weather Risk</span>
              <CloudSun className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-amber-700">
                {weather.temperatureC}°C
              </span>
              <span className="text-xs font-semibold text-amber-800 truncate">
                {weather.alertType}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">ORS & IV fluid demand up +65%</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-amber-800">
            <span>See Outbreak Checklist</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>

      {/* 4. Main Interactive Workspace: Left = Low Stock Action Table, Right = STG Clinical Protocol & Quick Dispense */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Medicines Needing Action Today (1-Click Order or Dispense) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 flex flex-col justify-between overflow-hidden">
          <div>
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Medicines Running Low ({attentionMeds.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order replacement stock or dispense directly with a single click
                </p>
              </div>

              {attentionMeds.length > 0 && (
                <button
                  type="button"
                  onClick={handleRestockAllLowMedicines}
                  disabled={isOrderingAll}
                  className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer shrink-0"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>
                    {isOrderingAll
                      ? 'Ordering...'
                      : `Order All ${attentionMeds.length} Low Items`}
                  </span>
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {(attentionMeds.length > 0 ? attentionMeds : medicines.slice(0, 4)).map(
                (med) => {
                  const isCrit = med.stockoutRisk === 'CRITICAL';
                  const suggestedOrderQty = Math.max(
                    200,
                    med.minStockLevel * 2 - med.currentStock
                  );
                  return (
                    <div
                      key={med.id}
                      className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge
                            status={med.stockoutRisk}
                            text={
                              isCrit
                                ? 'Critical Low'
                                : med.stockoutRisk === 'WARNING'
                                ? 'Low Stock'
                                : 'Healthy'
                            }
                          />
                          <span className="font-bold text-sm text-slate-900 truncate">
                            {med.name}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                          <span>
                            In Stock:{' '}
                            <strong className="text-slate-900">
                              {med.currentStock.toLocaleString()} {med.unit}
                            </strong>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Daily Use: {med.dailyConsumption}/day</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              isCrit
                                ? 'text-rose-700 font-bold'
                                : 'text-amber-700 font-semibold'
                            }
                          >
                            Lasts {med.projectedStockoutDays} days
                          </span>
                        </div>
                      </div>

                      {/* Direct 1-Click Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleInstantDispense(
                              med.id,
                              med.name,
                              med.unit,
                              med.currentStock
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
                          title="Dispense 10 units to OPD"
                        >
                          <Minus className="w-3 h-3" />
                          <span>Dispense 10</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleInstantOrder(med.name, suggestedOrderQty, isCrit)
                          }
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-emerald-400" />
                          <span>Order +{suggestedOrderQty}</span>
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600">
              Incoming deliveries in transit:{' '}
              <strong className="font-mono text-slate-900">
                {incomingDeliveries.length}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => setActiveModule('medicine')}
              className="font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Medicine Inventory ({medicines.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right 5 Columns: STG Clinical Protocol Kit Dispense + Single Item Dispense + Nearby PHC Transfer */}
        <div className="lg:col-span-5 space-y-6">
          {/* Ground-Level Clinical Dispensing Card (STG Case Kit vs Single Item) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-emerald-600" />
                  <span>Clinical OPD & Casualty Dispensing</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Dispense standard NHM clinical kits or individual medicines
                </p>
              </div>

              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setDispenseMode('kit')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    dispenseMode === 'kit'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  STG Case Kits
                </button>
                <button
                  type="button"
                  onClick={() => setDispenseMode('single')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    dispenseMode === 'single'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Single Drug
                </button>
              </div>
            </div>

            {dispenseMode === 'kit' ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label
                    htmlFor="stg-kit-select"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    1. Select Standard Treatment Guideline (STG) Case Presentation
                  </label>
                  <select
                    id="stg-kit-select"
                    value={selectedKit.id}
                    onChange={(e) => setSelectedKitId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {CLINICAL_CASE_KITS.map((kit) => (
                      <option key={kit.id} value={kit.id}>
                        {kit.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {selectedKit.stgGuideline}
                  </p>
                </div>

                {/* Kit Constituent Items Breakdown */}
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Auto-Deducted Regimen Bundle:
                  </div>
                  <div className="divide-y divide-slate-200/70">
                    {selectedKit.items.map((item, idx) => {
                      const matched = medicines.find((m) =>
                        m.name.toLowerCase().includes(item.keyword.toLowerCase())
                      );
                      const inStock = matched?.currentStock ?? 0;
                      const isEnough = inStock >= item.qty;
                      return (
                        <div
                          key={idx}
                          className="py-1.5 flex items-center justify-between gap-2 font-mono text-xs"
                        >
                          <span className="font-sans font-semibold text-slate-800">
                            {item.label}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-800">
                              -{item.qty} {item.unit}
                            </span>
                            <span
                              className={`text-[10px] ${
                                isEnough ? 'text-slate-500' : 'text-rose-700 font-bold'
                              }`}
                            >
                              ({inStock} avail)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDispenseCaseKit}
                  disabled={isQuickDispensing}
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isQuickDispensing
                      ? 'Dispensing STG Regimen...'
                      : 'Dispense Complete Protocol Kit & Log IDSP Case'}
                  </span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleQuickDispenseSubmit} className="space-y-3">
                <div>
                  <label
                    htmlFor="quick-med-select"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    1. Select Medicine
                  </label>
                  <select
                    id="quick-med-select"
                    value={selectedQuickMed?.id || ''}
                    onChange={(e) => setQuickMedId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {medicines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.currentStock} {m.unit} left)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="quick-qty-input"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      2. Quantity ({selectedQuickMed?.unit || 'Units'})
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        id="quick-qty-input"
                        type="number"
                        min={1}
                        max={selectedQuickMed?.currentStock || 9999}
                        value={quickQty}
                        onChange={(e) => setQuickQty(Math.max(1, Number(e.target.value)))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      {[10, 25, 50].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setQuickQty(preset)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border cursor-pointer ${
                            quickQty === preset
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          +{preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="quick-reason-select"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      3. Ward / Purpose
                    </label>
                    <select
                      id="quick-reason-select"
                      value={quickReason}
                      onChange={(e) => setQuickReason(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="OPD Patient Dispensing">OPD Patient</option>
                      <option value="Emergency Heatwave Stabilization">Emergency Ward</option>
                      <option value="Maternity / Labor Room">Maternity Room</option>
                      <option value="Sub-Centre Supply">Sub-Centre Supply</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isQuickDispensing}
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isQuickDispensing
                      ? 'Updating Stock...'
                      : `Dispense ${quickQty} ${selectedQuickMed?.unit || 'Units'} Now`}
                  </span>
                </button>
              </form>
            )}
          </div>

          {/* Nearby PHC Surplus Sharing Card */}
          {redistributions.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-900">
                    Fast Transfer from Nearby PHC
                  </h2>
                </div>
                <span className="text-xs font-mono text-emerald-700 font-semibold">
                  {redistributions[0].estimatedTransitTimeHours} hr drive
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>{redistributions[0].sourcePHCName}</strong> has surplus{' '}
                <strong>{redistributions[0].medicineName}</strong>. Request{' '}
                <strong className="font-mono">
                  {redistributions[0].transferQuantity} units
                </strong>{' '}
                instead of waiting 3 days for the central warehouse.
              </p>

              <div className="pt-1 flex items-center justify-between gap-2">
                {redistributions[0].status === 'APPROVED' ? (
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Transfer Approved & On the Way
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      approveRedistribution(redistributions[0].id);
                      showNotification(
                        `Approved fast transfer of ${redistributions[0].transferQuantity} units from ${redistributions[0].sourcePHCName}!`
                      );
                    }}
                    className="w-full py-2 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      Approve Instant Transfer ({redistributions[0].transferQuantity} Units)
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Expandable Clinical Survival, Split-Dose Emergency Bridge & data.gov.in / Vertex AI Hub */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
              Clinical &amp; Open Government Data Intelligence
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              Treatable Patients Index, Split-Dose Emergency Bridge &amp; data.gov.in Sync
            </h2>
            <p className="text-xs text-slate-600">
              See how many critical patients current stock can treat, lock receiving hospital beds before ambulance referral, or sync live data.gov.in benchmarks with Gemini &amp; Vertex AI.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdvancedHub((prev) => !prev)}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
          >
            <span>{showAdvancedHub ? 'Hide Clinical & data.gov.in Hub' : 'Open Clinical & data.gov.in Hub'}</span>
            <ArrowRight className={`w-3.5 h-3.5 transition-transform ${showAdvancedHub ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {showAdvancedHub && (
          <div className="pt-2 border-t border-slate-100">
            <DoctorInnovationTwinHub
              syndromicTally={syndromicTally}
              onOpenReferralModal={() => setIsReferralModalOpen(true)}
            />
          </div>
        )}
      </div>

      {/* 108 Clinical Referral & Stabilization Slip Modal */}
      <ClinicalReferralModal
        isOpen={isReferralModalOpen}
        onClose={() => setIsReferralModalOpen(false)}
      />
    </div>
  );
};
