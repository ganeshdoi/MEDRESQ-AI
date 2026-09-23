import React from 'react';
import {
  Building2,
  UserCheck,
  Wifi,
  WifiOff,
  Bell,
  Clock,
  Menu,
  ShieldAlert,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { Role } from '../types.ts';

export const TopBar: React.FC = () => {
  const {
    selectedPHC,
    setSelectedPHC,
    facilities,
    role,
    setRole,
    isOfflineMode,
    toggleOfflineMode,
    alerts,
    setActiveModule,
    toggleMobileSidebar
  } = useApp();

  const criticalCount = alerts.filter(a => a.status === 'ACTIVE' && a.category === 'CRITICAL').length;
  const warningCount = alerts.filter(a => a.status === 'ACTIVE' && a.category === 'WARNING').length;

  let overallStatus = {
    label: 'Grid Operational',
    color: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    dot: 'bg-emerald-600'
  };

  if (criticalCount > 0) {
    overallStatus = {
      label: `${criticalCount} Critical Bottleneck${criticalCount > 1 ? 's' : ''}`,
      color: 'bg-rose-50 text-rose-950 border-rose-300',
      dot: 'bg-rose-600'
    };
  } else if (warningCount > 0) {
    overallStatus = {
      label: `${warningCount} Early Warning${warningCount > 1 ? 's' : ''}`,
      color: 'bg-amber-50 text-amber-950 border-amber-300',
      dot: 'bg-amber-600'
    };
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      {/* Top Government Masthead / Administrative Ribbon */}
      <div className="bg-slate-900 text-slate-300 px-3 sm:px-6 py-1 text-[10px] flex items-center justify-between border-b border-slate-800 tracking-wide">
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold text-amber-400 uppercase tracking-wider">National Health Mission</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-200 truncate">Department of Medical, Health & Family Welfare • Government of Rajasthan</span>
        </div>
        <div className="hidden md:flex items-center gap-3 shrink-0 font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            e-Aushadhi / RMSCL Gateway Active
          </span>
          <span>•</span>
          <span className="text-slate-300">IST: 22 Sep 2026</span>
        </div>
      </div>

      {/* Main Action Bar */}
      <div className="h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile Menu Toggle & Facility Selector */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Hamburger toggle button for Mobile */}
          <button
            type="button"
            id="mobile-menu-toggle"
            onClick={toggleMobileSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Open main navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Facility Selector */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 shadow-2xs hover:border-slate-300 transition-colors">
            <Building2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <div className="text-xs min-w-0">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider leading-none">
                Primary Facility
              </span>
              <div className="relative">
                <select
                  id="facility-selector"
                  value={selectedPHC.id}
                  onChange={(e) => {
                    const found = facilities.find(f => f.id === e.target.value);
                    if (found) setSelectedPHC(found);
                  }}
                  className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer pr-4 truncate max-w-[150px] sm:max-w-[220px]"
                >
                  {facilities.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.name} • {fac.block} Block ({fac.activeBeds} Beds)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Overall Health Readiness Status */}
          <div
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold whitespace-nowrap shadow-2xs ${overallStatus.color}`}
          >
            <span className={`w-2 h-2 rounded-full ${overallStatus.dot} animate-pulse`} aria-hidden="true" />
            <span>{overallStatus.label}</span>
          </div>
        </div>

        {/* Right Controls: Offline Mode, Role Selector, Notifications */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Low-Bandwidth / Rural Offline Buffer Mode */}
          <button
            type="button"
            id="toggle-offline-mode"
            onClick={toggleOfflineMode}
            aria-pressed={isOfflineMode}
            title={
              isOfflineMode
                ? 'Store & Forward Cache Mode active: Writes are stored locally'
                : 'Connected to State Central RMSCL Server'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors shadow-2xs focus-visible:ring-2 focus-visible:ring-emerald-500 focus:outline-none ${
              isOfflineMode
                ? 'bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-200'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {isOfflineMode ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-700 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline text-[11px]">Rural Buffer</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline text-[11px]">Sync Online</span>
              </>
            )}
          </button>

          {/* Role Switcher */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 shadow-2xs">
            <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
            <div className="text-xs">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider leading-none">
                Officer Role
              </span>
              <select
                id="role-selector"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer pr-3"
              >
                <option value="phc_worker">PHC Worker / Pharmacist</option>
                <option value="medical_officer">Medical Officer In-Charge</option>
                <option value="district_admin">District Health Admin (Jodhpur)</option>
                <option value="state_admin">State Health Admin (Rajasthan)</option>
              </select>
            </div>
          </div>

          {/* Quick Alert Centre Launcher */}
          <button
            type="button"
            id="topbar-alerts-btn"
            onClick={() => setActiveModule('alerts')}
            className="relative p-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs focus-visible:ring-2 focus-visible:ring-emerald-500 focus:outline-none"
            aria-label={`Open Incident Alert Centre. ${criticalCount + warningCount} active alerts`}
          >
            <Bell className="w-4 h-4 text-slate-700" aria-hidden="true" />
            {criticalCount + warningCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-bold font-mono rounded-full flex items-center justify-center ring-2 ring-white">
                {criticalCount + warningCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
