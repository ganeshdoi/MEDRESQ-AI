import React from 'react';
import {
  LayoutDashboard,
  Pill,
  ScanLine,
  CloudSun,
  Truck,
  AlertTriangle,
  BarChart3,
  Activity,
  X,
  MapPin,
  Building2,
  KeyRound,
  LogOut,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { getPHCInchargeCredential } from '../utils/phcAuthDirectory.ts';

interface SidebarItem {
  id: string;
  name: string;
  subtitle: string;
  icon: React.ElementType;
  count?: number;
  badgeColor?: 'rose' | 'amber' | 'emerald';
}

export const Sidebar: React.FC = () => {
  const {
    activeModule,
    setActiveModule,
    alerts,
    orders,
    medicines,
    selectedPHC,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    inchargeSession,
    openAuthModal,
    signOutIncharge,
    showNotification
  } = useApp();

  const activeAlertsCount = alerts.filter((a) => a.status === 'ACTIVE').length;
  const criticalMedsCount = medicines.filter((m) => m.stockoutRisk === 'CRITICAL').length;
  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'APPROVAL PENDING' || o.status === 'REQUESTED' || o.status === 'IN TRANSIT'
  ).length;

  const currentCredential = getPHCInchargeCredential(selectedPHC);

  const coreModules: SidebarItem[] = [
    {
      id: 'home',
      name: 'Supply Overview',
      subtitle: 'Quick actions, stock & dispense',
      icon: LayoutDashboard
    },
    {
      id: 'medicine',
      name: 'Medicine Inventory & FEFO',
      subtitle: 'Batches, shelf-life & reorders',
      icon: Pill,
      count: criticalMedsCount > 0 ? criticalMedsCount : undefined,
      badgeColor: 'rose'
    },
    {
      id: 'preparedness',
      name: 'Demand & Surge Forecast',
      subtitle: 'Regional & seasonal surge AI',
      icon: CloudSun
    },
    {
      id: 'orders',
      name: 'Orders & PHC Transfers',
      subtitle: 'Warehouse indents & sharing',
      icon: Truck,
      count: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
      badgeColor: 'amber'
    },
    {
      id: 'map',
      name: 'Network Stock Map',
      subtitle: '53 facilities & live routing',
      icon: MapPin
    },
    {
      id: 'directory',
      name: 'PHC & NLEM Catalogue',
      subtitle: 'All 53 PHCs & 51 NLEM drugs',
      icon: Building2
    },
    {
      id: 'records',
      name: 'Register Scan (OCR)',
      subtitle: 'Stock book photo capture',
      icon: ScanLine
    },
    {
      id: 'alerts',
      name: 'Alerts & Offline Queue',
      subtitle: 'Thresholds & local sync',
      icon: AlertTriangle,
      count: activeAlertsCount > 0 ? activeAlertsCount : undefined,
      badgeColor: 'rose'
    },
    {
      id: 'analytics',
      name: 'CSV / PDF Reports',
      subtitle: 'Download stock & audit logs',
      icon: BarChart3
    }
  ];

  const handleSelectModule = (id: string) => {
    setActiveModule(id);
    setMobileSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Modern Friendly Sidebar */}
      <aside
        id="app-sidebar"
        aria-label="Main Navigation"
        className={`fixed inset-y-0 left-0 z-50 w-68 bg-linear-to-b from-slate-900 via-teal-950 to-slate-950 text-slate-100 flex flex-col shrink-0 border-r border-teal-900/60 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => handleSelectModule('home')}
            className="flex items-center gap-3 text-left focus:outline-none cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-teal-400 to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Activity className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-white tracking-tight text-sm block leading-none">
                MEDRESQ PORTAL
              </span>
              <span className="text-[11px] text-teal-300 font-medium truncate block mt-1 leading-none">
                {selectedPHC.name}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 focus:outline-none"
            aria-label="Close navigation sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Content */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar-dark">
          <div className="px-3 pb-2 text-[10px] font-bold text-teal-300/80 uppercase tracking-widest">
            Friendly PHC Workspace
          </div>
          {coreModules.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                type="button"
                onClick={() => handleSelectModule(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-linear-to-r from-teal-600 to-emerald-600 text-white shadow-md ring-1 ring-teal-400/40'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-teal-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div
                      className={`text-xs truncate whitespace-nowrap ${
                        isActive ? 'font-bold' : 'font-semibold'
                      }`}
                    >
                      {item.name}
                    </div>
                    <div
                      className={`text-[10px] truncate ${
                        isActive ? 'text-teal-100' : 'text-slate-400'
                      }`}
                    >
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`text-[10px] font-mono tabular-nums font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isActive
                        ? 'bg-slate-950/40 text-white'
                        : item.badgeColor === 'rose'
                        ? 'bg-rose-500 text-white'
                        : 'bg-amber-500/25 text-amber-200 border border-amber-400/30'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Active PHC Incharge & Masked Demo Credential Footer Card */}
        <div className="p-3 border-t border-white/10 bg-slate-950/60 space-y-2.5 shrink-0">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simulated Demo Session</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 font-bold">
                {currentCredential.maskedCredential}
              </span>
            </div>

            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {inchargeSession?.inchargeName || currentCredential.inchargeName}
              </div>
              <div className="text-[10px] text-teal-200/75 truncate">
                {selectedPHC.name} · {selectedPHC.district}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => openAuthModal('directory')}
                className="px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[10px] font-bold text-teal-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="Open PHC Incharge Directory (Simulated Demo Accounts)"
              >
                <KeyRound className="w-3 h-3" />
                <span>Directory</span>
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('signup', selectedPHC)}
                className="px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[10px] font-bold text-emerald-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="Configure Demo Profile"
              >
                <UserPlus className="w-3 h-3" />
                <span>Configure</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              signOutIncharge();
              showNotification('Signed out of PHC Incharge session.');
            }}
            className="w-full py-1.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/25 text-rose-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock PHC / Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
