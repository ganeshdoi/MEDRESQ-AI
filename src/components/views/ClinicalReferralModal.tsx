import React, { useState } from 'react';
import {
  Ambulance,
  FileText,
  HeartPulse,
  CheckCircle2,
  X,
  Building2,
  Clock,
  ShieldAlert,
  Stethoscope,
  Syringe
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useApp } from '../../context/AppContext.tsx';

export interface ClinicalReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPatientName?: string;
  initialCondition?: string;
  initialWard?: string;
}

interface ReferralProtocolPreset {
  id: string;
  label: string;
  severity: 'CRITICAL' | 'URGENT';
  defaultVitals: {
    bp: string;
    pulse: string;
    spo2: string;
    temp: string;
  };
  stabilizationNotes: string;
  stabilizationMedKeyword: string;
  stabilizationMedQty: number;
  recommendedFacility: string;
}

const REFERRAL_PRESETS: ReferralProtocolPreset[] = [
  {
    id: 'heatstroke',
    label: 'Severe Heatstroke / Hyperpyrexia (Core Temp > 40.5°C)',
    severity: 'CRITICAL',
    defaultVitals: { bp: '90/58 mmHg', pulse: '128 bpm', spo2: '93%', temp: '40.8°C' },
    stabilizationNotes:
      'Rapid evaporative cooling initiated; 2x IV Normal Saline 0.9% (500ml) cold bolus started; ice packs applied to axillae/groin; Foley catheter placed for urine output monitoring.',
    stabilizationMedKeyword: 'Normal Saline',
    stabilizationMedQty: 2,
    recommendedFacility: 'CHC Osian (First Referral Unit - 30 Beds)'
  },
  {
    id: 'snakebite',
    label: 'Grade III Neurotoxic / Hemotoxic Snakebite Envenomation',
    severity: 'CRITICAL',
    defaultVitals: { bp: '104/68 mmHg', pulse: '116 bpm', spo2: '91%', temp: '37.2°C' },
    stabilizationNotes:
      '20-Minute Whole Blood Clotting Test (20WBCT) positive; 8 vials Polyvalent Anti-Snake Venom (ASV) diluted in 250ml Normal Saline infused over 60 mins; airway stabilized for ventilator backup.',
    stabilizationMedKeyword: 'Anti-Snake',
    stabilizationMedQty: 8,
    recommendedFacility: 'MDM District Tertiary Hospital Jodhpur (ICU & Ventilator)'
  },
  {
    id: 'obstetric-pph',
    label: 'Obstetric Emergency: Postpartum Hemorrhage (PPH) / Eclampsia',
    severity: 'CRITICAL',
    defaultVitals: { bp: '86/54 mmHg', pulse: '132 bpm', spo2: '95%', temp: '36.9°C' },
    stabilizationNotes:
      'Uterine massage & bimanual compression performed; Inj. Oxytocin 20 IU in 1L Ringer Lactate IV infusing at 60 drops/min; 2 wide-bore 16G IV cannulae secured; blood bank alerted at FRU.',
    stabilizationMedKeyword: 'Oxytocin',
    stabilizationMedQty: 2,
    recommendedFacility: 'CHC Osian (First Referral Unit - CEmONC Blood Storage)'
  },
  {
    id: 'pediatric-dehydration',
    label: 'Pediatric Severe Dehydration (WHO Plan C Shock)',
    severity: 'URGENT',
    defaultVitals: { bp: '74/48 mmHg', pulse: '146 bpm', spo2: '96%', temp: '38.4°C' },
    stabilizationNotes:
      'WHO Plan C IV Ringer Lactate 100 ml/kg initiated (30 ml/kg over first 30 mins, 70 ml/kg over 2.5 hrs); NG tube ORS started upon sensorium improvement; Zinc Sulfate 20mg given.',
    stabilizationMedKeyword: 'Ringer Lactate',
    stabilizationMedQty: 2,
    recommendedFacility: 'CHC Osian (First Referral Unit - Pediatric Ward)'
  }
];

const RECEIVING_FACILITIES = [
  {
    name: 'CHC Osian (First Referral Unit - 30 Beds)',
    distanceKm: 18,
    etaMins: 22,
    freeBeds: 11,
    capabilities: '24x7 CEmONC, Blood Storage, Digital X-Ray, High-Dependency Unit'
  },
  {
    name: 'MDM District Tertiary Hospital Jodhpur (ICU & Ventilator)',
    distanceKm: 58,
    etaMins: 52,
    freeBeds: 24,
    capabilities: 'Tertiary ICU, Mechanical Ventilation, Dialysis, 24x7 Blood Bank'
  },
  {
    name: 'PHC Mandore (24x7 Cluster Hub)',
    distanceKm: 38,
    etaMins: 35,
    freeBeds: 8,
    capabilities: 'Step-Down Observation Ward, IV Resuscitation, Cold Chain Hub'
  }
];

