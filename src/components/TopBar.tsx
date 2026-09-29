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
  HelpCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { Role, PHCFacility } from '../types.ts';
import { evaluateMedicineThresholdAndReplenishment } from '../utils/inventoryForecast.ts';
import { getPHCInchargeCredential, AuthenticatedInchargeSession } from '../utils/phcAuthDirectory.ts';
import {
  runGlobalPortalSearch,
  matchesSearchKeywords,
  GlobalSearchResultCategory,
  GlobalSearchResultItem
} from '../utils/globalSearch.ts';

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
    signOutIncharge
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
    if (item.phcToSelect) {
      setSelectedPHC(item.phcToSelect);
      showNotification(`Switched active facility to ${item.phcToSelect.name} (${item.phcToSelect.code}).`);
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

  const handleSelectPHC = (fac: PHCFacility) => {
    setSelectedPHC(fac);
    setIsPhcPickerOpen(false);
    setPhcSearchQuery('');
    showNotification(`Active facility switched to ${fac.name} (${fac.block}, ${fac.district}).`);
  };

  const handleInstantUnlockAndSwitchPHC = (fac: PHCFacility) => {
    const cred = getPHCInchargeCredential(fac);
    const prevUnlocked = inchargeSession?.unlockedPhcIds || [];
    const nextUnlocked = Array.from(new Set([...prevUnlocked, fac.id]));
    const newSession: AuthenticatedInchargeSession = {
      phcId: fac.id,
      phcName: fac.name,
      phcCode: fac.code,
      district: fac.district,
      state: fac.state,
      inchargeName: cred.inchargeName,
      inchargeEmail: cred.inchargeEmail,
      designation: cred.designation,
      role: cred.role,
      maskedCredentialUsed: '••••••••••••',
      unlockedPhcIds: nextUnlocked,
      loginTimestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSimulatedDemoSession: true
    };
    authenticatePHCIncharge(newSession, fac);
    setIsPhcPickerOpen(false);
    setPhcSearchQuery('');
    showNotification(
      `[DEMO ONLY] Switched simulated session to ${fac.name} (${fac.district}) as ${cred.inchargeName}.`
    );
  };

  const unreadStockAlertCount = proactiveStockAlerts.filter((a) => !a.read).length;
  const activeAlertCount = alerts.filter(
    (a) => a && a.status === 'ACTIVE' && (a.category === 'CRITICAL' || a.category === 'WARNING')
  ).length;
  const badgeCount = Math.max(unreadStockAlertCount, activeAlertCount);

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

        {/* Non-Overlapping Searchable PHC Facility Picker */}
        <div className="relative" ref={phcPickerRef}>
          <button
            type="button"
            id="facility-selector-btn"
            onClick={() => {
              setIsPhcPickerOpen((prev) => !prev);
              setIsSearchOpen(false);
              setIsBellOpen(false);
            }}
            aria-expanded={isPhcPickerOpen}
            aria-label={`Selected Facility: ${selectedPHC.name}. Click to switch PHC`}
            className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
              isPhcPickerOpen
                ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100/70'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <div className="min-w-0 max-w-[135px] sm:max-w-[190px] xl:max-w-[230px]">
              <div className="font-bold text-slate-900 text-xs truncate leading-tight">
                {selectedPHC.name}
              </div>
              <div className="text-[10px] text-slate-500 truncate leading-tight hidden sm:block">
                {selectedPHC.block} · {selectedPHC.district}
              </div>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform ${
                isPhcPickerOpen ? 'rotate-180 text-emerald-700' : ''
              }`}
            />
          </button>

          {/* Searchable PHC Dropdown Panel — anchored left-0 inside main viewport so it never overlaps Sidebar */}
          {isPhcPickerOpen && (
            <div
              role="dialog"
              aria-label="Switch Primary Health Centre"
              className="absolute left-0 top-full mt-2 w-[320px] sm:w-[400px] bg-white rounded-xl border border-slate-200 shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-3 bg-slate-900 text-white space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
                      PHC Facility Switcher ({facilities.length} Facilities)
                    </div>
                    <div className="text-xs font-bold">
                      Select Active Primary Health Centre
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPhcPickerOpen(false)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                    aria-label="Close facility switcher"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Search Input inside PHC Picker */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={phcSearchInputRef}
                    type="text"
                    value={phcSearchQuery}
                    onChange={(e) => setPhcSearchQuery(e.target.value)}
                    placeholder="Filter PHC by name, block, district, state, code..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {phcSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPhcSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Scope Filter Tabs */}
                <div className="flex items-center gap-1 pt-0.5 text-[10px] font-semibold">
                  {(
                    [
                      { id: 'ALL', label: `All (${facilities.length})` },
                      { id: 'RAJASTHAN', label: 'Rajasthan' },
                      { id: '24X7', label: '24x7 PHC' },
                      { id: 'CHC', label: 'CHC' }
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPhcScopeFilter(tab.id)}
                      className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                        phcScopeFilter === tab.id
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                {filteredFacilities.length === 0 ? (
                  <div className="p-5 text-center text-xs text-slate-500">
                    No facility matches "{phcSearchQuery}". Try searching by district or state.
                  </div>
                ) : (
                  filteredFacilities.map((fac) => {
                    const isSelected = fac.id === selectedPHC.id;
                    const isUnlocked =
                      isSelected || Boolean(inchargeSession?.unlockedPhcIds?.includes(fac.id));
                    const cred = getPHCInchargeCredential(fac);
                    return (
                      <button
                        key={fac.id}
                        type="button"
                        onClick={() => handleSelectPHC(fac)}
                        className={`w-full p-3 text-left transition-colors flex items-start justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/80 hover:bg-emerald-50'
                            : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {fac.name}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500 shrink-0">
                              ({fac.code})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 truncate">
                            {fac.type} · {fac.block} Block, {fac.district}, {fac.state}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate flex items-center gap-1.5">
                            <span>Incharge: {cred.inchargeName}</span>
                            <span>·</span>
                            <span className="text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 font-bold">
                              Demo Key: {cred.maskedCredential}
                            </span>
                          </div>
                        </div>
                        {isSelected ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-700 text-white text-[10px] font-mono font-bold shrink-0 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active</span>
                          </span>
                        ) : isUnlocked ? (
                          <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-mono font-bold shrink-0 flex items-center gap-1">
                            <Unlock className="w-3 h-3" />
                            <span>Unlocked</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInstantUnlockAndSwitchPHC(fac);
                              }}
                              className="px-2 py-0.5 rounded bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              title={`1-Click Unlock & Switch to ${fac.name}`}
                            >
                              <Unlock className="w-3 h-3" />
                              <span>1-Click Switch</span>
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-mono">
                  Showing {filteredFacilities.length} of {facilities.length} PHCs
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsPhcPickerOpen(false);
                    setActiveModule('directory');
                  }}
                  className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Full PHC Directory</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
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
                              setSelectedPHC(item.phcToSelect!);
                              setActiveModule('map');
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
                    openAuthModal('directory');
                  }}
                  className="w-full p-2.5 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100/70 text-left transition-all cursor-pointer flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-teal-950">4. Switch PHC or Browse 53 Sample PHCs</div>
                    <div className="text-[11px] text-teal-800">Credentials Masked (<code className="font-mono font-bold">••••••••••••</code> · Demo Only)</div>
                  </div>
                  <KeyRound className="w-4 h-4 text-teal-700 shrink-0" />
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => openAuthModal('directory')}
          className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 transition-colors whitespace-nowrap cursor-pointer"
          title="Open PHC Incharge Directory (Simulated Demo Accounts)"
        >
          <KeyRound className="w-3.5 h-3.5 text-teal-700 shrink-0" />
          <span>PHC Directory (Demo)</span>
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <button
            type="button"
            onClick={() => openAuthModal('signin', selectedPHC)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            title="View Simulated PHC Incharge Profile (Demo Only)"
          >
            <div className="w-7 h-7 rounded-lg bg-linear-to-br from-teal-600 to-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {(inchargeSession?.inchargeName || selectedPHC.medicalOfficerInCharge || 'M')[0].toUpperCase()}
            </div>
            <div className="hidden sm:block text-left min-w-0 max-w-[130px]">
              <div className="text-[11px] font-bold text-slate-900 truncate leading-tight">
                {inchargeSession?.inchargeName || selectedPHC.medicalOfficerInCharge}
              </div>
              <div className="text-[10px] font-mono text-amber-800 font-bold truncate leading-tight">
                DEMO ONLY • {getPHCInchargeCredential(selectedPHC).maskedCredential}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              signOutIncharge();
              if (currentUser) {
                signOutUser();
              }
              showNotification('Locked PHC portal & signed out Incharge session.');
            }}
            className="p-2 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
            title="Lock PHC & Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
