import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  UserCheck,
  Wifi,
  WifiOff,
  Bell,
  Menu,
  LogOut,
  Download,
  AlertTriangle,
  Plus,
  CheckCheck,
  ArrowRight,
  X
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
    activeModule,
    setActiveModule,
    toggleMobileSidebar,
    currentUser,
    isAuthLoading,
    signInWithGoogle,
    signOutUser,
    proactiveStockAlerts,
    markProactiveAlertRead,
    dismissAllProactiveAlerts,
    createOrder
  } = useApp();

  const [isBellOpen, setIsBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setIsBellOpen(false);
      }
    };
    if (isBellOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isBellOpen]);

  const unreadStockAlertCount = proactiveStockAlerts.filter((a) => !a.read).length;
  const activeAlertCount = alerts.filter(
    (a) => a.status === 'ACTIVE' && (a.category === 'CRITICAL' || a.category === 'WARNING')
  ).length;
  const badgeCount = Math.max(unreadStockAlertCount, activeAlertCount);

  const quickNavLinks = [
    { id: 'home', label: 'Dashboard' },
    { id: 'directory', label: 'PHCs & Medicines List' },
    { id: 'map', label: 'All-India PHC Map' },
    { id: 'medicine', label: 'Medicine Stock' },
    { id: 'preparedness', label: 'Outbreak Surge AI' },
    { id: 'orders', label: 'Orders & Transfers' },
    { id: 'agents', label: 'AI Agents & Solver' }
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shrink-0">
      {/* Zone 1: Brand / Facility Selector */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          id="mobile-menu-toggle"
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:outline-none cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:border-slate-300 transition-colors">
          <Building2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          <label htmlFor="facility-selector" className="sr-only">
            Select Health Facility
          </label>
          <select
            id="facility-selector"
            value={selectedPHC.id}
            onChange={(e) => {
              const found = facilities.find((f) => f.id === e.target.value);
              if (found) setSelectedPHC(found);
            }}
            className="bg-transparent font-semibold text-slate-900 text-xs focus:outline-none cursor-pointer truncate max-w-[160px] sm:max-w-[240px]"
          >
            {facilities.map((fac) => (
              <option key={fac.id} value={fac.id}>
                {fac.name} · {fac.block} ({fac.activeBeds} Beds)
              </option>
            ))}
          </select>
        </div>

        <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white">
          <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
          <label htmlFor="role-selector" className="sr-only">
            Select Officer Role
          </label>
          <select
            id="role-selector"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="bg-transparent font-medium text-slate-700 text-xs focus:outline-none cursor-pointer"
          >
            <option value="phc_worker">Pharmacist / Worker</option>
            <option value="medical_officer">Medical Officer</option>
            <option value="district_admin">District Admin</option>
            <option value="state_admin">State Admin</option>
          </select>
        </div>
      </div>

      {/* Zone 2: Clean 1-Line Quick Navigation Links */}
      <nav
        aria-label="Quick Switching"
        className="hidden xl:flex items-center gap-5 text-xs font-medium text-slate-600"
      >
        {quickNavLinks.map((link) => {
          const isCurrent = activeModule === link.id;
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => setActiveModule(link.id)}
              className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
                isCurrent
                  ? 'border-emerald-600 text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Primary Operational Actions & Stock Threshold Notification Bell */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setActiveModule('analytics')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
          title="Download Monthly PDF & CSV Reports"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Export PDF / CSV</span>
        </button>

        <button
          type="button"
          id="toggle-offline-mode"
          onClick={toggleOfflineMode}
          aria-pressed={isOfflineMode}
          title={
            isOfflineMode
              ? 'Working Offline: Changes are saved on this device and will sync automatically'
              : 'Connected Online'
          }
          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
            isOfflineMode
              ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {isOfflineMode ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-700 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline">Offline Mode</span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline">Online</span>
            </>
          )}
        </button>

        {/* Proactive Critical Stock Threshold Notification Bell & Dropdown */}
        <div className="relative" ref={bellRef}>
          <button
            type="button"
            id="topbar-alerts-btn"
            onClick={() => setIsBellOpen((prev) => !prev)}
            className={`relative p-2 rounded-lg border transition-colors cursor-pointer ${
              isBellOpen
                ? 'border-slate-900 bg-slate-900 text-white'
                : proactiveStockAlerts.some((a) => a.severity === 'CRITICAL' && !a.read)
                ? 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
            }`}
            aria-label={`Stock Threshold Notifications (${badgeCount} active)`}
            aria-expanded={isBellOpen}
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            {badgeCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-bold font-mono tabular-nums rounded-full flex items-center justify-center ring-2 ring-white">
                {badgeCount}
              </span>
            )}
          </button>

          {isBellOpen && (
            <div
              role="dialog"
              aria-label="Stock Threshold Notifications"
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl border border-slate-200 shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
                    Stock Threshold Monitor · {selectedPHC.code}
                  </div>
                  <div className="text-xs font-bold mt-0.5">
                    Low-Stock Medicine Alerts ({proactiveStockAlerts.length})
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {proactiveStockAlerts.some((a) => !a.read) && (
                    <button
                      type="button"
                      onClick={dismissAllProactiveAlerts}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-200 flex items-center gap-1 cursor-pointer"
                      title="Mark all notifications as read"
                    >
                      <CheckCheck className="w-3 h-3 text-emerald-400" />
                      <span>Read All</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsBellOpen(false)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                    aria-label="Close notifications"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {proactiveStockAlerts.length === 0 ? (
                  <div className="p-5 text-center space-y-1.5">
                    <div className="text-xs font-bold text-slate-800">
                      All Critical Medicines Above Threshold
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Every tracked medicine at {selectedPHC.name} currently meets its minimum safety buffer.
                    </p>
                  </div>
                ) : (
                  proactiveStockAlerts.map((item) => {
                    const isCrit = item.severity === 'CRITICAL';
                    const pctOfThreshold = Math.min(
                      100,
                      Math.round((item.currentStock / Math.max(1, item.thresholdLevel)) * 100)
                    );
                    const reorderQty = Math.max(200, item.thresholdLevel * 2 - item.currentStock);

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 transition-colors space-y-2 ${
                          !item.read ? 'bg-rose-50/40' : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            <AlertTriangle
                              className={`w-4 h-4 shrink-0 mt-0.5 ${
                                isCrit ? 'text-rose-600' : 'text-amber-600'
                              }`}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">
                                {item.medicineName}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                Stock:{' '}
                                <strong className={isCrit ? 'text-rose-700' : 'text-amber-700'}>
                                  {item.currentStock.toLocaleString()} {item.unit}
                                </strong>{' '}
                                / Min: {item.thresholdLevel.toLocaleString()} {item.unit}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-mono font-bold shrink-0 ${
                              isCrit ? 'text-rose-700' : 'text-amber-700'
                            }`}
                          >
                            {item.projectedStockoutDays}d left
                          </span>
                        </div>

                        {/* Stock vs Threshold Progress Bar */}
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              isCrit ? 'bg-rose-600' : 'bg-amber-500'
                            }`}
                            style={{ width: `${pctOfThreshold}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-[10px] font-mono text-slate-400">
                            {item.timestamp} · {pctOfThreshold}% of threshold
                          </span>

                          <div className="flex items-center gap-1.5">
                            {!item.read && (
                              <button
                                type="button"
                                onClick={() => markProactiveAlertRead(item.id)}
                                className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-[10px] font-semibold text-slate-600 cursor-pointer"
                              >
                                Dismiss
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                createOrder({
                                  medicineName: item.medicineName,
                                  quantityRequested: reorderQty,
                                  priority: isCrit ? 'EMERGENCY_REPLENISHMENT' : 'URGENT',
                                  justification: `Threshold breach restock: stock (${item.currentStock} ${item.unit}) fell below facility threshold (${item.thresholdLevel} ${item.unit}).`
                                });
                                markProactiveAlertRead(item.id);
                              }}
                              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3 text-emerald-400" />
                              <span>Order +{reorderQty}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsBellOpen(false);
                    setActiveModule('alerts');
                  }}
                  className="w-full py-1.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Manage Stock Thresholds & All Alerts</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {currentUser ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName || 'Signed in user'}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full ring-1 ring-slate-200"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">
                {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={signOutUser}
              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={isAuthLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 transition-colors whitespace-nowrap cursor-pointer"
            title="Sign in with Google"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="hidden sm:inline">Sign in</span>
          </button>
        )}
      </div>
    </header>
  );
};