export const ClinicalReferralModal: React.FC<ClinicalReferralModalProps> = ({
  isOpen,
  onClose,
  initialPatientName = 'Rameshwar Bishnoi (44M, Outdoor Farm Worker)',
  initialCondition,
  initialWard = 'Emergency Casualty & Observation'
}) => {
  const { selectedPHC, medicines, consumeMedicine, showNotification } = useApp();

  const [selectedPresetId, setSelectedPresetId] = useState<string>(REFERRAL_PRESETS[0].id);
  const [patientName, setPatientName] = useState<string>(initialPatientName);
  const [patientWard, setPatientWard] = useState<string>(initialWard);
  const [bp, setBp] = useState<string>(REFERRAL_PRESETS[0].defaultVitals.bp);
  const [pulse, setPulse] = useState<string>(REFERRAL_PRESETS[0].defaultVitals.pulse);
  const [spo2, setSpo2] = useState<string>(REFERRAL_PRESETS[0].defaultVitals.spo2);
  const [temp, setTemp] = useState<string>(REFERRAL_PRESETS[0].defaultVitals.temp);
  const [stabilizationNotes, setStabilizationNotes] = useState<string>(
    initialCondition
      ? `Pre-referral stabilization for ${initialCondition}: ${REFERRAL_PRESETS[0].stabilizationNotes}`
      : REFERRAL_PRESETS[0].stabilizationNotes
  );
  const [receivingFacility, setReceivingFacility] = useState<string>(
    RECEIVING_FACILITIES[0].name
  );
  const [ambulanceUnit, setAmbulanceUnit] = useState<string>(
    '108-ALS-RJ19-PA-4412 (Advanced Life Support)'
  );
  const [deductStabilizationStock, setDeductStabilizationStock] = useState<boolean>(true);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);

  if (!isOpen) return null;

  const activePreset =
    REFERRAL_PRESETS.find((p) => p.id === selectedPresetId) || REFERRAL_PRESETS[0];
  const selectedDestObj =
    RECEIVING_FACILITIES.find((f) => f.name === receivingFacility) || RECEIVING_FACILITIES[0];

  const handleSelectPreset = (preset: ReferralProtocolPreset) => {
    setSelectedPresetId(preset.id);
    setBp(preset.defaultVitals.bp);
    setPulse(preset.defaultVitals.pulse);
    setSpo2(preset.defaultVitals.spo2);
    setTemp(preset.defaultVitals.temp);
    setStabilizationNotes(preset.stabilizationNotes);
    setReceivingFacility(preset.recommendedFacility);
  };

  const handleGenerateReferralSlipAndDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDispatching(true);

    try {
      // Optional automatic stock deduction for crash-cart stabilization drug
      if (deductStabilizationStock) {
        const matchedMed = medicines.find((m) =>
          m.name.toLowerCase().includes(activePreset.stabilizationMedKeyword.toLowerCase())
        );
        if (matchedMed && matchedMed.currentStock >= activePreset.stabilizationMedQty) {
          await consumeMedicine(
            matchedMed.id,
            activePreset.stabilizationMedQty,
            `Pre-Referral Stabilization (${patientName})`
          );
        }
      }

      // Generate Prototype 108 Clinical Referral Slip PDF (Demo Simulation)
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      const refCode = `DEMO-108-REF-${Math.floor(100000 + Math.random() * 900000)}`;
      const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

      // Header Banner
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 30, 'F');
      doc.setFillColor(225, 29, 72);
      doc.rect(0, 30, pageWidth, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(251, 113, 133);
      doc.text(
        'MEDRESQ AI PROTOTYPE • 108 EMERGENCY CLINICAL REFERRAL SLIP (SYNTHETIC DEMO DATA)',
        margin,
        10
      );

      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text('INTER-FACILITY PATIENT HANDOVER & TRANSIT RECORD', margin, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(203, 213, 225);
      doc.text(
        `Referral ID: ${refCode} | Dispatch Timestamp: ${timestamp} IST | Priority: ${activePreset.severity}`,
        margin,
        25
      );

      let y = 38;

      // Origin & Receiving Facility Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('REFERRING PRIMARY HEALTH CENTRE (ORIGIN):', margin + 4, y + 6);
      doc.text('RECEIVING FRU / TERTIARY HOSPITAL (DESTINATION):', margin + contentWidth / 2 + 2, y + 6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${selectedPHC.name} (${selectedPHC.code})`, margin + 4, y + 12);
      doc.text(selectedDestObj.name, margin + contentWidth / 2 + 2, y + 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `MO In-Charge: ${selectedPHC.medicalOfficerInCharge} | ${selectedPHC.block}, ${selectedPHC.district}`,
        margin + 4,
        y + 18
      );
      doc.text(
        `Distance: ${selectedDestObj.distanceKm} km | Est. 108 Transit: ${selectedDestObj.etaMins} mins | Free Beds: ${selectedDestObj.freeBeds}`,
        margin + contentWidth / 2 + 2,
        y + 18
      );

      y += 30;

      // Patient & Clinical Indication Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text('1. Patient Demographics & Primary Referral Indication', margin, y);
      y += 4;

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`Patient Name / Age / Sex: ${patientName}`, margin + 4, y + 7);
      doc.text(`Origin Ward / Bed: ${patientWard}`, margin + contentWidth / 2 + 2, y + 7);

      doc.setTextColor(190, 18, 60);
      doc.text(`Clinical Syndrome / Diagnosis: ${activePreset.label}`, margin + 4, y + 14.5);

      y += 26;

      // Pre-Transfer Vitals Grid
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text('2. Pre-Transfer Baseline Clinical Vitals at PHC Departure', margin, y);
      y += 4;

      const vitalItems = [
        { label: 'BLOOD PRESSURE', val: bp },
        { label: 'HEART RATE / PULSE', val: pulse },
        { label: 'OXYGEN SATURATION (SpO2)', val: spo2 },
        { label: 'CORE TEMPERATURE', val: temp }
      ];
      const vBoxW = (contentWidth - 9) / 4;
      vitalItems.forEach((v, idx) => {
        const vx = margin + idx * (vBoxW + 3);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(vx, y, vBoxW, 16, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(v.label, vx + 3, y + 5.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(v.val, vx + 3, y + 12.5);
      });

      y += 22;

      // Pre-Referral Stabilization Administered at PHC
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text('3. Pre-Referral Stabilization & Emergency Drugs Administered at PHC', margin, y);
      y += 4;

      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(167, 243, 208);
      doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      const splitNotes = doc.splitTextToSize(stabilizationNotes, contentWidth - 8);
      doc.text(splitNotes, margin + 4, y + 7);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(4, 120, 87);
      doc.text(
        `Crash Cart Inventory Updated: ${activePreset.stabilizationMedQty} units of ${activePreset.stabilizationMedKeyword} logged under Emergency Stabilization.`,
        margin + 4,
        y + 21
      );

      y += 32;

      // 108 Ambulance & En-Route Monitoring Instructions
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text('4. 108 Emergency Ambulance Dispatch & En-Route EMT Protocol', margin, y);
      y += 4;

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`Assigned Ambulance Unit: ${ambulanceUnit}`, margin + 4, y + 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(
        '• EMT Directive: Maintain patent IV line, continuous SpO2 & NIBP monitoring every 10 minutes during transit.',
        margin + 4,
        y + 13
      );
      doc.text(
        `• Receiving Casualty Pre-Alerted: Bed reserved at ${selectedDestObj.name} (${selectedDestObj.capabilities}).`,
        margin + 4,
        y + 18
      );

      y += 28;

      // Sign-off Block
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('REFERRING MEDICAL OFFICER SIGNATURE:', margin + 4, y + 7);
      doc.text('108 EMT / PARAMEDIC HANDOVER:', margin + contentWidth / 2 + 2, y + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`${selectedPHC.medicalOfficerInCharge} (MO I/C, ${selectedPHC.name})`, margin + 4, y + 14);
      doc.text('Prototype Stamp: DEMO-SIMULATION-ONLY (Not an official NHM record)', margin + 4, y + 19);

      doc.text(`Unit: ${ambulanceUnit}`, margin + contentWidth / 2 + 2, y + 14);
      doc.text('Receiving FRU Stamp: ________________________', margin + contentWidth / 2 + 2, y + 19);

      const cleanPatient = patientName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24);
      const filename = `NHM_108_Referral_Slip_${cleanPatient}_${refCode}.pdf`;
      doc.save(filename);

      showNotification(
        `108 Referral Slip Downloaded (${refCode}) & Bed Pre-Alert Sent to ${selectedDestObj.name}`
      );
      onClose();
    } catch (err) {
      console.error('Error generating referral PDF:', err);
      showNotification('Could not generate referral PDF. Please try again.');
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clinical-referral-modal-title"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Top Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-rose-400 uppercase tracking-wider">
              <Ambulance className="w-3.5 h-3.5" />
              <span>NHM 108 Emergency Referral & Pre-Transfer Stabilization Protocol</span>
            </div>
            <h2 id="clinical-referral-modal-title" className="text-base sm:text-lg font-bold mt-0.5">
              Generate FRU Clinical Handover Slip & Reserve Receiving Bed
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close referral modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleGenerateReferralSlipAndDispatch} className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* 1. Standard Emergency Syndrome Selector */}
          <div>
            <label className="block font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-rose-600" />
              <span>1. Select Clinical Emergency Syndrome (Auto-Loads NHM Stabilization Protocol)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REFERRAL_PRESETS.map((preset) => {
                const isSelected = preset.id === selectedPresetId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50/90 border-rose-500 text-rose-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{preset.label}</span>
                      <span className="text-[10px] font-mono text-rose-700 shrink-0">
                        {preset.severity}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Patient Details & Vitals at Departure */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Patient Name, Age & Sex
              </label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Referring PHC Ward / Casualty Bed
              </label>
              <input
                type="text"
                required
                value={patientWard}
                onChange={(e) => setPatientWard(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Vitals 4-Column Row */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
              <span>2. Pre-Referral Clinical Vitals Recorded at PHC</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <span className="text-[10px] text-slate-500 font-mono block mb-1">BP (mmHg)</span>
                <input
                  type="text"
                  value={bp}
                  onChange={(e) => setBp(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-mono block mb-1">Pulse (bpm)</span>
                <input
                  type="text"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-mono block mb-1">SpO2 (%)</span>
                <input
                  type="text"
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-mono block mb-1">Temp (°C)</span>
                <input
                  type="text"
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* 3. Stabilization Notes & Auto Crash-Cart Deduction */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Syringe className="w-3.5 h-3.5 text-emerald-600" />
                <span>3. Pre-Referral Stabilization Treatment Administered at {selectedPHC.name}</span>
              </label>
              <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deductStabilizationStock}
                  onChange={(e) => setDeductStabilizationStock(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  Auto-deduct {activePreset.stabilizationMedQty}× {activePreset.stabilizationMedKeyword} from PHC stock
                </span>
              </label>
            </div>
            <textarea
              rows={2}
              value={stabilizationNotes}
              onChange={(e) => setStabilizationNotes(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* 4. Receiving FRU Hospital & 108 Ambulance Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Receiving FRU / Tertiary Hospital</span>
              </label>
              <select
                value={receivingFacility}
                onChange={(e) => setReceivingFacility(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900"
              >
                {RECEIVING_FACILITIES.map((fac) => (
                  <option key={fac.name} value={fac.name}>
                    {fac.name} ({fac.freeBeds} Free Beds · {fac.etaMins}m)
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                {selectedDestObj.capabilities}
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-600" />
                <span>Assigned 108 Ambulance Unit</span>
              </label>
              <select
                value={ambulanceUnit}
                onChange={(e) => setAmbulanceUnit(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900"
              >
                <option value="108-ALS-RJ19-PA-4412 (Advanced Life Support)">
                  108-ALS-RJ19-PA-4412 (Advanced Life Support · O2 + Defib)
                </option>
                <option value="108-BLS-RJ19-PA-2109 (Basic Life Support)">
                  108-BLS-RJ19-PA-2109 (Basic Life Support · On-Site)
                </option>
                <option value="104-JANANI-EXPRESS-RJ19-0881 (Maternal Transit)">
                  104-JANANI-EXPRESS-RJ19-0881 (Maternal & Neonatal Transit)
                </option>
              </select>
              <p className="text-[11px] text-emerald-700 font-mono mt-1">
                Est. Corridor Transit: {selectedDestObj.distanceKm} km ({selectedDestObj.etaMins} mins via Green Corridor)
              </p>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Signed by {selectedPHC.medicalOfficerInCharge} (MO I/C)</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isDispatching}
                className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>
                  {isDispatching
                    ? 'Generating Referral PDF...'
                    : 'Download 108 Referral Slip (PDF) & Alert FRU'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
