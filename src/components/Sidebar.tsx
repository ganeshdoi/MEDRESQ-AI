import React from 'react';
import {
  LayoutDashboard,
  Pill,
  ScanLine,
  Mic,
  BedDouble,
  Users,
  CloudSun,
  Truck,
  AlertTriangle,
  BarChart3,
  PlugZap,
  Settings,
  Activity,
  ChevronRight,
  X,
  ShieldCheck,
  Building,
  Clock,
  MapPin
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

interface SidebarItem {
  id: string;
  name: string;
  shortName?: string;
  icon: React.ElementType;
  badge?: number;
  badgeColor?: string;
}

interface NavGroup {
  groupTitle: string;
  items: SidebarItem[];
}

export const Sidebar: React.FC = () => {
  const {
    activeModule,
    setActiveModule,
    alerts,
    orders,
    role,
    selectedPHC,
    mobileSidebarOpen,
    setMobileSidebarOpen
  } = useApp();

  const activeAlertsCount = alerts.filter(a => a.status === 'ACTIVE').length;
  const pendingOrdersCount = orders.filter(
    o => o.status === 'APPROVAL PENDING' || o.status === 'REQUESTED'
  ).length;

  const navGroups: NavGroup[] = [
    {
      groupTitle: 'Command & Overview',
      items: [
        { id: 'home', name: 'Operational Command', icon: LayoutDashboard }
      ]
    },
    {
      groupTitle: 'Clinical Supply & Data',
      items: [
        { id: 'medicine', name: 'Medicine Intelligence', icon: Pill },
        { id: 'records', name: 'Physical Register OCR', icon: ScanLine },
        { id: 'voice', name: 'Multilingual Voice Entry', icon: Mic }
      ]
    },
    {
      groupTitle: 'Capacity & Workforce',
      items: [
        { id: 'capacity', name: 'Facility Bed Capacity', icon: BedDouble },
        { id: 'workforce', name: 'Workforce Roster', icon: Users },
        {
          id: 'preparedness',
          name: 'Seasonal Preparedness',
          icon: CloudSun,
          badge: 1,
          badgeColor: 'bg-amber-600'
        }
      ]
    },
    {
      groupTitle: 'Logistics & Surveillance',
      items: [
        {
          id: 'map',
          name: 'Map & Network',
          icon: MapPin,
          badge: 3,
          badgeColor: 'bg-emerald-600'
        },
        {
          id: 'orders',
          name: 'Indent Supply Chain',
          icon: Truck,
          badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
          badgeColor: 'bg-blue-600'
        },
        {
          id: 'alerts',
          name: 'Incident Alerts',
          icon: AlertTriangle,
          badge: activeAlertsCount > 0 ? activeAlertsCount : undefined,
          badgeColor: 'bg-rose-600'
        },
        { id: 'analytics', name: 'District Reports & Audit', icon: BarChart3 }
      ]
    },
    {
      groupTitle: 'Governance & Administration',
      items: [
        { id: 'integrations', name: 'GovData Integrations', icon: PlugZap },
        { id: 'settings', name: 'Facility Parameters', icon: Settings }
      ]
    }
  ];

  const roleNameMap: Record<string, string> = {
    phc_worker: 'Health Worker / Pharmacist',
    medical_officer: 'Medical Officer In-Charge',
    district_admin: 'District Health Admin',
    state_admin: 'State Health Admin'
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 z-40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        id="app-sidebar"
        aria-label="Main Navigation"
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-100 flex flex-col shrink-0 border-r border-slate-800 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Tricolor National/State Official Accent Ribbon */}
        <div className="h-1 w-full flex shrink-0">
          <div className="h-full flex-1 bg-amber-500" />
          <div className="h-full flex-1 bg-white" />
          <div className="h-full flex-1 bg-emerald-600" />
        </div>

        {/* Institutional Government Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-xs shadow-emerald-950/80 ring-1 ring-white/10 shrink-0">
                <Activity className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest font-semibold text-emerald-400 leading-tight">
                  Govt of Rajasthan • NHM
                </div>
                <div className="font-bold text-slate-50 tracking-tight text-sm leading-snug">
                  PHC Intelligence Grid
                </div>
                <div className="text-[10px] text-slate-400 font-mono tracking-tight truncate mt-0.5">
                  NIN: {selectedPHC.code}
                </div>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label="Close navigation sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Operational Pipeline Strip */}
          <div className="mt-3 py-1 px-2 rounded-md bg-slate-900/90 border border-slate-800 text-[10px] text-slate-300 flex items-center justify-between font-mono">
            <span className="text-emerald-400 font-bold">CAPTURE</span>
            <span className="text-slate-600">→</span>
            <span className="text-sky-400 font-bold">PREDICT</span>
            <span className="text-slate-600">→</span>
            <span className="text-amber-400 font-bold">ACT</span>
          </div>
        </div>

        {/* Navigation Group Links */}
        <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto custom-scrollbar">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {group.groupTitle}
              </div>
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    type="button"
                    onClick={() => setActiveModule(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-950 font-bold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-white'
                            : 'text-slate-400 group-hover:text-emerald-300'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full text-white ${
                            item.badgeColor || 'bg-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {isActive && (
                        <ChevronRight className="w-3.5 h-3.5 text-emerald-200" aria-hidden="true" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Facility Context & Officer Authorization Card */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 shrink-0 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-emerald-900/60 border border-emerald-700/60 flex items-center justify-center text-[11px] text-emerald-300 font-bold font-mono shrink-0">
              {role === 'phc_worker' && 'PW'}
              {role === 'medical_officer' && 'MO'}
              {role === 'district_admin' && 'DA'}
              {role === 'state_admin' && 'SA'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-slate-200 truncate">
                {roleNameMap[role] || role}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {selectedPHC.name}
              </div>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Grid Node Active
            </span>
            <span className="font-mono text-slate-500">v2.4 LTS</span>
          </div>
        </div>
      </aside>
    </>
  );
};
