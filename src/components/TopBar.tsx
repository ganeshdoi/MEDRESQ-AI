import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  X,
  Search,
  ChevronDown,
  Pill,
  Truck,
  MapPin,
  LayoutDashboard,
  CheckCircle2,
  BookOpen,
  KeyRound,
  Lock,
  Unlock,
  ShieldCheck,
  UserPlus,
  HelpCircle,
  RefreshCw,
  Globe,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { SUPPORTED_LANGUAGES, type SupportedLanguageCode } from '../i18n/index.ts';
import { Role, PHCFacility } from '../types.ts';
import { evaluateMedicineThresholdAndReplenishment } from '../utils/inventoryForecast.ts';
import { getPHCInchargeCredential, AuthenticatedInchargeSession } from '../utils/phcAuthDirectory.ts';
import {
  runGlobalPortalSearch,
  matchesSearchKeywords,
  GlobalSearchResultCategory,
  GlobalSearchResultItem
} from '../utils/globalSearch.ts';
import {
  getDatasetFacilityMetrics,
  getCanonicalAlertMetrics
} from '../utils/datasetMetrics.ts';

export const TopBar: React.FC = () => {
  const {
    selectedPHC,
    setSelectedPHC,
    facilities,
    role,
    setRole,
    isOfflineMode,
    toggleOfflineMode,
    offlineQueue,
    isQueueSyncing,
    alerts,
    orders,
    redistributions,
    setActiveModule,
    toggleMobileSidebar,
    currentUser,
    isAuthLoading,
    signInWithGoogle,
    signOutUser,
    medicines,
    proactiveStockAlerts,
    markProactiveAlertRead,
    dismissAllProactiveAlerts,
    createOrder,
    showNotification,
    inchargeSession,
    openAuthModal,
    authenticatePHCIncharge,
    signOutIncharge,
    isGeminiAssistantOpen,
    toggleGeminiAssistant,
    language,
    setLanguage,
    t
  } = useApp();

  // Notification Bell state
  const [isBellOpen, setIsBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Quick Help Guide state
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  // Searchable PHC Facility Picker state
  const [isPhcPickerOpen, setIsPhcPickerOpen] = useState(false);
  const [phcSearchQuery, setPhcSearchQuery] = useState('');
  const [phcScopeFilter, setPhcScopeFilter] = useState<'ALL' | 'RAJASTHAN' | '24X7' | 'CHC'>('ALL');
  const phcPickerRef = useRef<HTMLDivElement>(null);
  const phcSearchInputRef = useRef<HTMLInputElement>(null);

  // Global Multi-Keyword Search state
  const [globalQuery, setGlobalQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchCategory, setSearchCategory] = useState<'ALL' | GlobalSearchResultCategory>('ALL');
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const globalSearchInputRef = useRef<HTMLInputElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setIsBellOpen(false);
      }
      if (phcPickerRef.current && !phcPickerRef.current.contains(e.target as Node)) {
        setIsPhcPickerOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setIsHelpOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K or '/' to focus global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        setIsPhcPickerOpen(false);
        setIsBellOpen(false);
        globalSearchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsPhcPickerOpen(false);
        setIsBellOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus PHC search input when PHC picker opens
  useEffect(() => {
    if (isPhcPickerOpen) {
      setTimeout(() => phcSearchInputRef.current?.focus(), 40);
    }
  }, [isPhcPickerOpen]);

  // Filtered PHCs for the PHC Selection Tool
  const filteredFacilities = useMemo(() => {
    return facilities.filter((fac) => {
      if (phcScopeFilter === 'RAJASTHAN' && fac.state !== 'Rajasthan') return false;
      if (phcScopeFilter === '24X7' && !fac.type.toLowerCase().includes('24x7')) return false;
      if (phcScopeFilter === 'CHC' && !fac.type.toLowerCase().includes('chc')) return false;

      if (!phcSearchQuery.trim()) return true;
      return matchesSearchKeywords(
        phcSearchQuery,
        fac.name,
        fac.code,
        fac.block,
        fac.district,
        fac.state,
        fac.type,
        fac.medicalOfficerInCharge
      );
    });
  }, [facilities, phcScopeFilter, phcSearchQuery]);

  // Global search results across all keywords and entities
  const searchResults = useMemo(() => {
    return runGlobalPortalSearch({
      query: globalQuery,
      medicines,
      facilities,
      alerts,
      orders,
      redistributions,
      selectedPHC,
      categoryFilter: searchCategory
    });
  }, [globalQuery, medicines, facilities, alerts, orders, redistributions, selectedPHC, searchCategory]);

  const handleSelectSearchResult = (item: GlobalSearchResultItem) => {
    if (item.phcToSelect && item.phcToSelect.id !== selectedPHC.id) {
      setActiveModule('map');
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('medresq:global-search', {
            detail: {
              query: item.phcToSelect!.name,
              category: item.category,
              phcId: item.phcToSelect!.id
            }
          })
        );
      }, 60);
      showNotification(
        `Inspecting peer facility ${item.phcToSelect.name} on Network Stock Map (Active session remains bound to ${selectedPHC.name}).`
      );
      setIsSearchOpen(false);
      return;
    }
    setActiveModule(item.targetModule);

    if (item.searchKeywordToPass) {
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('medresq:global-search', {
            detail: {
              query: item.searchKeywordToPass,
              category: item.category,
              medicineId: item.medicineItem?.id,
              phcId: item.phcToSelect?.id
            }
          })
        );
      }, 60);
    }
    setIsSearchOpen(false);
  };

  const handleSearchFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleSelectSearchResult(searchResults[0]);
    }
  };

  const canonicalAlertMetrics = getCanonicalAlertMetrics(alerts, proactiveStockAlerts);
  const unreadStockAlertCount = canonicalAlertMetrics.unreadLowStockNotifications;
  const activeAlertCount = canonicalAlertMetrics.activeSystemAlertsCount;
  const badgeCount = unreadStockAlertCount > 0 ? unreadStockAlertCount : canonicalAlertMetrics.totalLowStockNotifications;

  const getCategoryIcon = (cat: GlobalSearchResultCategory) => {
    switch (cat) {
      case 'MEDICINE':
        return <Pill className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'PHC_FACILITY':
        return <Building2 className="w-4 h-4 text-sky-600 shrink-0" />;
      case 'ALERT':
        return <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />;
      case 'ORDER_TRANSFER':
        return <Truck className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'NLEM_CATALOGUE':
        return <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />;
      case 'MODULE':
      default:
        return <LayoutDashboard className="w-4 h-4 text-slate-600 shrink-0" />;
    }
  };

  const quickKeywords = [
    'ORS',
    'Anti-Snake Venom',
    'Critical',
    'Pokhran',
    'Paracetamol',
    'Cold Chain',
    'Threshold',
    'Transfer'
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-5 lg:px-6 flex items-center justify-between gap-2.5 sm:gap-4 sticky top-0 z-30 shrink-0">
      {/* Zone 1: Mobile Menu Toggle + Searchable PHC Selection Tool + Role Selector */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
        <button
          type="button"
          id="mobile-menu-toggle"
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:outline-none cursor-pointer shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Bound Assigned PHC Facility Indicator (Read-Only — Bound to Officer Session) */}
        <div
          id="assigned-facility-badge"
          className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-left"
          title={`Assigned Facility: ${selectedPHC.name} (${selectedPHC.code}) — Bound to Officer ${
            inchargeSession?.officerId || getPHCInchargeCredential(selectedPHC).officerId
          }`}
        >
          <Building2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          <div className="min-w-0 max-w-[155px] sm:max-w-[210px] xl:max-w-[250px]">
            <div className="font-bold text-slate-900 text-xs truncate leading-tight flex items-center gap-1.5">
              <span className="truncate">{selectedPHC.name}</span>
              <span className="font-mono text-[10px] text-emerald-700 shrink-0 hidden md:inline">
                ({selectedPHC.code})
              </span>
            </div>
            <div className="text-[10px] text-slate-500 truncate leading-tight hidden sm:block">
              {selectedPHC.block} · {selectedPHC.district}, {selectedPHC.state}
            </div>
          </div>
          <Lock className="w-3 h-3 text-teal-600 shrink-0" aria-label="Bound to authenticated session" />
        </div>

        {/* Officer Role Selector (Desktop) */}
        <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white shrink-0">
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

      {/* Zone 2: Effective Global Multi-Keyword Search Bar */}
      <div
        ref={searchContainerRef}
        className="flex-1 max-w-xl min-w-[140px] relative"
      >
        <form onSubmit={handleSearchFormSubmit} className="relative">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={globalSearchInputRef}
            id="global-portal-search"
            type="text"
            value={globalQuery}
            onFocus={() => {
              setIsSearchOpen(true);
              setIsPhcPickerOpen(false);
              setIsBellOpen(false);
            }}
            onChange={(e) => {
              setGlobalQuery(e.target.value);
              if (!isSearchOpen) setIsSearchOpen(true);
            }}
            placeholder="Search medicines, PHCs, batches, alerts, orders, NLEM codes (Ctrl+K)..."
            aria-label="Global search across medicines, PHCs, alerts, orders, and modules"
            className="w-full pl-9 pr-16 py-2 rounded-lg border border-slate-200 bg-slate-50/90 hover:bg-white focus:bg-white text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {globalQuery ? (
              <button
                type="button"
                onClick={() => {
                  setGlobalQuery('');
                  globalSearchInputRef.current?.focus();
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                aria-label="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded">
                Ctrl+K
              </kbd>
            )}
          </div>
        </form>

        {/* Global Search Results Dropdown */}
        {isSearchOpen && (
          <div
            role="dialog"
            aria-label="Global Search Results"
            className="absolute left-0 right-0 sm:left-0 sm:w-[540px] lg:w-[600px] max-w-[calc(100vw-1.5rem)] top-full mt-2 bg-white rounded-xl border border-slate-200 shadow-2xl z-50 overflow-hidden"
          >
            {/* Category Filter Strip */}
            <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex flex-wrap items-center gap-1 text-[11px] font-semibold">
                {(
                  [
                    { id: 'ALL', label: 'All Results' },
                    { id: 'MEDICINE', label: 'Medicines & Batches' },
                    { id: 'PHC_FACILITY', label: 'PHCs & Facilities' },
                    { id: 'ALERT', label: 'Alerts' },
                    { id: 'ORDER_TRANSFER', label: 'Orders & Transfers' },
                    { id: 'NLEM_CATALOGUE', label: 'NLEM 2022' },
                    { id: 'MODULE', label: 'Modules' }
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSearchCategory(tab.id)}
                    className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                      searchCategory === tab.id
                        ? 'bg-slate-900 text-white font-bold'
                        : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Suggested Quick Keywords when query is empty */}
            {!globalQuery.trim() && (
              <div className="px-3.5 py-2 bg-white border-b border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-slate-400 font-mono text-[10px]">Try keywords:</span>
                {quickKeywords.map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => setGlobalQuery(kw)}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 font-medium transition-colors cursor-pointer"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            )}

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
              {searchResults.length === 0 ? (
                <div className="p-6 text-center space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    No matching records found for "{globalQuery}"
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Try searching by drug name (e.g. ORS, Paracetamol, ASV), batch number, PHC name (e.g. Osian, Pokhran), district, or order ID.
                  </p>
                  {searchCategory !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setSearchCategory('ALL')}
                      className="px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                    >
                      Search All Categories
                    </button>
                  )}
                </div>
              ) : (
                searchResults.map((item) => {
                  const ev = item.medicineItem
                    ? evaluateMedicineThresholdAndReplenishment(item.medicineItem)
                    : null;

                  return (
                    <div
                      key={item.id}
                      className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectSearchResult(item)}
                        className="flex items-start gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 border border-slate-200/80 shrink-0">
                          {getCategoryIcon(item.category)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {item.title}
                            </span>
                            {item.badgeText && (
                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                  item.badgeTone === 'critical'
                                    ? 'bg-rose-100 text-rose-800'
                                    : item.badgeTone === 'warning'
                                    ? 'bg-amber-100 text-amber-800'
                                    : item.badgeTone === 'normal'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : item.badgeTone === 'surplus'
                                    ? 'bg-sky-100 text-sky-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {item.badgeText}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {item.subtitle}
                          </div>
                        </div>
                      </button>

                      {/* Direct Action Shortcuts on Medicine & Facility Search Results */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.medicineItem && ev && (
                          <button
                            type="button"
                            onClick={() => {
                              createOrder({
                                medicineName: item.medicineItem!.name,
                                quantityRequested: ev.recommendedOrderQty,
                                priority: ev.recommendedPriority,
                                justification: `Quick order from Global Search (${ev.breachRuleTitle}).`
                              });
                              setIsSearchOpen(false);
                            }}
                            className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            title={`Order +${ev.recommendedOrderQty} ${item.medicineItem.unit}`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Order +{ev.recommendedOrderQty}</span>
                          </button>
                        )}

                        {item.phcToSelect && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveModule('map');
                              setTimeout(() => {
                                window.dispatchEvent(
                                  new CustomEvent('medresq:global-search', {
                                    detail: {
                                      query: item.phcToSelect!.name,
                                      phcId: item.phcToSelect!.id
                                    }
                                  })
                                );
                              }, 60);
                              setIsSearchOpen(false);
                              showNotification(`Focused Network Stock Map on ${item.phcToSelect!.name}.`);
                            }}
                            className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                            title="Inspect facility on Network Stock Map"
                          >
                            <MapPin className="w-3 h-3 text-sky-600" />
                            <span>Map</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSelectSearchResult(item)}
                          className="p-1.5 rounded hover:bg-slate-200/70 text-slate-500 hover:text-slate-900 cursor-pointer"
                          title="Open"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>
                {globalQuery.trim()
                  ? `${searchResults.length} match(es) across PHC inventory, facilities & alerts`
                  : 'Type any keyword or multi-word query (e.g. "ors osian", "critical", "pokhran")'}
              </span>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="text-slate-600 hover:text-slate-900 font-sans font-semibold cursor-pointer"
              >
                Close (Esc)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Zone 3: Primary Operational Actions & Stock Threshold Notification Bell */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setActiveModule('analytics')}
          className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
          title="Download Monthly PDF & CSV Reports"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Export PDF / CSV</span>
        </button>

        {(() => {
          const failedRetryCount = offlineQueue.filter(
            (item) => item.status === 'FAILED_RETRY' || item.retryCount > 0
          ).length;
          const pendingSyncCount = offlineQueue.filter(
            (item) => item.status !== 'SYNCED'
          ).length;

          return (
            <div className="flex items-center gap-1">
              <button
                type="button"
                id="toggle-offline-mode"
                onClick={toggleOfflineMode}
                aria-pressed={isOfflineMode}
                title={
                  isOfflineMode
                    ? 'Offline: Actions are queued locally and will sync when online'
                    : isQueueSyncing
                    ? 'Syncing: Uploading queued records to cloud'
                    : failedRetryCount > 0
                    ? `Online (${failedRetryCount} failed item(s) requiring retry)`
                    : 'Online: Connected to cloud & local ledger'
                }
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                  isOfflineMode
                    ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                    : isQueueSyncing
                    ? 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100'
                    : failedRetryCount > 0
                    ? 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {isOfflineMode ? (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-700 shrink-0" aria-hidden="true" />
                    <span className="hidden md:inline font-semibold">
                      Offline{pendingSyncCount > 0 ? ` (${pendingSyncCount} Queued)` : ''}
                    </span>
                  </>
                ) : isQueueSyncing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" aria-hidden="true" />
                    <span className="hidden md:inline font-semibold">Syncing...</span>
                  </>
                ) : failedRetryCount > 0 ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" aria-hidden="true" />
                    <span className="hidden md:inline font-semibold">
                      Online · {failedRetryCount} Retry Needed
                    </span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                    <span className="hidden md:inline">Online</span>
                  </>
                )}
              </button>
              {(failedRetryCount > 0 || pendingSyncCount > 0) && (
                <button
                  type="button"
                  onClick={() => setActiveModule('offline-queue')}
                  title="Open Offline Sync Queue to inspect or retry items"
                  className={`px-2 py-2 rounded-lg text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
                    failedRetryCount > 0
                      ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700'
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                  }`}
                >
                  {failedRetryCount > 0 ? `Retry (${failedRetryCount})` : `Queue (${pendingSyncCount})`}
                </button>
              )}
            </div>
          );
        })()}

        {/* Proactive Critical Stock Threshold Notification Bell & Dropdown */}
        <div className="relative" ref={bellRef}>
          <button
            type="button"
            id="topbar-alerts-btn"
            onClick={() => {
              setIsBellOpen((prev) => !prev);
              setIsPhcPickerOpen(false);
              setIsSearchOpen(false);
            }}
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
                    Low-Stock Threshold Notifications ({canonicalAlertMetrics.totalLowStockNotifications} Total · {canonicalAlertMetrics.unreadLowStockNotifications} Unread)
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {canonicalAlertMetrics.criticalLowStockNotifications} Critical · {canonicalAlertMetrics.warningLowStockNotifications} Warning · {activeAlertCount} Active System Alerts
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
                    const matchedMed = medicines.find((m) => m.id === item.medicineId);
                    const ev = matchedMed
                      ? evaluateMedicineThresholdAndReplenishment(matchedMed)
                      : null;
                    const reorderQty = ev
                      ? ev.recommendedOrderQty
                      : Math.max(25, item.thresholdLevel * 2 - item.currentStock);
                    const isCovered = ev?.isCoveredByPendingOrder || false;

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
                                  justification: `Threshold breach restock (${ev?.breachRuleTitle || 'Safety threshold breach'}): usable stock (${item.currentStock} ${item.unit}) vs facility threshold (${item.thresholdLevel} ${item.unit}).`
                                });
                                markProactiveAlertRead(item.id);
                              }}
                              className={`px-2.5 py-1 rounded text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer ${
                                isCovered
                                  ? 'bg-emerald-800 hover:bg-emerald-700'
                                  : 'bg-slate-900 hover:bg-slate-800'
                              }`}
                            >
                              <Plus className="w-3 h-3 text-emerald-400" />
                              <span>
                                {isCovered
                                  ? `In Pipeline (+${ev?.pendingOrders}) · +${reorderQty}`
                                  : `Order +${reorderQty}`}
                              </span>
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

        {/* PHC Incharge Passwords & Friendly Quick Guide Controls */}
        <div className="relative" ref={helpRef}>
          <button
            type="button"
            onClick={() => {
              setIsHelpOpen((prev) => !prev);
              setIsBellOpen(false);
              setIsPhcPickerOpen(false);
              setIsSearchOpen(false);
            }}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 transition-colors whitespace-nowrap cursor-pointer"
            title="Friendly Quick Guide: How to use MEDRESQ"
          >
            <HelpCircle className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span>Quick Guide</span>
          </button>

          {isHelpOpen && (
            <div
              role="dialog"
              aria-label="Friendly Quick Guide"
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-3.5 bg-linear-to-r from-teal-900 to-emerald-900 text-white flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 font-bold">
                    Easy Reference Guide
                  </div>
                  <div className="text-xs font-bold mt-0.5">
                    How to Use Your PHC Portal in 4 Simple Steps
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHelpOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/15 text-emerald-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3.5 space-y-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModule('medicine');
                    setIsHelpOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 text-left transition-all cursor-pointer flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-slate-900">1. Check Medicine Stock &amp; FEFO Batches</div>
                    <div className="text-[11px] text-slate-500">Dispense earliest-expiring batches &amp; set min thresholds.</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-teal-600 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveModule('preparedness');
                    setIsHelpOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 text-left transition-all cursor-pointer flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-slate-900">2. District &amp; Season Surge Forecast</div>
                    <div className="text-[11px] text-slate-500">Compare Heatwave, Monsoon, Scrub Typhus &amp; Winter surges.</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-teal-600 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveModule('orders');
                    setIsHelpOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 text-left transition-all cursor-pointer flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-slate-900">3. Place Warehouse Orders &amp; Peer Transfers</div>
                    <div className="text-[11px] text-slate-500">Restock low drugs or share surplus with nearby PHCs.</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-teal-600 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsHelpOpen(false);
                    setActiveModule('records');
                  }}
                  className="w-full p-2.5 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100/70 text-left transition-all cursor-pointer flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-teal-950">
                      4. Register Scan (OCR) &amp; Audit Reports
                    </div>
                    <div className="text-[11px] text-teal-800">Verify stock book entries &amp; export monthly PDF/CSV reports.</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-teal-700 shrink-0" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Top-Right ✨ Gemini AI Operational Assistant Button */}
        <button
          type="button"
          id="topbar-gemini-ai-btn"
          onClick={() => {
            toggleGeminiAssistant();
            setIsBellOpen(false);
            setIsHelpOpen(false);
            setIsPhcPickerOpen(false);
            setIsSearchOpen(false);
          }}
          aria-expanded={isGeminiAssistantOpen}
          aria-label="Open Gemini AI Operational Assistant"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap cursor-pointer shrink-0 shadow-2xs ${
            isGeminiAssistantOpen
              ? 'bg-slate-900 text-teal-300 border-teal-500 ring-2 ring-teal-500/30'
              : 'bg-linear-to-r from-teal-900 via-teal-800 to-emerald-800 hover:from-teal-950 hover:to-emerald-900 text-white border-teal-700'
          }`}
          title="Open ✨ Gemini AI Operational Assistant (Inventory, FEFO, Transfers, Alerts & Forecasts)"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" aria-hidden="true" />
          <span>✨ Gemini AI</span>
        </button>

        {/* Centralized Language Selector (English, हिन्दी, தமிழ், తెలుగు) */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-50 border border-slate-200 shrink-0">
          <Globe className="w-3.5 h-3.5 text-teal-700 shrink-0" aria-hidden="true" />
          <label htmlFor="ui-language-selector" className="sr-only">
            {t.common.languageLabel}
          </label>
          <select
            id="ui-language-selector"
            aria-label={t.common.languageLabel}
            value={language}
            onChange={(e) => setLanguage(e.target.value as SupportedLanguageCode)}
            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeLabel}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          {!inchargeSession ? (
            <>
              <span
                id="demo-readonly-mode-badge"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-mono font-bold shrink-0"
                title="Public demonstration mode — read-only exploration is open. Modifying supply-chain data requires authentication."
              >
                <Lock className="w-3 h-3 text-amber-700 shrink-0" />
                <span>{t.common.demoReadOnlyMode}</span>
              </span>

              <button
                type="button"
                id="topbar-demo-access-btn"
                onClick={() => openAuthModal('demo', selectedPHC)}
                className="px-2.5 py-1.5 text-xs font-bold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Open Demo Access (No Officer ID or password required)"
              >
                <Unlock className="w-3.5 h-3.5 text-teal-700" />
                <span>Demo Access</span>
              </button>

              <button
                type="button"
                id="topbar-authorized-access-btn"
                onClick={() => openAuthModal('officer', selectedPHC)}
                className="px-3 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Authenticate for Admin / Authorized Access to modify supply-chain data"
              >
                <KeyRound className="w-3.5 h-3.5 text-teal-200" />
                <span>{t.common.adminAuthorizedAccess}</span>
              </button>
            </>
          ) : (
            <>
              {(inchargeSession.loginMode === 'DEMO_ACCESS' || inchargeSession.isDemoAccount) && (
                <span
                  id="topbar-demo-account-badge"
                  className="hidden xl:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-[10px] font-mono font-bold shrink-0"
                  title="Demo Medical Officer Account — Synthetic Data"
                >
                  <span>DEMO ACCOUNT · SYNTHETIC DATA</span>
                </span>
              )}

              <button
                type="button"
                onClick={() => openAuthModal('signin', selectedPHC)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                title="View Authenticated PHC In-Charge Session Profile"
              >
                <div className="w-7 h-7 rounded-lg bg-linear-to-br from-teal-600 to-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {(
                    inchargeSession.officerName ||
                    inchargeSession.inchargeName ||
                    selectedPHC.medicalOfficerInCharge ||
                    'M'
                  )[0].toUpperCase()}
                </div>
                <div className="hidden sm:block text-left min-w-0 max-w-[155px]">
                  <div className="text-[11px] font-bold text-slate-900 truncate leading-tight">
                    {inchargeSession.officerName ||
                      inchargeSession.inchargeName ||
                      selectedPHC.medicalOfficerInCharge}
                  </div>
                  <div className="text-[10px] font-mono text-teal-800 font-semibold truncate leading-tight">
                    {inchargeSession.loginMode === 'DEMO_ACCESS' || inchargeSession.isDemoAccount
                      ? 'DEMO · '
                      : ''}
                    ID: {inchargeSession.officerId} ·{' '}
                    {selectedPHC.name.replace('Primary Health Centre', 'PHC')}
                  </div>
                </div>
              </button>

              <button
                type="button"
                id="topbar-logout-btn"
                onClick={() => {
                  signOutIncharge();
                  if (currentUser) {
                    signOutUser();
                  }
                  showNotification('Signed out of authorized session. Returned to DEMO / READ-ONLY MODE.');
                }}
                className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-slate-200 hover:border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Logout PHC In-Charge Session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
