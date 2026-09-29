import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Truck,
  Users,
  MapPin,
  Navigation,
  Clock,
  ExternalLink,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Boxes,
  Stethoscope,
  Pill,
  Check,
  Building2,
  FileText
} from 'lucide-react';
import { NetworkFacility, EmergencyCircuitPlan } from '../../../types';
import { EMERGENCY_CIRCUITS_PRESETS } from '../../../data/emergencyCircuitsData';
import { DirectionsResultData } from './InteractiveMap';

interface EmergencyCircuitModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilities: NetworkFacility[];
  currentOrigin: NetworkFacility | null;
  currentDestination: NetworkFacility | null;
  currentWaypoints: NetworkFacility[];
  directionsData: DirectionsResultData | null;
  optimizeWaypoints: boolean;
  onToggleOptimize: (enabled: boolean) => void;
  onApplyCircuit: (
    origin: NetworkFacility,
    destination: NetworkFacility,
    waypoints: NetworkFacility[],
    circuitTitle?: string,
    payloadData?: any
  ) => void;
}

export const EmergencyCircuitModal: React.FC<EmergencyCircuitModalProps> = ({
  isOpen,
  onClose,
  facilities,
  currentOrigin,
  currentDestination,
  currentWaypoints,
  directionsData,
  optimizeWaypoints,
  onToggleOptimize,
  onApplyCircuit
}) => {
  // Active Category / Mode
  const [activeTab, setActiveTab] = useState<'PRESETS' | 'CUSTOM' | 'MANIFEST'>('PRESETS');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(EMERGENCY_CIRCUITS_PRESETS[0].id);

  // Custom Route Builder State
  const [customOriginId, setCustomOriginId] = useState<string>(
    currentOrigin?.id || 'rmscl-mandore'
  );
  const [customDestinationId, setCustomDestinationId] = useState<string>(
    currentDestination?.id || 'chc-baori'
  );
  const [customWaypointIds, setCustomWaypointIds] = useState<string[]>(
    currentWaypoints.length > 0
      ? currentWaypoints.map((w) => w.id)
      : ['phc-balesar', 'phc-tinwari', 'phc-osian']
  );
  const [customCategory, setCustomCategory] = useState<'SUPPLY_DISTRIBUTION' | 'PERSONNEL_DEPLOYMENT'>(
    'SUPPLY_DISTRIBUTION'
  );

  // Simulation State
  const [simulatingStep, setSimulatingStep] = useState<number | null>(null);
  const [simulatedCompleted, setSimulatedCompleted] = useState<number[]>([]);
  const [modalNotice, setModalNotice] = useState<string | null>(null);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
    };
  }, []);

  // Expandable steps
  const [expandedLegIdx, setExpandedLegIdx] = useState<number | null>(0);

  // Selected Preset
  const currentPreset = useMemo(() => {
    return EMERGENCY_CIRCUITS_PRESETS.find((p) => p.id === selectedPresetId) || EMERGENCY_CIRCUITS_PRESETS[0];
  }, [selectedPresetId]);

  // Available PHCs for selection
  const phcFacilities = useMemo(() => {
    return facilities.filter((f) => f.facilityType.includes('PHC') || f.facilityType === 'Sub-Centre');
  }, [facilities]);

  // Effective circuit nodes based on active tab
  const effectiveOrigin = useMemo(() => {
    if (activeTab === 'PRESETS') {
      return facilities.find((f) => f.id === currentPreset.originId) || facilities[0];
    }
    return facilities.find((f) => f.id === customOriginId) || facilities[0];
  }, [activeTab, currentPreset, customOriginId, facilities]);

  const effectiveDestination = useMemo(() => {
    if (activeTab === 'PRESETS') {
      return facilities.find((f) => f.id === currentPreset.destinationId) || facilities[facilities.length - 1];
    }
    return facilities.find((f) => f.id === customDestinationId) || facilities[facilities.length - 1];
  }, [activeTab, currentPreset, customDestinationId, facilities]);

  const effectiveWaypoints = useMemo(() => {
    const ids = activeTab === 'PRESETS' ? currentPreset.waypointIds : customWaypointIds;
    return ids.map((id) => facilities.find((f) => f.id === id)).filter(Boolean) as NetworkFacility[];
  }, [activeTab, currentPreset, customWaypointIds, facilities]);

  // Handlers
  const handleToggleWaypoint = (id: string) => {
    setModalNotice(null);
    if (customWaypointIds.includes(id)) {
      setCustomWaypointIds(customWaypointIds.filter((wId) => wId !== id));
    } else {
      if (customWaypointIds.length >= 6) {
        setModalNotice('Maximum of 6 intermediate PHC stops reached for a single TSP circuit.');
        return;
      }
      setCustomWaypointIds([...customWaypointIds, id]);
    }
  };

  const handleApplyPreset = (preset: EmergencyCircuitPlan) => {
    const origin = facilities.find((f) => f.id === preset.originId);
    const dest = facilities.find((f) => f.id === preset.destinationId);
    const waypoints = preset.waypointIds
      .map((id) => facilities.find((f) => f.id === id))
      .filter(Boolean) as NetworkFacility[];

    if (origin && dest) {
      onApplyCircuit(origin, dest, waypoints, preset.title, preset);
      onClose();
    }
  };

  const handleApplyCustomCircuit = () => {
    if (effectiveOrigin && effectiveDestination) {
      onApplyCircuit(
        effectiveOrigin,
        effectiveDestination,
        effectiveWaypoints,
        customCategory === 'SUPPLY_DISTRIBUTION'
          ? 'Custom Medical Supply Distribution Circuit'
          : 'Custom Emergency Personnel Surge Deployment',
        {
          category: customCategory,
          vehicle: {
            regNumber: 'RJ-19-EM-8802',
            model: 'Emergency Health Logistics Carrier',
            driverName: 'Rameshwar Lal',
            driverPhone: '+91 94140 12345'
          },
          teamLeader: {
            name: 'Duty Medical Officer',
            role: 'District Disaster Medical Coordinator',
            phone: '+91 94140 54321'
          }
        }
      );
      onClose();
    }
  };

  // Google Maps Multi-Stop Navigation URL
  const googleMapsMultiStopUrl = useMemo(() => {
    if (!effectiveOrigin || !effectiveDestination) return '#';
    const originStr = `${effectiveOrigin.latitude},${effectiveOrigin.longitude}`;
    const destStr = `${effectiveDestination.latitude},${effectiveDestination.longitude}`;
    const waypointsStr = effectiveWaypoints.map((w) => `${w.latitude},${w.longitude}`).join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&waypoints=${waypointsStr}&travelmode=driving`;
  }, [effectiveOrigin, effectiveDestination, effectiveWaypoints]);

  if (!isOpen) return null;

  // Simulation handler
  const handleStartSimulation = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
    }
    setSimulatingStep(0);
    setSimulatedCompleted([]);
    setModalNotice('Simulating multi-stop dispatch leg progression...');
    const totalLegs = effectiveWaypoints.length + 1;

    let current = 0;
    simIntervalRef.current = setInterval(() => {
      current += 1;
      if (current < totalLegs) {
        setSimulatingStep(current);
        setSimulatedCompleted((prev) => [...prev, current - 1]);
      } else {
        setSimulatedCompleted((prev) => [...prev, totalLegs - 1]);
        setSimulatingStep(null);
        setModalNotice('Simulated multi-PHC dispatch completed across all route legs.');
        if (simIntervalRef.current) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
        }
      }
    }, 2400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-4 sm:p-5 flex items-start justify-between gap-4 border-b border-sky-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-sky-300 bg-sky-900/60 px-2.5 py-0.5 rounded border border-sky-700">
                Google Maps Multi-Stop TSP Router
              </span>
              <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Turn-by-Turn Optimization
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-1 flex items-center gap-2">
              <Truck className="w-5 h-5 text-sky-400" />
              <span>Multi-PHC Emergency Route Optimizer & Deployment Planner</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 max-w-3xl">
              Solve multi-facility distribution logistics: calculates the fastest driving circuit connecting rural PHCs to distribute life-saving antivenom, oxygen buffers, or deploy surge medical personnel.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls & Google Maps TSP Optimization Switch */}
        <div className="bg-slate-50 px-4 sm:px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center bg-slate-200 p-0.5 rounded-lg font-semibold text-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab('PRESETS')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'PRESETS' ? 'bg-white text-sky-950 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>Emergency Scenarios ({EMERGENCY_CIRCUITS_PRESETS.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CUSTOM')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'CUSTOM' ? 'bg-white text-sky-950 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              <Navigation className="w-3.5 h-3.5 text-sky-600" />
              <span>Custom Circuit Builder</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MANIFEST')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'MANIFEST' ? 'bg-white text-sky-950 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-slate-700" />
              <span>Official Movement Order</span>
            </button>
          </div>

          {/* Google Maps Traveling Salesperson Problem (TSP) Optimization Toggle */}
          <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-lg">
            <input
              type="checkbox"
              id="tsp-toggle"
              checked={optimizeWaypoints}
              onChange={(e) => onToggleOptimize(e.target.checked)}
              className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
            />
            <label htmlFor="tsp-toggle" className="text-xs font-bold text-sky-950 cursor-pointer select-none">
              Google Maps TSP Waypoint Optimization
            </label>
            <span className="text-[10px] text-sky-700 bg-sky-200/60 px-1.5 py-0.5 rounded font-mono font-bold">
              Minimizes Mileage & Fuel
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {modalNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-semibold flex items-center justify-between gap-2">
              <span>{modalNotice}</span>
              <button
                type="button"
                onClick={() => setModalNotice(null)}
                className="text-emerald-700 hover:text-emerald-950 font-bold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}
          {activeTab === 'PRESETS' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {EMERGENCY_CIRCUITS_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  const isSupply = preset.category === 'SUPPLY_DISTRIBUTION';

                  return (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-left space-y-2.5 ${
                        isSelected
                          ? 'border-sky-600 bg-sky-50/60 shadow-md ring-1 ring-sky-400'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`p-1.5 rounded-lg text-white ${
                              isSupply ? 'bg-sky-600' : 'bg-purple-600'
                            }`}
                          >
                            {isSupply ? <Boxes className="w-4 h-4" /> : <Stethoscope className="w-4 h-4" />}
                          </span>
                          <div>
                            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-500">
                              {isSupply ? 'Medical Supply Circuit' : 'Personnel Surge Deployment'}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 leading-snug">
                              {preset.title}
                            </h3>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {preset.description}
                      </p>

                      {/* Stops Chain */}
                      <div className="bg-white p-2 rounded-lg border border-slate-200/80 text-[11px] font-mono text-slate-700 flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-purple-700">Origin: {preset.originId.replace('rmscl-', '').replace('chc-', '')}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        {preset.waypointIds.map((wId, i) => (
                          <React.Fragment key={wId}>
                            <span className="bg-sky-100 text-sky-900 px-1.5 py-0.5 rounded font-bold">
                              Stop {i + 1}: {wId.replace('phc-', '')}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                          </React.Fragment>
                        ))}
                        <span className="font-bold text-rose-700">Dest: {preset.destinationId.replace('chc-', '').replace('rmscl-', '')}</span>
                      </div>

                      {/* Vehicle & Team Info */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <Truck className="w-3 h-3 text-slate-400" />
                          <span>{preset.vehicle.regNumber}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>{preset.teamLeader.name}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons for Presets */}
              <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                <div>
                  <div className="text-xs text-sky-300 font-mono font-bold">
                    Selected Circuit: {currentPreset.title}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    {effectiveWaypoints.length} intermediate PHC drops • Full route driving coordinates prepared for Google Maps
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(currentPreset)}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Plot & Navigate on Google Map</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'CUSTOM' && (
            <div className="space-y-4">
              <div className="bg-sky-50 border border-sky-200 p-3.5 rounded-xl text-xs text-sky-950 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                <p>
                  <strong>Custom Emergency Circuit Builder:</strong> Pick your central depot or referral hospital as the Start point, select multiple rural PHCs that need medical resupply or doctors, and set the final terminus. Google Maps Directions will automatically optimize the visiting order to minimize road transit distance.
                </p>
              </div>

              {/* Payload Category Selector */}
              <div className="flex items-center gap-3 text-xs">
                <span className="font-bold text-slate-700">Mission Type:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomCategory('SUPPLY_DISTRIBUTION')}
                    className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      customCategory === 'SUPPLY_DISTRIBUTION'
                        ? 'bg-sky-700 text-white border-sky-800'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>Medical Supply Distribution (Antivenom, Oxygen, IV Fluids)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomCategory('PERSONNEL_DEPLOYMENT')}
                    className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      customCategory === 'PERSONNEL_DEPLOYMENT'
                        ? 'bg-purple-700 text-white border-purple-800'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Emergency Staff & Specialist Surge Deployment</span>
                  </button>
                </div>
              </div>

              {/* Origin & Destination Hub Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                    <span>Circuit Origin (Depot / Source Hub):</span>
                  </label>
                  <select
                    value={customOriginId}
                    onChange={(e) => setCustomOriginId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.facilityType} - {f.district})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                    <span>Circuit Final Destination (Hospital / Depot Return):</span>
                  </label>
                  <select
                    value={customDestinationId}
                    onChange={(e) => setCustomDestinationId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.facilityType} - {f.district})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Intermediate PHC Checkbox Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Select Intermediate PHCs to Include in Emergency Route ({customWaypointIds.length} selected):
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Google Maps will reorder these stops for shortest transit
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {phcFacilities.map((phc) => {
                    const isChecked = customWaypointIds.includes(phc.id);
                    const isCritical =
                      phc.capacityUtilization >= 85 || phc.medicineRisk === 'CRITICAL_DEFICIT';

                    return (
                      <div
                        key={phc.id}
                        onClick={() => handleToggleWaypoint(phc.id)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-start justify-between gap-2 ${
                          isChecked
                            ? 'bg-sky-50 border-sky-500 font-semibold text-sky-950'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{phc.name}</span>
                            {isCritical && (
                              <span className="px-1 py-0.2 bg-rose-100 text-rose-800 text-[9px] rounded font-bold">
                                DEFICIT
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono">
                            Block: {phc.block} • Beds: {phc.occupiedBeds}/{phc.sanctionedBeds}
                          </p>
                        </div>

                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 text-sky-600 rounded border-slate-300 pointer-events-none mt-0.5"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleApplyCustomCircuit}
                  disabled={customWaypointIds.length === 0}
                  className="px-5 py-2.5 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Compute & Plot Route on Google Maps</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'MANIFEST' && (
            <div className="space-y-4">
              {/* Printable Movement Order Card */}
              <div className="bg-slate-50 border-2 border-slate-300 p-5 rounded-xl font-sans text-slate-900 space-y-4">
                {/* Manifest Header */}
                <div className="text-center pb-3 border-b-2 border-slate-300 space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-slate-600 font-mono">
                    GOVERNMENT OF RAJASTHAN • DEPARTMENT OF MEDICAL, HEALTH & FAMILY WELFARE
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    EMERGENCY MEDICAL DISPATCH & MULTI-PHC MOVEMENT ORDER
                  </h3>
                  <div className="text-xs text-slate-500 font-mono">
                    ORDER NO: RAJ-DISPATCH-2026-{Math.floor(1000 + Math.random() * 9000)} • DATE: {new Date().toLocaleDateString('en-IN')}
                  </div>
                </div>

                {/* Logistics Metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Vehicle Reg. No:</span>
                    <p className="font-bold text-slate-900">{currentPreset.vehicle.regNumber}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Vehicle Type:</span>
                    <p className="font-bold text-slate-900">{currentPreset.vehicle.model}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Driver In-Charge:</span>
                    <p className="font-bold text-slate-900">{currentPreset.vehicle.driverName} ({currentPreset.vehicle.driverPhone})</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Team Leader / CMO:</span>
                    <p className="font-bold text-slate-900">{currentPreset.teamLeader.name}</p>
                  </div>
                </div>

                {/* Circuit Stops Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider">
                    Authorized Visiting Sequence & Emergency Drops:
                  </h4>

                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-200/80 text-slate-700 font-mono text-[11px]">
                          <th className="p-2 border-b border-slate-300">Stop #</th>
                          <th className="p-2 border-b border-slate-300">Facility Name & Type</th>
                          <th className="p-2 border-b border-slate-300">Block / District</th>
                          <th className="p-2 border-b border-slate-300">Drop-off Cargo / Assigned Personnel</th>
                          <th className="p-2 border-b border-slate-300 text-right">Acknowledgement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        <tr className="bg-purple-50/50">
                          <td className="p-2 font-mono font-bold text-purple-800">START</td>
                          <td className="p-2 font-bold text-slate-900">{effectiveOrigin.name}</td>
                          <td className="p-2 text-slate-600">{effectiveOrigin.block}, {effectiveOrigin.district}</td>
                          <td className="p-2 text-slate-600">Origin Depot / Initial Consignment Loading</td>
                          <td className="p-2 text-right font-mono text-emerald-700 font-bold">DISPATCHED</td>
                        </tr>

                        {effectiveWaypoints.map((wp, idx) => {
                          const supplies = currentPreset.suppliesAllocations?.[wp.id] || [];
                          const personnel = currentPreset.personnelAllocations?.[wp.id] || [];

                          return (
                            <tr key={wp.id} className="hover:bg-slate-50">
                              <td className="p-2 font-mono font-bold text-sky-800">STOP #{idx + 1}</td>
                              <td className="p-2 font-bold text-slate-900">
                                {wp.name}
                                <span className="block text-[10px] text-slate-500 font-normal">{wp.code}</span>
                              </td>
                              <td className="p-2 text-slate-600">{wp.block}</td>
                              <td className="p-2">
                                {supplies.length > 0 && (
                                  <div className="space-y-0.5 text-[11px] text-slate-700">
                                    {supplies.map((s, sIdx) => (
                                      <div key={sIdx} className="flex items-center gap-1 font-mono">
                                        <span className="text-emerald-700 font-bold">• {s.quantity} {s.unit}</span>
                                        <span className="text-slate-600">({s.item.split(' ')[0]})</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {personnel.length > 0 && (
                                  <div className="space-y-0.5 text-[11px] text-slate-700">
                                    {personnel.map((p, pIdx) => (
                                      <div key={pIdx} className="flex items-center gap-1 font-mono">
                                        <span className="text-purple-700 font-bold">• {p.count}x {p.role}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {supplies.length === 0 && personnel.length === 0 && (
                                  <span className="text-slate-400 italic">Clinical Surge & Triage Review</span>
                                )}
                              </td>
                              <td className="p-2 text-right">
                                <span className="inline-block px-2 py-0.5 rounded border border-slate-300 text-[10px] text-slate-400 font-mono">
                                  MOIC Signature [ &nbsp; &nbsp; &nbsp; &nbsp; ]
                                </span>
                              </td>
                            </tr>
                          );
                        })}

                        <tr className="bg-rose-50/50">
                          <td className="p-2 font-mono font-bold text-rose-800">DEST</td>
                          <td className="p-2 font-bold text-slate-900">{effectiveDestination.name}</td>
                          <td className="p-2 text-slate-600">{effectiveDestination.block}, {effectiveDestination.district}</td>
                          <td className="p-2 text-slate-600">Final Terminus / Vehicle Restocking & Standby</td>
                          <td className="p-2 text-right font-mono text-slate-400">PENDING</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Signatures */}
                <div className="pt-4 border-t border-slate-300 flex justify-between items-end text-xs text-slate-600">
                  <div>
                    <p className="font-bold text-slate-800">Chief Medical & Health Officer (CMHO)</p>
                    <p className="text-[11px]">District Disaster Management Authority, Jodhpur</p>
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setModalNotice('Prepared Official Movement Manifest for printing.');
                        try {
                          window.print();
                        } catch {
                          // Ignore print dialog restrictions in sandboxed preview
                        }
                      }}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Official Movement Manifest</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Real-time Google Maps Leg-by-Leg Directions Breakdown */}
          {directionsData && directionsData.legs && directionsData.legs.length > 0 && (
            <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                      Google Maps Calculated Route Summary
                    </span>
                    {optimizeWaypoints && (
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded font-mono font-bold">
                        TSP Optimized Order
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono mt-1">
                    <span>
                      Total Distance: <strong className="text-white text-sm">{directionsData.distanceText}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Total ETA: <strong className="text-emerald-400 text-sm">{directionsData.durationText}</strong></span>
                    </span>
                    <span>•</span>
                    <span>Stops: <strong className="text-sky-300">{directionsData.legs.length} legs</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Google Maps Multi-stop URL */}
                  <a
                    href={googleMapsMultiStopUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <span>Open Multi-Stop in Google Maps App</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {/* Simulate dispatch */}
                  <button
                    type="button"
                    onClick={handleStartSimulation}
                    className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Simulate Dispatch</span>
                  </button>
                </div>
              </div>

              {/* Legs Itinerary */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-sky-300 font-mono uppercase tracking-wider">
                  Leg-by-Leg Driving Itinerary & Turn-by-Turn Maneuvers:
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {directionsData.legs.map((leg, legIdx) => {
                    const isExpanded = expandedLegIdx === legIdx;
                    const isSimActive = simulatingStep === legIdx;
                    const isSimDone = simulatedCompleted.includes(legIdx);

                    return (
                      <div
                        key={legIdx}
                        className={`rounded-lg border transition-colors ${
                          isSimActive
                            ? 'bg-sky-950/80 border-sky-400 ring-2 ring-sky-400/40'
                            : isSimDone
                            ? 'bg-emerald-950/40 border-emerald-700'
                            : 'bg-slate-800/80 border-slate-700'
                        }`}
                      >
                        <div
                          onClick={() => setExpandedLegIdx(isExpanded ? null : legIdx)}
                          className="p-3 flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                                isSimDone
                                  ? 'bg-emerald-500 text-white'
                                  : isSimActive
                                  ? 'bg-sky-500 text-white animate-pulse'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {isSimDone ? '✓' : legIdx + 1}
                            </span>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-2">
                                <span>Leg {legIdx + 1}: {leg.startAddress?.split(',')[0]} ➔ {leg.endAddress?.split(',')[0]}</span>
                                {isSimActive && (
                                  <span className="text-[10px] text-amber-300 bg-amber-950 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
                                    VEHICLE EN ROUTE
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                Distance: <span className="text-slate-200 font-bold">{leg.distanceText}</span> • Travel Time: <span className="text-emerald-400 font-bold">{leg.durationText}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-slate-400 text-xs">
                            <span>{leg.steps.length} turns</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>

                        {/* Expanded maneuvers */}
                        {isExpanded && leg.steps.length > 0 && (
                          <div className="p-3 pt-0 border-t border-slate-700/60 max-h-40 overflow-y-auto space-y-1.5 text-xs text-slate-300 font-sans mt-2">
                            {leg.steps.map((st, stIdx) => (
                              <div key={stIdx} className="flex items-start justify-between gap-2 text-[11px] py-1 border-b border-slate-700/30">
                                <div className="flex items-start gap-1.5">
                                  <span className="text-slate-500 font-mono w-4 shrink-0 text-right">{stIdx + 1}.</span>
                                  <span>{st.instructions}</span>
                                </div>
                                <span className="text-slate-400 font-mono shrink-0">{st.distance}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
