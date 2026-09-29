import React, { useState } from 'react';
import {
  Settings,
  Building2,
  Shield,
  Bell,
  Wifi,
  Globe,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info,
  Check
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { Role } from '../../types.ts';

export const SettingsView: React.FC = () => {
  const { selectedPHC, role, setRole, isOfflineMode, toggleOfflineMode, showNotification } = useApp();
  const [stockoutThreshold, setStockoutThreshold] = useState(7);
  const [occupancyThreshold, setOccupancyThreshold] = useState(80);
  const [feverThreshold, setFeverThreshold] = useState(30);
  const [preferredLang, setPreferredLang] = useState('hinglish');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    showNotification('System Configuration Updated: Operational parameters and alert thresholds applied.');
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-800 bg-slate-200/90 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
            Administrative Console
          </span>
          <span className="text-xs text-slate-500 font-mono">Facility Policy Configuration</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-700" />
          <span>Platform Settings & Operational Parameters</span>
        </h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Configure facility profile, role authorization, predictive alert sensitivities, and rural offline store-and-forward sync policies.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* PHC Facility Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Facility Administrative Record</span>
            </h3>
            <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              National Code: {selectedPHC.code}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-slate-600 font-bold block mb-1">Health Centre Name</label>
              <input
                type="text"
                disabled
                value={selectedPHC.name}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="text-slate-600 font-bold block mb-1">Administrative Block</label>
              <input
                type="text"
                disabled
                value={`${selectedPHC.block} Block`}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="text-slate-600 font-bold block mb-1">Revenue District</label>
              <input
                type="text"
                disabled
                value={`${selectedPHC.district} District, Rajasthan`}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="text-slate-600 font-bold block mb-1">Sub-Centres (HSCs) Covered</label>
              <input
                type="text"
                disabled
                value={`${selectedPHC.subCentresCovered} Health Sub-Centres`}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="text-slate-600 font-bold block mb-1">Catchment Population</label>
              <input
                type="text"
                disabled
                value={`${selectedPHC.populationServed.toLocaleString()} Citizens`}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="text-slate-600 font-bold block mb-1">Medical Officer In-Charge</label>
              <input
                type="text"
                disabled
                value={selectedPHC.medicalOfficerInCharge}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Role & Access Security Card */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>Role-Based Operational Access Control (RBAC)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Switch user persona to simulate security permissions and audit trails
              </p>
            </div>
            <span className="text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 font-mono">
              Active: {role.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
            {[
              { id: 'phc_worker', title: 'PHC Staff / Pharmacist', desc: 'Can enter voice/OCR data, dispense medicines, and draft indent orders.' },
              { id: 'medical_officer', title: 'Medical Officer I/C', desc: 'Can approve requisitions, authorize clinical transfers, and remediate alerts.' },
              { id: 'district_admin', title: 'District Administrator', desc: 'Can rebalance stocks across PHCs, adjust workforce, and oversee block supply.' },
              { id: 'state_admin', title: 'State Administrator', desc: 'Full statewide analytics, policy threshold adjustments, and national reporting.' }
            ].map((r) => (
              <div
                key={r.id}
                onClick={() => {
                  setRole(r.id as Role);
                  showNotification(`Role changed to ${r.title}`);
                }}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  role === r.id
                    ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-2 ring-blue-300'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>{r.title}</span>
                    {role === r.id && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed font-medium">
                    {r.desc}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100/60 text-[10px] font-mono text-slate-500">
                  {role === r.id ? '● Currently Active' : '○ Click to Switch'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Predictive Thresholds & Alert Configuration */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600" />
                <span>Predictive Alert Sensitivity Calibration</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure early warning trigger tolerances for supply depletion, bed bottlenecks, and heatwave surges
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              Automated Telemetry
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800">Critical Stockout Buffer Trigger</label>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {stockoutThreshold} Days
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="14"
                value={stockoutThreshold}
                onChange={(e) => setStockoutThreshold(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <span className="text-[11px] text-slate-500 block leading-relaxed font-medium">
                Flag red alert if projected stock falls below this lead time threshold.
              </span>
            </div>

            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800">Bed Occupancy Bottleneck</label>
                <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {occupancyThreshold}%
                </span>
              </div>
              <input
                type="range"
                min="60"
                max="95"
                value={occupancyThreshold}
                onChange={(e) => setOccupancyThreshold(Number(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
              <span className="text-[11px] text-slate-500 block leading-relaxed font-medium">
                Notify Medical Officer when ward utilization exceeds this capacity level.
              </span>
            </div>

            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800">Heatwave Surge Warning</label>
                <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  +{feverThreshold}% Demand
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="50"
                value={feverThreshold}
                onChange={(e) => setFeverThreshold(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <span className="text-[11px] text-slate-500 block leading-relaxed font-medium">
                Trigger ORS and IV fluid pre-buffer alerts on forecasted demand elevation.
              </span>
            </div>
          </div>
        </div>

        {/* Sync Policies & Language */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Wifi className="w-4 h-4 text-emerald-600" />
                <span>Rural Store-and-Forward Connectivity Policy</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium mt-2">
                Enable local encrypted storage caching for remote sub-centres experiencing intermittent cellular connectivity. All clinical events captured offline are cryptographically signed and synchronized automatically when 3G/4G connectivity is restored.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 font-mono">
                {isOfflineMode ? '● Offline Mode Active' : '● Live Online RMSCL Sync'}
              </span>
              <button
                type="button"
                onClick={toggleOfflineMode}
                className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                {isOfflineMode ? 'Switch to Online Mode' : 'Switch to Offline Buffer'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Globe className="w-4 h-4 text-purple-600" />
                <span>Voice & UI Indic Dialect Preference</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium mt-2">
                Select primary language dialect for AI voice transcription and colloquial phrase interpretation across dispensary counters.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <select
                value={preferredLang}
                onChange={(e) => setPreferredLang(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs cursor-pointer"
              >
                <option value="hinglish">Hinglish / Rajasthani Dialect (Colloquial Standard)</option>
                <option value="hindi">Hindi (मानक हिन्दी - स्वास्थ्य शब्दावली)</option>
                <option value="english">English (National Health Standard)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            {savedSuccess ? (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Configuration successfully committed to facility state.</span>
              </div>
            ) : (
              <span className="text-xs text-slate-500 font-medium">
                Operational parameters apply across all active clinic terminals and staff sessions.
              </span>
            )}
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Operational Parameters</span>
          </button>
        </div>
      </form>
    </div>
  );
};
