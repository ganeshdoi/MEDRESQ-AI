import React from 'react';
import {
  LayoutDashboard,
  Pill,
  ScanLine,
  Mic,
  BedDouble,
  CloudSun,
  Truck,
  AlertTriangle,
  BarChart3,
  Activity,
  X,
  MapPin,
  Building2,
  MessageSquare,
  Bot
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

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
    role,
    selectedPHC,
    mobileSidebarOpen,
    setMobileSidebarOpen
  } = useApp();

  const activeAlertsCount = alerts.filter((a) => a.status === 'ACTIVE').length;
  const criticalMedsCount = medicines.filter((m) => m.stockoutRisk === 'CRITICAL').length;
  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'APPROVAL PENDING' || o.status === 'REQUESTED' || o.status === 'IN TRANSIT'
  ).length;

  // Clear, easy-to-use PHC modules
  const coreModules: SidebarItem[] = [
    {
      id: 'home',
      name: 'Home Dashboard',
      subtitle: 'Quick dispense, cases & status',
      icon: LayoutDashboard
    },
    {
      id: 'directory',
      name: 'PHCs & Medicines List',
      subtitle: 'All-India PHCs & 51 NLEM drugs',
      icon: Building2
    },
    {
      id: 'agents',
      name: 'AI Agents & BRICS Hub',
      subtitle: '5 working agents, Triage & EOQ',
      icon: Bot,
      count: 5,
      badgeColor: 'emerald'
    },
    {
      id: 'map',
      name: 'All-India PHC Map',
      subtitle: '53 facilities & driving routes',
      icon: MapPin
    },
    {
      id: 'medicine',
      name: 'Medicine Stock',
      subtitle: 'Inventory, expiry & reorders',
      icon: Pill,
      count: criticalMedsCount > 0 ? criticalMedsCount : undefined,
      badgeColor: 'rose'
    },
    {
      id: 'preparedness',
      name: 'Outbreak & Surge AI',
      subtitle: 'ML + Gemini surge alerts',
      icon: CloudSun
    },
    {
      id: 'orders',
      name: 'Orders & Transfers',
      subtitle: 'Warehouse orders & sharing',
      icon: Truck,
      count: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
      badgeColor: 'amber'
    },
    {
      id: 'capacity',
      name: 'Beds & 108 Referrals',
      subtitle: 'Ward beds & ambulance slips',
      icon: BedDouble
    },
    {
      id: 'chat',
      name: 'Ask Medical AI',
      subtitle: 'Gemini clinical & stock assistant',
      icon: MessageSquare
    },
    {
      id: 'voice',
      name: 'Voice Stock Entry',
      subtitle: 'Speak in Hindi or English',
      icon: Mic
    },
    {
      id: 'records',
      name: 'Scan Register (OCR)',
      subtitle: 'Photo to digital stock',
      icon: ScanLine
    },
    {
      id: 'alerts',
      name: 'Alerts & Offline Sync',
      subtitle: 'Low-stock rules & sync queue',
      icon: AlertTriangle,
      count: activeAlertsCount > 0 ? activeAlertsCount : undefined,
      badgeColor: 'rose'
    },
    {
      id: 'analytics',
      name: 'Reports (PDF / CSV)',
      subtitle: 'Download monthly summaries',
      icon: BarChart3
    }
  ];

  const roleNameMap: Record<string, string> = {
    phc_worker: 'Pharmacist / Health Worker',
    medical_officer: 'Medical Officer In-Charge',
    district_admin: 'District Health Admin',
    state_admin: 'State Health Admin'
  };

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

      {/* Main Sidebar */}
      <aside
        id="app-sidebar"
        aria-label="Main Navigation"
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 border-r border-slate-800 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => handleSelectModule('home')}
            className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-white tracking-tight text-sm block leading-none">
                PHC OPERATIONS
              </span>
              <span className="text-[11px] text-slate-400 truncate block mt-1 leading-none">
                {selectedPHC.name}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            aria-label="Close navigation sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Content */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar-dark">
          <div className="px-2.5 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Ground-Level PHC Modules
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
                className={`w-full flex items-center justify-between px-2.5 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-emerald-400'
                    }`}
                    aria-hidden="true"
                  />
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
                        isActive ? 'text-emerald-100' : 'text-slate-400'
                      }`}
                    >
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`text-[11px] font-mono tabular-nums font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      isActive
                        ? 'bg-emerald-800 text-white'
                        : item.badgeColor === 'rose'
                        ? 'bg-rose-600 text-white'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Active Officer & Facility Duty Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] text-emerald-400 font-bold font-mono shrink-0">
              {role === 'phc_worker' && 'PW'}
              {role === 'medical_officer' && 'MO'}
              {role === 'district_admin' && 'DA'}
              {role === 'state_admin' && 'SA'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-slate-200 truncate">
                {roleNameMap[role] || role}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {selectedPHC.medicalOfficerInCharge} · {selectedPHC.block}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
