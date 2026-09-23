import React, { useState } from 'react';
import {
  BedDouble,
  AlertTriangle,
  Clock,
  TrendingUp,
  Baby,
  HeartPulse,
  Activity,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  Navigation
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusBadge } from '../ui/StatusBadge.tsx';

export const FacilityCapacity: React.FC = () => {
  const { capacity, selectedPHC, showNotification } = useApp();
  const [admitModalOpen, setAdmitModalOpen] = useState(false);
  const [admitType, setAdmitType] = useState('Emergency Observation');
  const [patientNote, setPatientNote] = useState('');

  const [admissionsLog, setAdmissionsLog] = useState([
    { id: 'ADM-104', patient: 'Ramesh K. (42M)', ward: 'Emergency Observation', bed: 'BED-02', time: '10:15', reason: 'Severe dehydration & heat exhaustion' },
    { id: 'ADM-103', patient: 'Sunita D. (26F)', ward: 'Labor & Delivery', bed: 'BED-05', time: '08:40', reason: 'Full-term active labor (Primi)' },
    { id: 'ADM-102', patient: 'Mohan L. (68M)', ward: 'General Inpatient', bed: 'BED-08', time: '07:20', reason: 'Acute exacerbation COPD with fever' },
    { id: 'ADM-101', patient: 'Aarav S. (4M)', ward: 'Emergency Observation', bed: 'BED-03', time: 'Yesterday', reason: 'Acute watery diarrhea with moderate dehydration' }
  ]);

  const nearbyPHCs = [
    { name: 'PHC Mandore', distance: '14 km', bedsTotal: 12, bedsFree: 5, emergencyStatus: 'Normal' },
    { name: 'PHC Balesar', distance: '28 km', bedsTotal: 10, bedsFree: 4, emergencyStatus: 'Normal' },
    { name: 'CHC Osian (FRU)', distance: '36 km', bedsTotal: 30, bedsFree: 11, emergencyStatus: 'Optimal' }
  ];

  const handleAdmissionSubmit = () => {
    const newEntry = {
      id: `ADM-${Math.floor(105 + Math.random() * 900)}`,
      patient: 'Emergency Patient (Triage)',
      ward: admitType,
      bed: admitType === 'Emergency Observation' ? 'BED-04' : 'BED-09',
      time: 'Just now',
      reason: patientNote || 'Clinical observation & stabilization'
    };
    setAdmissionsLog(prev => [newEntry, ...prev]);
    setAdmitModalOpen(false);
    setPatientNote('');
    showNotification(`Patient admitted to ${admitType}. Bed allocated.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
              IPD Bed Telemetry
            </span>
            <span className="text-xs text-slate-500 font-mono">Real-Time Census</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <BedDouble className="w-5 h-5 text-sky-600" />
            <span>Facility Inpatient Capacity & Bed Management</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Active ward occupancy, maternity beds, emergency observation, and inter-facility overflow routing for {selectedPHC.name}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setAdmitModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Admit / Allocate Bed</span>
          </button>
        </div>
      </div>

      {/* Bottleneck Warning Banner */}
      <div
        role="alert"
        className="bg-amber-50/90 border-l-4 border-amber-500 rounded-r-xl p-4 sm:p-5 shadow-xs transition-all"
      >
        <div className="flex items-start gap-3.5">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <div className="font-bold text-sm text-amber-950 flex flex-wrap items-center gap-2">
              <span>Bottleneck Alert: Critical Capacity in Emergency Observation</span>
              <StatusBadge status="WARNING" text="90% Utilized" />
            </div>
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              3 of 4 Emergency Observation beds currently occupied. Peak morning OPD influx (10:00 – 13:30 IST) is anticipated to generate 4–6 observation admissions. Prepare step-down transfers to General Inpatient Ward or divert stable cases.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Ward Capacity Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Inpatient Beds */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 uppercase tracking-wider font-bold">
              <span>Total Inpatient Beds</span>
              <BedDouble className="w-4 h-4 text-sky-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-slate-900">
                {capacity.occupiedBeds}/{capacity.totalBeds}
              </span>
              <span className="text-xs text-slate-500 font-medium">Occupied</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full ${
                  capacity.occupancyRate > 80 ? 'bg-rose-500' : 'bg-sky-500'
                }`}
                style={{ width: `${capacity.occupancyRate}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between font-mono">
              <span>{capacity.availableBeds} Free Beds</span>
              <span className="font-bold text-slate-800">{capacity.occupancyRate}% Load</span>
            </div>
          </div>
        </div>

        {/* Labor Room / Delivery Beds */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 uppercase tracking-wider font-bold">
              <span>Labor & Delivery</span>
              <Baby className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-slate-900">
                {capacity.laborRoomBedsOccupied}/{capacity.laborRoomBeds}
              </span>
              <span className="text-xs text-slate-500 font-medium">In Labor</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-rose-500"
                style={{
                  width: `${(capacity.laborRoomBedsOccupied / capacity.laborRoomBeds) * 100}%`
                }}
              />
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between font-mono">
              <span>{capacity.laborRoomBeds - capacity.laborRoomBedsOccupied} Free</span>
              <span className="font-bold text-emerald-700">MCH Ready</span>
            </div>
          </div>
        </div>

        {/* Emergency Observation Beds */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 uppercase tracking-wider font-bold">
              <span>Emergency Observation</span>
              <HeartPulse className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-rose-700">
                {capacity.emergencyObservationOccupied}/{capacity.emergencyObservationBeds}
              </span>
              <span className="text-xs text-rose-700 font-bold">Near Peak</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-rose-600"
                style={{
                  width: `${(capacity.emergencyObservationOccupied / capacity.emergencyObservationBeds) * 100}%`
                }}
              />
            </div>
            <div className="text-[11px] text-rose-800 flex justify-between font-mono font-bold">
              <span>1 Bed Remaining</span>
              <span>Surge Alert</span>
            </div>
          </div>
        </div>

        {/* Oxygen Support Beds */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 uppercase tracking-wider font-bold">
              <span>Oxygen Supported Beds</span>
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-slate-900">
                {capacity.oxygenBedsOccupied}/{capacity.oxygenSupportedBeds}
              </span>
              <span className="text-xs text-slate-500 font-medium">Beds Active</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-emerald-600"
                style={{
                  width: `${(capacity.oxygenBedsOccupied / capacity.oxygenSupportedBeds) * 100}%`
                }}
              />
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between font-mono">
              <span>{capacity.oxygenSupportedBeds - capacity.oxygenBedsOccupied} Free</span>
              <span className="text-emerald-700 font-bold">Manifold 100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Utilization Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block uppercase tracking-wider">
            Average Length of Stay (ALOS)
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {capacity.averageLengthOfStayDays} Days
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Optimal rural PHC benchmark: 1.8 – 2.5 days
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block uppercase tracking-wider">
            Bed Turnover Rate
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {capacity.bedTurnoverRate} Patients / Bed / Wk
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Optimal patient throughput with timely step-downs
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block uppercase tracking-wider">
            Peak Influx Hours
          </span>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
            {capacity.peakOccupancyHours}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Correlates with rural bus service arrivals
          </p>
        </div>
      </div>

      {/* Live Ward Bed Matrix Visualizer */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <BedDouble className="w-4 h-4 text-sky-600" />
            <span>Facility Ward Bed Distribution Grid</span>
          </h3>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-500" />
              <span className="text-slate-600">Occupied</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500" />
              <span className="text-slate-600">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-400" />
              <span className="text-slate-600">Sanitizing</span>
            </div>
          </div>
        </div>

        {/* Bed Grid Visuals */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {Array.from({ length: capacity.totalBeds }).map((_, i) => {
            const isOccupied = i < capacity.occupiedBeds;
            const isSanitizing = i === capacity.occupiedBeds;
            const bedNumber = `BED-${i + 1 < 10 ? '0' : ''}${i + 1}`;
            return (
              <div
                key={i}
                className={`p-3.5 rounded-xl border text-center transition-all ${
                  isOccupied
                    ? 'border-rose-300 bg-rose-50/80 text-rose-950'
                    : isSanitizing
                    ? 'border-amber-300 bg-amber-50/80 text-amber-950'
                    : 'border-emerald-300 bg-emerald-50/80 text-emerald-950'
                }`}
              >
                <div className="font-mono font-bold text-xs">{bedNumber}</div>
                <div className="text-[10px] mt-1 font-bold uppercase tracking-wider">
                  {isOccupied ? 'Occupied' : isSanitizing ? 'Sanitizing' : 'Available'}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-medium">
                  {i < 4 ? 'Emergency' : i < 6 ? 'Labor Room' : 'General Ward'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Bottom: Daily Admission Log + Inter-Facility Overflow Routing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Admission & Discharge Summary Log */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                Today's Inpatient Activity (22 Sep 2026)
              </h3>
              <span className="text-xs font-mono text-slate-500">
                6 Admits / 4 Discharges
              </span>
            </div>

            <div className="divide-y divide-slate-100 mt-2 text-xs">
              {admissionsLog.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-500 font-bold">{log.id}</span>
                      <span className="font-bold text-slate-900 truncate">{log.patient}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 shrink-0 font-mono">
                        {log.bed}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] truncate mt-0.5">
                      {log.ward} • {log.reason}
                    </div>
                  </div>
                  <span className="font-mono text-slate-400 text-[11px] shrink-0 font-semibold">
                    {log.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Audit record logged in HMIS portal</span>
            <button
              type="button"
              onClick={() => setAdmitModalOpen(true)}
              className="text-sky-700 font-bold hover:underline"
            >
              + Quick Bed Allocation
            </button>
          </div>
        </div>

        {/* Nearby PHC Capacity & Overflow Routing */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Cluster Referral Capacity & Divert Options
                </h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-mono">
                108 Emergency Grid
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              If emergency observation reaches 100% capacity, automated diversion protocols recommend transfer to these linked facilities:
            </p>

            <div className="mt-3 space-y-2 text-xs">
              {nearbyPHCs.map((phc, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span>{phc.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">({phc.distance})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Total: {phc.bedsTotal} Beds • Emergency Status: {phc.emergencyStatus}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-700 text-sm">
                      {phc.bedsFree} Free Beds
                    </span>
                    <div className="text-[10px] text-slate-400">Transit ~25m</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>District Ambulance Dispatch: Linked</span>
            <span className="font-semibold text-slate-700">Toll Free: 108</span>
          </div>
        </div>
      </div>

      {/* Quick Admission Modal */}
      {admitModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Emergency Admission Triage</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Allocate available bed slot at {selectedPHC.name}.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ward Selection</label>
                <select
                  value={admitType}
                  onChange={(e) => setAdmitType(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="Emergency Observation">Emergency Observation (1 Bed Left)</option>
                  <option value="General Inpatient">General Inpatient (2 Beds Left)</option>
                  <option value="Labor & Delivery">Labor & Delivery (1 Bed Left)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Primary Clinical Reason</label>
                <input
                  type="text"
                  value={patientNote}
                  onChange={(e) => setPatientNote(e.target.value)}
                  placeholder="e.g. Heat stroke rehydration protocol"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAdmitModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdmissionSubmit}
                className="px-4 py-2 bg-sky-700 text-white rounded-lg text-xs font-bold hover:bg-sky-800 shadow-xs"
              >
                Confirm Bed Allocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
