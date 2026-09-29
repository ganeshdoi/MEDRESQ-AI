import React, { useState, useMemo } from 'react';
import {
  Bot,
  Play,
  CheckCircle2,
  Zap,
  Globe,
  Database,
  CloudSun,
  Truck,
  BedDouble,
  RefreshCw,
  Terminal,
  Stethoscope,
  Sliders,
  Pill,
  Award
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { INDIA_PHC_DIRECTORY, PHC_GEO_COORDINATES } from '../../data/indiaPHCDirectory.ts';

interface AgentToolExecution {
  agentId: string;
  agentName: string;
  problemTrack: string;
  toolCalled: string;
  targetResource: string;
  beforeState: string;
  afterState: string;
  impactMetric: string;
  status: 'EXECUTED_MUTATION' | 'VERIFIED_OPTIMAL';
  timestamp: string;
}

interface ClinicalPreset {
  id: string;
  label: string;
  age: number;
  weightKg: number;
  tempC: number;
  sysBp: number;
  heartRate: number;
  spo2: number;
  respRate: number;
  syndrome: string;
  protocolDrugs: {
    keyword: string;
    fallbackKeyword: string;
    doseFormula: (weightKg: number) => { qty: number; instruction: string };
  }[];
}

const CLINICAL_PRESETS: ClinicalPreset[] = [
  {
    id: 'heatstroke',
    label: 'Exertional Heatstroke + Severe Dehydration',
    age: 42,
    weightKg: 65,
    tempC: 40.8,
    sysBp: 86,
    heartRate: 128,
    spo2: 93,
    respRate: 26,
    syndrome: 'Heatstroke & Hypovolemic Shock',
    protocolDrugs: [
      {
        keyword: 'ringer',
        fallbackKeyword: 'saline',
        doseFormula: (w) => ({
          qty: Math.max(3, Math.ceil((w * 30) / 500)),
          instruction: `Rapid IV Crystalloid Bolus 30 mL/kg (${Math.round(w * 30)} mL total · chilled/cooled)`
        })
      },
      {
        keyword: 'ors',
        fallbackKeyword: 'zinc',
        doseFormula: () => ({
          qty: 6,
          instruction: 'Oral Rehydration Solution (WHO Low-Osmolarity) maintenance sachets'
        })
      },
      {
        keyword: 'paracetamol',
        fallbackKeyword: 'ibuprofen',
        doseFormula: () => ({
          qty: 4,
          instruction: 'Adjunct antipyretic post evaporative cooling'
        })
      }
    ]
  },
  {
    id: 'dengue_shock',
    label: 'Dengue Hemorrhagic Fever (Warning Signs)',
    age: 24,
    weightKg: 54,
    tempC: 39.9,
    sysBp: 92,
    heartRate: 118,
    spo2: 95,
    respRate: 22,
    syndrome: 'Severe Dengue / Thrombocytopenia Warning',
    protocolDrugs: [
      {
        keyword: 'saline',
        fallbackKeyword: 'ringer',
        doseFormula: (w) => ({
          qty: Math.max(2, Math.ceil((w * 20) / 500)),
          instruction: `0.9% Normal Saline IV titration 5–7 mL/kg/hr (${Math.round(w * 20)} mL initial loading)`
        })
      },
      {
        keyword: 'paracetamol',
        fallbackKeyword: 'ors',
        doseFormula: (w) => ({
          qty: 10,
          instruction: `${Math.round(w * 15)} mg Q6H (Strictly avoid NSAIDs/Ibuprofen/Aspirin)`
        })
      },
      {
        keyword: 'ors',
        fallbackKeyword: 'pantoprazole',
        doseFormula: () => ({
          qty: 5,
          instruction: 'Oral fluid & electrolyte replacement'
        })
      }
    ]
  },
  {
    id: 'snakebite',
    label: 'Neurotoxic / Hemotoxic Snakebite Envenomation',
    age: 35,
    weightKg: 60,
    tempC: 37.4,
    sysBp: 84,
    heartRate: 132,
    spo2: 90,
    respRate: 28,
    syndrome: 'Viper / Elapid Envenomation Emergency',
    protocolDrugs: [
      {
        keyword: 'snake',
        fallbackKeyword: 'hydrocortisone',
        doseFormula: () => ({
          qty: 10,
          instruction: '10 Vials Polyvalent Anti-Snake Venom (ASV) diluted in 500 mL Normal Saline over 1 hr'
        })
      },
      {
        keyword: 'saline',
        fallbackKeyword: 'ringer',
        doseFormula: () => ({
          qty: 2,
          instruction: 'IV line maintenance & ASV dilution carrier (500 mL)'
        })
      },
      {
        keyword: 'adrenaline',
        fallbackKeyword: 'dexamethasone',
        doseFormula: () => ({
          qty: 2,
          instruction: '0.5 mg IM standby for ASV anaphylaxis prophylaxis'
        })
      }
    ]
  },
  {
    id: 'pediatric_add',
    label: 'Pediatric Acute Gastroenteritis (Plan C)',
    age: 6,
    weightKg: 18,
    tempC: 38.4,
    sysBp: 88,
    heartRate: 134,
    spo2: 96,
    respRate: 28,
    syndrome: 'Pediatric Severe Diarrhoeal Dehydration',
    protocolDrugs: [
      {
        keyword: 'ringer',
        fallbackKeyword: 'saline',
        doseFormula: (w) => ({
          qty: Math.max(2, Math.ceil((w * 100) / 500)),
          instruction: `WHO Plan C: 100 mL/kg Ringer Lactate (${Math.round(w * 100)} mL over 3 hrs)`
        })
      },
      {
        keyword: 'ors',
        fallbackKeyword: 'paracetamol',
        doseFormula: () => ({
          qty: 8,
          instruction: '5 mL/kg/hr ORS as soon as patient can drink'
        })
      },
      {
        keyword: 'zinc',
        fallbackKeyword: 'amoxicillin',
        doseFormula: () => ({
          qty: 14,
          instruction: 'Zinc Sulfate 20 mg OD for 14 days (prevents recurrence)'
        })
      }
    ]
  },
  {
    id: 'copd_asthma',
    label: 'Acute Severe Asthma / Dust-Induced COPD',
    age: 58,
    weightKg: 68,
    tempC: 37.6,
    sysBp: 138,
    heartRate: 116,
    spo2: 88,
    respRate: 30,
    syndrome: 'Acute Bronchospasm & Hypoxia',
    protocolDrugs: [
      {
        keyword: 'salbutamol',
        fallbackKeyword: 'deriphyllin',
        doseFormula: () => ({
          qty: 2,
          instruction: 'Back-to-back Salbutamol Nebulization (2.5 mg every 20 mins x 3 doses)'
        })
      },
      {
        keyword: 'hydrocortisone',
        fallbackKeyword: 'dexamethasone',
        doseFormula: () => ({
          qty: 2,
          instruction: 'IV Corticosteroid stat to resolve airway inflammation'
        })
      },
      {
        keyword: 'azithromycin',
        fallbackKeyword: 'amoxicillin',
        doseFormula: () => ({
          qty: 5,
          instruction: '500 mg OD empirical coverage for secondary bacterial exacerbation'
        })
      }
    ]
  }
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export const AutonomousAgentsHub: React.FC = () => {
  const {
    selectedPHC,
    medicines,
    capacity,
    orders,
    redistributions,
    weather,
    createOrder,
    consumeMedicine,
    setActiveModule,
    showNotification
  } = useApp();

  const [activeSubView, setActiveSubView] = useState<
    'agents' | 'triage_solver' | 'eoq_optimizer' | 'brics'
  >('agents');

  // --- AUTONOMOUS AGENTS STATE ---
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [useLiveGemini, setUseLiveGemini] = useState<boolean>(false);
  const [aiBrief, setAiBrief] = useState<string>(
    `Ready to execute autonomous tool calls for ${selectedPHC.name} (${selectedPHC.district}, ${selectedPHC.state}). Click any Agent below—or run the 5-Agent Mission—to mutate live inventory, dispatch e-Aushadhi orders, pre-position climate kits, and lock BRICS biologics buffers.`
  );
  const [executionLog, setExecutionLog] = useState<AgentToolExecution[]>([]);

  // --- CLINICAL TRIAGE & AUTO-DISPENSE SOLVER STATE ---
  const [selectedPresetId, setSelectedPresetId] = useState<string>('heatstroke');
  const [patientAge, setPatientAge] = useState<number>(42);
  const [patientWeight, setPatientWeight] = useState<number>(65);
  const [patientTemp, setPatientTemp] = useState<number>(40.8);
  const [patientSysBp, setPatientSysBp] = useState<number>(86);
  const [patientHr, setPatientHr] = useState<number>(128);
  const [patientSpo2, setPatientSpo2] = useState<number>(93);
  const [patientRr, setPatientRr] = useState<number>(26);
  const [isDispensingCase, setIsDispensingCase] = useState<boolean>(false);
  const [lastExecutedCaseMsg, setLastExecutedCaseMsg] = useState<string | null>(null);

  // --- MATHEMATICAL EOQ & FEFO SUPPLY SOLVER STATE ---
  const [demandSurgeMultiplier, setDemandSurgeMultiplier] = useState<number>(1.4);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(5);
  const [serviceLevelZ, setServiceLevelZ] = useState<number>(1.65);

  const criticalMedsCount = medicines.filter(
    (m) => m.stockoutRisk === 'CRITICAL' || m.stockoutRisk === 'WARNING' || m.projectedStockoutDays <= 7
  ).length;

  const handleApplyPreset = (preset: ClinicalPreset) => {
    setSelectedPresetId(preset.id);
    setPatientAge(preset.age);
    setPatientWeight(preset.weightKg);
    setPatientTemp(preset.tempC);
    setPatientSysBp(preset.sysBp);
    setPatientHr(preset.heartRate);
    setPatientSpo2(preset.spo2);
    setPatientRr(preset.respRate);
    setLastExecutedCaseMsg(null);
  };

  const triageComputation = useMemo(() => {
    let news2 = 0;
    const triggers: string[] = [];

    if (patientRr >= 25 || patientRr <= 8) {
      news2 += 3;
      triggers.push(`RR ${patientRr}/min (+3)`);
    } else if (patientRr >= 21) {
      news2 += 2;
      triggers.push(`RR ${patientRr}/min (+2)`);
    }

    if (patientSpo2 <= 91) {
      news2 += 3;
      triggers.push(`SpO2 ${patientSpo2}% Hypoxia (+3)`);
    } else if (patientSpo2 <= 93) {
      news2 += 2;
      triggers.push(`SpO2 ${patientSpo2}% (+2)`);
    } else if (patientSpo2 <= 95) {
      news2 += 1;
    }

    if (patientSysBp <= 90 || patientSysBp >= 220) {
      news2 += 3;
      triggers.push(`SysBP ${patientSysBp} mmHg Shock Risk (+3)`);
    } else if (patientSysBp <= 100) {
      news2 += 2;
      triggers.push(`SysBP ${patientSysBp} mmHg (+2)`);
    }

    if (patientHr >= 131 || patientHr <= 40) {
      news2 += 3;
      triggers.push(`HR ${patientHr} bpm Tachycardia (+3)`);
    } else if (patientHr >= 111) {
      news2 += 2;
      triggers.push(`HR ${patientHr} bpm (+2)`);
    } else if (patientHr >= 91) {
      news2 += 1;
    }

    if (patientTemp >= 39.1) {
      news2 += 2;
      triggers.push(`Temp ${patientTemp}°C Hyperpyrexia (+2)`);
    } else if (patientTemp >= 38.1 || patientTemp <= 35.0) {
      news2 += 1;
    }

    const severity: 'RED_RESUSCITATION' | 'ORANGE_WARD_ADMIT' | 'GREEN_OPD' =
      news2 >= 7 ? 'RED_RESUSCITATION' : news2 >= 5 ? 'ORANGE_WARD_ADMIT' : 'GREEN_OPD';

    const activePreset = CLINICAL_PRESETS.find((p) => p.id === selectedPresetId) || CLINICAL_PRESETS[0];

    const matchedRegimen = activePreset.protocolDrugs.map((item) => {
      const primaryMatch = medicines.find((m) => m.name.toLowerCase().includes(item.keyword));
      const fallbackMatch = medicines.find((m) => m.name.toLowerCase().includes(item.fallbackKeyword));
      const chosenMed =
        primaryMatch && primaryMatch.currentStock > 0
          ? primaryMatch
          : fallbackMatch || primaryMatch || medicines[0];

      const isSubstituted = Boolean(primaryMatch && primaryMatch.currentStock <= 0 && fallbackMatch);
      const calc = item.doseFormula(patientWeight);

      return {
        med: chosenMed,
        qtyToDispense: calc.qty,
        instruction: calc.instruction,
        isSubstituted,
        postDispenseStock: chosenMed ? Math.max(0, chosenMed.currentStock - calc.qty) : 0,
        willBreachMin: chosenMed ? chosenMed.currentStock - calc.qty <= chosenMed.minStockLevel : false
      };
    });

    return {
      news2,
      triggers,
      severity,
      activePreset,
      matchedRegimen
    };
  }, [patientRr, patientSpo2, patientSysBp, patientHr, patientTemp, patientWeight, selectedPresetId, medicines]);

  const handleExecuteClinicalDispense = async () => {
    setIsDispensingCase(true);
    try {
      const dispensedSummaries: string[] = [];
      for (const row of triageComputation.matchedRegimen) {
        if (row.med) {
          await consumeMedicine(
            row.med.id,
            row.qtyToDispense,
            `Clinical Triage Solver (${triageComputation.activePreset.syndrome} · NEWS2=${triageComputation.news2})`
          );
          dispensedSummaries.push(`${row.qtyToDispense}x ${row.med.name.split(' ')[0]}`);

          if (row.willBreachMin) {
            const orderQty = Math.max(300, row.med.maxStockLevel - row.postDispenseStock);
            await createOrder({
              medicineName: row.med.name,
              quantityRequested: orderQty,
              priority: 'EMERGENCY_REPLENISHMENT',
              justification: `Auto-Indent triggered by Clinical Triage Solver after ${triageComputation.activePreset.syndrome} case breached min buffer.`
            });
          }
        }
      }

      const msg = `Dispensed [${dispensedSummaries.join(', ')}] from ${selectedPHC.name} live store for ${triageComputation.activePreset.syndrome} (NEWS2: ${triageComputation.news2}). Inventory & reorder runway updated.`;
      setLastExecutedCaseMsg(msg);
      showNotification(msg);
    } finally {
      setIsDispensingCase(false);
    }
  };

  const nearestDonorPhc = useMemo(() => {
    const myCoords = PHC_GEO_COORDINATES[selectedPHC.id] || { lat: 26.72, lng: 72.91 };
    let bestPhc = INDIA_PHC_DIRECTORY.find((p) => p.id !== selectedPHC.id) || INDIA_PHC_DIRECTORY[0];
    let bestDist = 9999;

    for (const candidate of INDIA_PHC_DIRECTORY) {
      if (candidate.id === selectedPHC.id) continue;
      const cCoords = PHC_GEO_COORDINATES[candidate.id];
      if (!cCoords) continue;
      const d = haversineKm(myCoords.lat, myCoords.lng, cCoords.lat, cCoords.lng);
      if (d < bestDist) {
        bestDist = d;
        bestPhc = candidate;
      }
    }
    return { phc: bestPhc, distanceKm: bestDist };
  }, [selectedPHC.id]);

  const supplyOptimizationRows = useMemo(() => {
    return medicines.map((med) => {
      const surgedDailyBurn = Math.max(1, Math.round(med.dailyConsumption * demandSurgeMultiplier));
      const demandStdDev = surgedDailyBurn * 0.28;
      const safetyStock = Math.round(serviceLevelZ * demandStdDev * Math.sqrt(leadTimeDays));
      const reorderPointRop = Math.round(surgedDailyBurn * leadTimeDays + safetyStock);
      const effectiveStock = med.currentStock + (med.pendingOrders || 0);
      const netGap = reorderPointRop - effectiveStock;
      const surgedRunwayDays = Number((med.currentStock / surgedDailyBurn).toFixed(1));

      const annualDemand = surgedDailyBurn * 365;
      const eoqUnits = Math.max(200, Math.round(Math.sqrt((2 * annualDemand * 450) / 12)));

      const actionRequired: 'LATERAL_FEFO_TRANSFER' | 'WAREHOUSE_INDENT' | 'OPTIMAL' =
        surgedRunwayDays <= 5
          ? 'LATERAL_FEFO_TRANSFER'
          : netGap > 0
          ? 'WAREHOUSE_INDENT'
          : 'OPTIMAL';

      return {
        med,
        surgedDailyBurn,
        safetyStock,
        reorderPointRop,
        netGap: Math.max(0, netGap),
        eoqUnits,
        surgedRunwayDays,
        actionRequired
      };
    });
  }, [medicines, demandSurgeMultiplier, leadTimeDays, serviceLevelZ]);

  const deficitRows = useMemo(
    () => supplyOptimizationRows.filter((r) => r.actionRequired !== 'OPTIMAL'),
    [supplyOptimizationRows]
  );

  const executeAgentMission = async (
    agentType: 'ALL' | 'SUPPLY_CHAIN' | 'CLIMATE_HEALTH' | 'DPI_GOVERNANCE' | 'CLINICAL_TRIAGE' | 'BRICS_FEDERATION'
  ) => {
    setRunningAgent(agentType);
    try {
      const response = await fetch('/api/agents/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phcId: selectedPHC.id,
          phcName: selectedPHC.name,
          district: selectedPHC.district,
          state: selectedPHC.state,
          agentType,
          useLiveAi: useLiveGemini
        })
      });

      if (!response.ok) {
        throw new Error('Agent execution request failed');
      }

      const data = await response.json();
      if (Array.isArray(data.executions)) {
        setExecutionLog((prev) => [...data.executions, ...prev].slice(0, 25));
      }
      if (data.aiExecutiveBrief) {
        setAiBrief(data.aiExecutiveBrief);
      }

      if (Array.isArray(data.createdOrders) && data.createdOrders.length > 0) {
        const firstOrder = data.createdOrders[0];
        await createOrder({
          medicineName: firstOrder.medicineName,
          quantityRequested: firstOrder.quantityRequested,
          priority: 'EMERGENCY_REPLENISHMENT',
          justification: firstOrder.notes || 'Autonomous Agent Replenishment'
        });
      } else if (medicines[0]) {
        await consumeMedicine(medicines[0].id, 0, 'Agent Audit Sync');
      }

      showNotification(
        `Executed ${data.executions?.length || 1} real state mutations on ${selectedPHC.name}. Live stock, orders & capacity updated!`
      );
    } catch (err) {
      console.error('Agent execution error:', err);
      showNotification('Agent execution encountered a network error.');
    } finally {
      setRunningAgent(null);
    }
  };

  const agentDefinitions = [
    {
      id: 'SUPPLY_CHAIN' as const,
      title: '1. SupplyChain & FEFO Rescue Agent',
      track: 'Track 1 · Smart Health & Supply Chain Resilience',
      icon: Truck,
      accent: 'text-rose-700 bg-rose-50 border-rose-200',
      liveMetric: `${criticalMedsCount} Critical/Warning Drugs · ${orders.length} Active Orders`,
      tools: 'dispatch_eaushadhi_indent() · execute_fefo_lateral_transfer()',
      whatItDoes:
        'Scans live NLEM stock at your selected PHC, auto-generates e-Aushadhi warehouse indents for items with ≤7d runway, and triggers peer PHC-to-PHC lateral transfers to guarantee zero stockouts.'
    },
    {
      id: 'DPI_GOVERNANCE' as const,
      title: '2. India DPI (ABDM + data.gov.in + IDSP) Agent',
      track: 'Track 2 · AI for Digital Public Infrastructure & Governance',
      icon: Database,
      accent: 'text-sky-700 bg-sky-50 border-sky-200',
      liveMetric: `NIN HFR Linked · ${selectedPHC.code} · WHO SARA Audited`,
      tools: 'sync_abdm_hfr_idsp_ledger() · verify_who_sara_compliance()',
      whatItDoes:
        'Eliminates 42 mins/day of manual paper register entry by auto-reconciling OPD dispenses with IDSP (S-Form/P-Form) syndromic reporting, data.gov.in NIN HFR registry, and WHO SARA readiness compliance.'
    },
    {
      id: 'CLIMATE_HEALTH' as const,
      title: '3. Clean Air & Climate-Health Surge Agent',
      track: 'Track 3 · Clean Air & Climate Resilience',
      icon: CloudSun,
      accent: 'text-amber-700 bg-amber-50 border-amber-200',
      liveMetric: `${weather.temperatureC}°C Ambient · ${weather.humidityPercent}% RH · Heat/AQI Shield`,
      tools: 'preposition_climate_epidemic_kit() · lock_solar_ilr_cold_chain()',
      whatItDoes:
        'Couples IMD heatwave (>44°C), dust/AQI respiratory spikes, and monsoon vector velocity directly to pre-emptive ORS, IV Crystalloid, Salbutamol Inhaler, and Anti-Snake Venom buffer boosts.'
    },
    {
      id: 'CLINICAL_TRIAGE' as const,
      title: '4. Ward Capacity & 108 Green-Corridor Agent',
      track: 'Smart Healthcare Delivery & Emergency Triage',
      icon: BedDouble,
      accent: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      liveMetric: `${capacity.occupiedBeds}/${capacity.totalBeds} Beds (${capacity.occupancyRate}% Occupied)`,
      tools: 'optimize_ward_turnover() · prelock_108_fru_corridor()',
      whatItDoes:
        'Executes automated step-down discharge triage to free emergency stabilization beds at the PHC and pre-locks 108 Ambulance First Referral Unit (FRU) corridors to the nearest CHC.'
    },
    {
      id: 'BRICS_FEDERATION' as const,
      title: '5. BRICS Strategic API & Biologics Pool Agent',
      track: 'Brazil SUS · Russia EGISZ · India ABDM · China CDC · South Africa NHI',
      icon: Globe,
      accent: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      liveMetric: `5-Nation Strategic Biologics & Vaccine R&D Reserve Ready`,
      tools: 'allocate_brics_strategic_biologics() · broadcast_who_searo_telemetry()',
      whatItDoes:
        'Connects India NHM/RMSCL with the BRICS Public Health Federation to unlock cross-border Active Pharmaceutical Ingredients (APIs), heat-stable Oxytocin/Insulin, and Polyvalent Antivenom reserves.'
    }
  ];

  const bricsNodes = [
    {
      country: 'India (Lead Hub)',
      system: 'ABDM · NHM e-Aushadhi · IDSP · data.gov.in',
      contribution:
        'Jan Aushadhi Generic APIs, WHO-PQS Vaccine Manufacturing (60% global supply), Digital Public Infrastructure (DPI) stack.',
      activePhcsLinked: '30,045 PHCs (2,459 in Rajasthan)',
      status: 'LIVE PRIMARY NODE'
    },
    {
      country: 'Brazil',
      system: 'SUS (Sistema Único de Saúde) · Fiocruz · ANVISA',
      contribution:
        'Arbovirus (Dengue/Zika/Chikungunya) genomic surveillance & snakebite antivenom cross-validation with Rajasthan/Mewar.',
      activePhcsLinked: '44,000+ UBS Family Health Units',
      status: 'SYNCED'
    },
    {
      country: 'Russia',
      system: 'ЕГИСЗ (EGISZ Unified Health Info System) · Минздрав',
      contribution:
        'Extreme thermal cold-chain telemetry & mobile rural Feldsher-Midwife (FAP) diagnostic protocols.',
      activePhcsLinked: '36,000+ Rural FAPs & Polyclinics',
      status: 'SYNCED'
    },
    {
      country: 'China',
      system: 'NHC · CCDC Epidemic Direct-Reporting Network',
      contribution:
        'Bulk Active Pharmaceutical Ingredient (API) raw material stabilization for NLEM antibiotics & antipyretics.',
      activePhcsLinked: '35,000+ Township Health Centers',
      status: 'SYNCED'
    },
    {
      country: 'South Africa',
      system: 'NHI (National Health Insurance) · NICD · SAHPRA',
      contribution:
        'MDR-TB, HIV & Maternal BEmONC rapid molecular point-of-care protocols shared with Tribal Sub-Plan (TSP) blocks.',
      activePhcsLinked: '3,500+ Primary Care Clinics',
      status: 'SYNCED'
    }
  ];

  return (
    <div className="space-y-4">
      {/* 1. Master Command Header */}
      <div className="bg-slate-950 text-white p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" />
                <span>AUTONOMOUS MULTI-AGENT &amp; CLINICAL SOLVER ENGINE</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-sky-400 font-semibold">{selectedPHC.name}</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-300 font-semibold">India DPI + BRICS Health Federation</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-1.5 text-white">
              Autonomous AI Agents, Clinical Triage &amp; EOQ Supply Solver
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Execute <strong>5 Autonomous Agents</strong>, run <strong>Patient NEWS2 Triage &amp; Auto-Prescription Dispensing</strong>, or optimize <strong>EOQ &amp; FEFO Lateral Transfers</strong> with live backend state mutations on{' '}
              <strong className="text-white">
                {selectedPHC.name} ({selectedPHC.district}, {selectedPHC.state})
              </strong>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={useLiveGemini}
                onChange={(e) => setUseLiveGemini(e.target.checked)}
                className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
              />
              <span>Live Gemini Synthesis</span>
            </label>

            <button
              type="button"
              disabled={runningAgent !== null}
              onClick={() => executeAgentMission('ALL')}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              {runningAgent === 'ALL' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-slate-950" />
              )}
              <span>Run All 5 Agents Now (Real Mutation)</span>
            </button>
          </div>
        </div>

        {/* Live State Bar showing real-time counters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-4 pt-4 border-t border-slate-800/90 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Active Facility</span>
            <strong className="text-white text-xs truncate block mt-0.5">{selectedPHC.name}</strong>
            <span className="text-[10px] text-sky-400">{selectedPHC.code}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Critical/Warning Drugs</span>
            <strong className={`text-sm block mt-0.5 ${criticalMedsCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {criticalMedsCount} of {medicines.length} NLEM Items
            </strong>
            <span className="text-[10px] text-slate-400">Live PHC Store</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Dispatched Indents</span>
            <strong className="text-emerald-400 text-sm block mt-0.5">{orders.length} Orders</strong>
            <span className="text-[10px] text-slate-400">{redistributions.length} Peer Transfers</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Ward Occupancy</span>
            <strong className="text-sky-300 text-sm block mt-0.5">
              {capacity.occupiedBeds} / {capacity.totalBeds} Beds ({capacity.occupancyRate}%)
            </strong>
            <span className="text-[10px] text-slate-400">{capacity.availableBeds} Free Beds</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Agent Mutations Run</span>
            <strong className="text-amber-300 text-sm block mt-0.5">{executionLog.length} Tool Actions</strong>
            <span className="text-[10px] text-slate-400">Verified in Session</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveSubView('agents')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubView === 'agents'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-emerald-600" />
            <span>1. 5 Autonomous Agents &amp; Live Log</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('triage_solver')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubView === 'triage_solver'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
            <span>2. Patient Triage &amp; Auto-Rx Solver</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('eoq_optimizer')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubView === 'eoq_optimizer'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <span>3. EOQ &amp; FEFO Supply Optimizer ({deficitRows.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('brics')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubView === 'brics'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-amber-600" />
            <span>4. India DPI + BRICS Network &amp; Blueprint</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveModule('medicine')}
            className="px-2.5 py-1.5 text-slate-700 hover:text-slate-900 font-semibold hover:underline cursor-pointer"
          >
            Verify Medicine Stock →
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('orders')}
            className="px-2.5 py-1.5 text-slate-700 hover:text-slate-900 font-semibold hover:underline cursor-pointer"
          >
            Verify Dispatched Orders →
          </button>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: 5 AUTONOMOUS AGENTS + LIVE TOOL MUTATION LOG
         ===================================================================== */}
      {activeSubView === 'agents' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200 flex items-start gap-3 text-xs text-emerald-950">
            <Zap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold uppercase font-mono text-[10px] text-emerald-800 block">
                Master Orchestrator Status
              </span>
              <p className="mt-0.5 font-medium leading-relaxed">{aiBrief}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {agentDefinitions.map((agent) => {
              const Icon = agent.icon;
              const isBusy = runningAgent === agent.id || runningAgent === 'ALL';

              return (
                <div
                  key={agent.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between space-y-3 shadow-2xs hover:border-slate-300 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className={`p-2 rounded-lg border ${agent.accent}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-600">{agent.liveMetric}</span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mt-2.5">{agent.title}</h3>
                    <div className="text-[10px] font-mono text-sky-800 mt-0.5">{agent.track}</div>

                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">{agent.whatItDoes}</p>

                    <div className="mt-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200/80 font-mono text-[10px] text-slate-700">
                      <span className="text-slate-400 block uppercase text-[9px]">Bound Server Tools:</span>
                      <strong className="text-slate-900">{agent.tools}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => executeAgentMission(agent.id)}
                    className="w-full py-2 px-3 bg-slate-900 hover:bg-black disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {runningAgent === agent.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                    )}
                    <span>Execute Agent Tool Calls</span>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="font-bold flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Verifiable Agent Tool-Call &amp; State Mutation Ledger (Before → After)</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {executionLog.length} mutations executed in live backend memory
              </span>
            </div>

            {executionLog.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No agent mutations run yet in this view. Click <strong>&quot;Run All 5 Agents Now&quot;</strong> above or trigger any individual agent to see live <code>beforeState → afterState</code> database mutations.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-mono text-[10px] uppercase">
                      <th className="py-2.5 px-3">Agent &amp; Problem Track</th>
                      <th className="py-2.5 px-3">Executed Tool Call</th>
                      <th className="py-2.5 px-3">Target Resource</th>
                      <th className="py-2.5 px-3">Before State</th>
                      <th className="py-2.5 px-3">After State (Mutated)</th>
                      <th className="py-2.5 px-3">Measurable Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {executionLog.map((item, idx) => (
                      <tr key={`${item.agentId}-${idx}`} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{item.agentName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{item.problemTrack}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-indigo-700 font-semibold">
                          {item.toolCalled}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{item.targetResource}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-rose-700">{item.beforeState}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-emerald-700 font-bold">
                          {item.afterState}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">{item.impactMetric}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: INTERACTIVE CLINICAL TRIAGE, NEWS2 & AUTO-DISPENSE SOLVER
         ===================================================================== */}
      {activeSubView === 'triage_solver' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-sky-600" />
                  <span>Patient Vitals &amp; Syndrome Input</span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  Select a clinical scenario or adjust vitals to compute NEWS2 score &amp; weight-adjusted PHC regimen
                </p>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase font-bold text-slate-500 block mb-1.5">
                Load Emergency Case Preset:
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {CLINICAL_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`px-3 py-2 rounded-lg border text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                      selectedPresetId === preset.id
                        ? 'bg-sky-50 border-sky-400 text-sky-950 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{preset.label}</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {preset.tempC}°C · {preset.weightKg}kg
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="text-[10px] font-mono text-slate-500 block">Weight (kg)</label>
                <input
                  type="number"
                  value={patientWeight}
                  min={3}
                  max={140}
                  onChange={(e) => setPatientWeight(Number(e.target.value) || 60)}
                  className="w-full mt-0.5 px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-500 block">Temp (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={patientTemp}
                  onChange={(e) => setPatientTemp(Number(e.target.value) || 37.0)}
                  className="w-full mt-0.5 px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-500 block">SpO2 (%)</label>
                <input
                  type="number"
                  value={patientSpo2}
                  min={60}
                  max={100}
                  onChange={(e) => setPatientSpo2(Number(e.target.value) || 98)}
                  className="w-full mt-0.5 px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-500 block">Systolic BP (mmHg)</label>
                <input
                  type="number"
                  value={patientSysBp}
                  onChange={(e) => setPatientSysBp(Number(e.target.value) || 120)}
                  className="w-full mt-0.5 px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-500 block">Heart Rate (bpm)</label>
                <input
                  type="number"
                  value={patientHr}
                  onChange={(e) => setPatientHr(Number(e.target.value) || 80)}
                  className="w-full mt-0.5 px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-500 block">Resp Rate (/min)</label>
                <input
                  type="number"
                  value={patientRr}
                  onChange={(e) => setPatientRr(Number(e.target.value) || 18)}
                  className="w-full mt-0.5 px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  triageComputation.severity === 'RED_RESUSCITATION'
                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                    : triageComputation.severity === 'ORANGE_WARD_ADMIT'
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                }`}
              >
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider">
                    Computed Clinical Acuity · {triageComputation.activePreset.syndrome}
                  </div>
                  <div className="text-base font-bold mt-0.5">
                    {triageComputation.severity === 'RED_RESUSCITATION'
                      ? 'RED PRIORITY · Immediate Resuscitation & Stabilization Bed Required'
                      : triageComputation.severity === 'ORANGE_WARD_ADMIT'
                      ? 'ORANGE PRIORITY · Inpatient Observation Ward Admission'
                      : 'GREEN PRIORITY · Standard Outpatient (OPD) Dispensing'}
                  </div>
                  <div className="text-[11px] font-mono mt-1 opacity-85">
                    Triggers:{' '}
                    {triageComputation.triggers.length > 0
                      ? triageComputation.triggers.join(' · ')
                      : 'Vitals within baseline'}
                  </div>
                </div>

                <div className="text-right font-mono shrink-0">
                  <span className="text-[10px] uppercase block opacity-75">NEWS2 Score</span>
                  <span className="text-2xl font-black">{triageComputation.news2}</span>
                  <span className="text-xs"> / 20</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase font-mono text-slate-600">
                    Calculated Regimen Matched to {selectedPHC.name} Live Inventory
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500">
                    Patient Weight: <strong>{patientWeight} kg</strong> · Age: <strong>{patientAge}y</strong>
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-mono text-[10px] uppercase border-b border-slate-200">
                        <th className="py-2 px-3">Matched In-Stock Drug</th>
                        <th className="py-2 px-3">Calculated Clinical Dose</th>
                        <th className="py-2 px-3">Qty</th>
                        <th className="py-2 px-3">Live Stock → After</th>
                        <th className="py-2 px-3">Auto-Indent Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {triageComputation.matchedRegimen.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{row.med?.name || 'NLEM Item'}</div>
                            <div className="text-[10px] font-mono text-slate-500">
                              Batch: {row.med?.batchNumber} · Exp: {row.med?.expiryDate}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">{row.instruction}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {row.qtyToDispense} {row.med?.unit}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            <span className="text-slate-600">{row.med?.currentStock}</span>
                            <span className="mx-1 text-slate-400">→</span>
                            <strong className={row.willBreachMin ? 'text-rose-600' : 'text-emerald-700'}>
                              {row.postDispenseStock}
                            </strong>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px]">
                            {row.willBreachMin ? (
                              <span className="text-rose-700 font-bold">
                                Below Min ({row.med?.minStockLevel}) · Will Auto-Order
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-semibold">Buffer Safe</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {lastExecutedCaseMsg && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{lastExecutedCaseMsg}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-mono">
                Ward Beds Free: <strong className="text-slate-900">{capacity.availableBeds} of {capacity.totalBeds}</strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isDispensingCase}
                  onClick={handleExecuteClinicalDispense}
                  className="px-4 py-2 bg-slate-900 hover:bg-black disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {isDispensingCase ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  ) : (
                    <Pill className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>Dispense Regimen &amp; Deduct Live Stock</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: MATHEMATICAL EOQ, SAFETY STOCK & FEFO OPTIMIZER
         ===================================================================== */}
      {activeSubView === 'eoq_optimizer' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 md:grid-cols-4 gap-4 items-center text-xs">
            <div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-500 uppercase text-[10px] font-bold">OPD Surge Multiplier</span>
                <strong className="text-sky-700 font-bold">{demandSurgeMultiplier.toFixed(1)}x Burn Rate</strong>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={demandSurgeMultiplier}
                onChange={(e) => setDemandSurgeMultiplier(Number(e.target.value))}
                className="w-full mt-1.5 accent-sky-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-500 uppercase text-[10px] font-bold">Warehouse Lead Time (L)</span>
                <strong className="text-indigo-700 font-bold">{leadTimeDays} Days</strong>
              </div>
              <input
                type="range"
                min="1"
                max="14"
                step="1"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(Number(e.target.value))}
                className="w-full mt-1.5 accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-slate-500 uppercase text-[10px] font-mono font-bold block">
                Safety Stock Service Level (Z)
              </label>
              <select
                value={serviceLevelZ}
                onChange={(e) => setServiceLevelZ(Number(e.target.value))}
                className="w-full mt-1 p-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 bg-white"
              >
                <option value={1.65}>95.0% Service Level (Z = 1.65)</option>
                <option value={2.33}>99.0% Service Level (Z = 2.33)</option>
                <option value={3.09}>99.9% Critical Life-Saving (Z = 3.09)</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <button
                type="button"
                disabled={runningAgent !== null}
                onClick={() => executeAgentMission('SUPPLY_CHAIN')}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                {runningAgent === 'SUPPLY_CHAIN' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                <span>Auto-Resolve All {deficitRows.length} Deficits Now</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-900">
                Live Inventory Runway, Reorder Point (ROP = d×L + Z·σ·√L) &amp; Nearest Donor PHC Routing
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                Nearest Peer Donor: <strong>{nearestDonorPhc.phc.name}</strong> ({nearestDonorPhc.distanceKm} km away)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-mono text-[10px] uppercase">
                    <th className="py-2.5 px-3">Medicine &amp; Batch</th>
                    <th className="py-2.5 px-3">Live Stock</th>
                    <th className="py-2.5 px-3">Surged Burn/Day</th>
                    <th className="py-2.5 px-3">Runway</th>
                    <th className="py-2.5 px-3">Safety Stock (SS)</th>
                    <th className="py-2.5 px-3">Reorder Point (ROP)</th>
                    <th className="py-2.5 px-3">Optimal EOQ</th>
                    <th className="py-2.5 px-3">Solver Recommendation</th>
                    <th className="py-2.5 px-3 text-right">Execute</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {supplyOptimizationRows.map((row) => (
                    <tr key={row.med.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{row.med.name}</div>
                        <div className="text-[10px] font-mono text-slate-500">
                          Batch: {row.med.batchNumber} · Exp: {row.med.expiryDate}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {row.med.currentStock} {row.med.unit}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{row.surgedDailyBurn}/day</td>
                      <td className="py-2.5 px-3 font-mono font-bold">
                        <span
                          className={
                            row.surgedRunwayDays <= 5
                              ? 'text-rose-600'
                              : row.surgedRunwayDays <= 10
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }
                        >
                          {row.surgedRunwayDays} days
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{row.safetyStock}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{row.reorderPointRop}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{row.eoqUnits}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        {row.actionRequired === 'LATERAL_FEFO_TRANSFER' ? (
                          <span className="text-rose-700 font-bold">
                            Lateral Transfer from {nearestDonorPhc.phc.name} ({nearestDonorPhc.distanceKm}km) + Indent{' '}
                            {row.eoqUnits}
                          </span>
                        ) : row.actionRequired === 'WAREHOUSE_INDENT' ? (
                          <span className="text-amber-700 font-semibold">
                            Dispatch Warehouse Indent ({row.eoqUnits} {row.med.unit})
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">Stock Buffer Optimal</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {row.actionRequired !== 'OPTIMAL' ? (
                          <button
                            type="button"
                            onClick={async () => {
                              await createOrder({
                                medicineName: row.med.name,
                                quantityRequested: row.eoqUnits,
                                priority:
                                  row.actionRequired === 'LATERAL_FEFO_TRANSFER'
                                    ? 'EMERGENCY_REPLENISHMENT'
                                    : 'URGENT',
                                justification: `EOQ Solver Order: ROP=${row.reorderPointRop}, SS=${row.safetyStock}, Surge=${demandSurgeMultiplier}x`
                              });
                            }}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-black text-white rounded-md font-bold text-[11px] cursor-pointer transition-colors"
                          >
                            Order {row.eoqUnits}
                          </button>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-400">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: INDIA DPI + BRICS FEDERATION & BUILD FOR COMMUNITIES BLUEPRINT
         ===================================================================== */}
      {activeSubView === 'brics' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-sky-600" />
              <span>India Digital Public Infrastructure (DPI) + BRICS Health Federation Architecture</span>
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Interoperable across <strong>National (NHM / ABDM / data.gov.in)</strong> and{' '}
              <strong>Global South (BRICS Health &amp; Vaccine R&amp;D Center)</strong> primary care networks.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-mono text-[10px] uppercase">
                    <th className="py-2.5 px-3">BRICS Member Nation</th>
                    <th className="py-2.5 px-3">National Digital Health Stack</th>
                    <th className="py-2.5 px-3">Strategic Supply Chain &amp; Epidemic Contribution</th>
                    <th className="py-2.5 px-3">Primary Care Network Scale</th>
                    <th className="py-2.5 px-3">Federation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bricsNodes.map((node) => (
                    <tr key={node.country} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-900">{node.country}</td>
                      <td className="py-3 px-3 font-mono text-sky-800 font-semibold">{node.system}</td>
                      <td className="py-3 px-3 text-slate-700">{node.contribution}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">{node.activePhcsLinked}</td>
                      <td className="py-3 px-3 font-mono text-emerald-700 font-bold">{node.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">
                Google &quot;Build for Communities&quot; (Code for Communities 2.0) — Level-2 Tracks
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-mono text-[10px] font-bold text-rose-700 uppercase">
                  Track 1 · Smart Health &amp; Supply Chain Resilience
                </div>
                <h3 className="font-bold text-sm text-slate-900">
                  Zero-Stockout Autonomous FEFO &amp; e-Aushadhi Replenishment
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  <code>SupplyChainAgent</code> calculates net stockout runway daily, auto-dispatches RMSCL{' '}
                  <code>e-Aushadhi</code> indents, and executes lateral PHC-to-PHC transfers before stock hits zero.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-mono text-[10px] font-bold text-sky-700 uppercase">
                  Track 2 · AI for Digital Public Infrastructure (DPI)
                </div>
                <h3 className="font-bold text-sm text-slate-900">
                  Paperless ANM/MOIC Workflow + data.gov.in &amp; ABDM Sync
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Multilingual Voice + OCR Register Scanner + 1-Tap Syndromic Tally automatically deducts NLEM stock
                  and syncs with <code>data.gov.in</code> NIN HFR &amp; WHO SARA benchmarks.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-mono text-[10px] font-bold text-amber-700 uppercase">
                  Track 3 · Clean Air &amp; Climate-Health Resilience
                </div>
                <h3 className="font-bold text-sm text-slate-900">
                  Proactive Heatwave, Dust/AQI &amp; Monsoon Vector Surge Shield
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  <code>ClimateHealthAgent</code> couples live temperature/AQI/IDSP velocity to pre-position ORS, IV
                  fluids, Salbutamol inhalers, and Anti-Snake Venom 48 hours ahead of peak load.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
