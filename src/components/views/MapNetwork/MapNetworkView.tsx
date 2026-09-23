import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Search,
  Filter,
  Layers,
  Sparkles,
  Navigation,
  Compass,
  Truck,
  CloudSun,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  Building2,
  Clock,
  ArrowRight,
  Maximize2,
  Activity,
  CheckCircle2,
  ExternalLink,
  Settings2,
  Share2
} from 'lucide-react';
import { NetworkFacility, LogisticsTransitRoute, RedistributionLink } from '../../../types.ts';
import {
  RAJASTHAN_NETWORK_FACILITIES,
  ACTIVE_LOGISTICS_ROUTES,
  REDISTRIBUTION_MAP_LINKS,
  WEATHER_CONTOURS,
  calculateHaversineDistanceKm,
  calculateRoadDistanceKm,
  estimateTravelTimeMinutes
} from '../../../data/networkData.ts';
import { InteractiveMap } from './InteractiveMap.tsx';
import { FacilityDetailDrawer } from './FacilityDetailDrawer.tsx';
import { FindNearbyResourcesModal } from './FindNearbyResourcesModal.tsx';
import { useApp } from '../../../context/AppContext.tsx';

export const MapNetworkView: React.FC = () => {
  const { selectedPHC, showNotification } = useApp();

  // All network data state
  const [facilities, setFacilities] = useState<NetworkFacility[]>(RAJASTHAN_NETWORK_FACILITIES);
  const [routes] = useState<LogisticsTransitRoute[]>(ACTIVE_LOGISTICS_ROUTES);
  const [redistributionLinks] = useState<RedistributionLink[]>(REDISTRIBUTION_MAP_LINKS);
  const [weatherZones] = useState(WEATHER_CONTOURS);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterDistrict, setFilterDistrict] = useState<string>('ALL');
  const [filterMedicineRisk, setFilterMedicineRisk] = useState<string>('ALL');
  const [filterCapacity, setFilterCapacity] = useState<string>('ALL');
  const [filterWorkforce, setFilterWorkforce] = useState<string>('ALL');
  const [filterPreparedness, setFilterPreparedness] = useState<string>('ALL');

  // Layer Toggles
  const [layers, setLayers] = useState({
    facilities: true,
    logistics: true,
    redistributions: true,
    weather: true,
    searchRadius: true
  });

  // Selected Facility for detail inspection
  const [selectedFacility, setSelectedFacility] = useState<NetworkFacility | null>(() => {
    // Default to active PHC (e.g. PHC Osian)
    return (
      RAJASTHAN_NETWORK_FACILITIES.find((f) => f.code === selectedPHC.code) ||
      RAJASTHAN_NETWORK_FACILITIES.find((f) => f.id === 'phc-osian') ||
      RAJASTHAN_NETWORK_FACILITIES[0]
    );
  });

  // Find Nearby Resources Modal State
  const [isFindNearbyOpen, setIsFindNearbyOpen] = useState<boolean>(false);
  const [nearbyTargetFacility, setNearbyTargetFacility] = useState<NetworkFacility | null>(null);
  const [nearbyMedicineName, setNearbyMedicineName] = useState<string | undefined>(undefined);

  // Radius Search (km) around selected facility
  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(60);

  // Routing / Measurement Nodes
  const [routeOrigin, setRouteOrigin] = useState<NetworkFacility | null>(() => {
    return RAJASTHAN_NETWORK_FACILITIES.find((f) => f.id === 'rmscl-mandore') || null;
  });
  const [routeDestination, setRouteDestination] = useState<NetworkFacility | null>(() => {
    return RAJASTHAN_NETWORK_FACILITIES.find((f) => f.id === 'phc-osian') || null;
  });

  // Filter Drawer / Panel Toggle on Mobile
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);

  // API-Ready Provider Modal / State
  const [showProviderModal, setShowProviderModal] = useState<boolean>(false);
  const [mapProvider, setMapProvider] = useState<'leaflet' | 'google-maps'>('leaflet');

  // Filter facilities based on all active criteria
  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      // Search text match
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = f.name.toLowerCase().includes(query);
        const matchesCode = f.code.toLowerCase().includes(query);
        const matchesBlock = f.block.toLowerCase().includes(query);
        const matchesMedicine =
          f.keyShortages.some((s) => s.medicineName.toLowerCase().includes(query)) ||
          f.keySurpluses.some((s) => s.medicineName.toLowerCase().includes(query));

        if (!matchesName && !matchesCode && !matchesBlock && !matchesMedicine) {
          return false;
        }
      }

      // Facility Type filter
      if (filterType !== 'ALL' && f.facilityType !== filterType) return false;

      // District filter
      if (filterDistrict !== 'ALL' && f.district !== filterDistrict) return false;

      // Medicine Risk filter
      if (filterMedicineRisk !== 'ALL' && f.medicineRisk !== filterMedicineRisk) return false;

      // Capacity filter
      if (filterCapacity === 'NORMAL' && f.capacityUtilization >= 70) return false;
      if (filterCapacity === 'STRAINED' && (f.capacityUtilization < 70 || f.capacityUtilization >= 85)) return false;
      if (filterCapacity === 'CRITICAL' && f.capacityUtilization < 85) return false;

      // Workforce filter
      if (filterWorkforce !== 'ALL' && f.workforceStatus !== filterWorkforce) return false;

      // Preparedness Status filter
      if (filterPreparedness !== 'ALL' && f.preparednessStatus !== filterPreparedness) return false;

      return true;
    });
  }, [
    facilities,
    searchTerm,
    filterType,
    filterDistrict,
    filterMedicineRisk,
    filterCapacity,
    filterWorkforce,
    filterPreparedness
  ]);

  // Distance & Travel Time Calculation between selected origin & destination
  const routeCalculations = useMemo(() => {
    if (!routeOrigin || !routeDestination) return null;

    const haversineKm = calculateHaversineDistanceKm(
      routeOrigin.latitude,
      routeOrigin.longitude,
      routeDestination.latitude,
      routeDestination.longitude
    );
    const roadKm = calculateRoadDistanceKm(haversineKm);
    const roadType =
      routeOrigin.facilityType === 'RMSCL Warehouse' || routeDestination.facilityType === 'RMSCL Warehouse'
        ? 'Highway (NH-62)'
        : roadKm > 40
        ? 'State Highway'
        : 'Rural / Desert Road';
    const travelTimeMins = estimateTravelTimeMinutes(roadKm, roadType);

    return {
      haversineKm,
      roadKm,
      travelTimeMins,
      roadType
    };
  }, [routeOrigin, routeDestination]);

  // Handlers for "Find Nearby Resources"
  const handleOpenFindNearby = (facility: NetworkFacility, medicineName?: string) => {
    setNearbyTargetFacility(facility);
    setNearbyMedicineName(medicineName);
    setIsFindNearbyOpen(true);
  };

  const handleSetRouteNode = (facility: NetworkFacility) => {
    if (!routeOrigin || (routeOrigin.id !== facility.id && routeDestination)) {
      setRouteOrigin(facility);
      showNotification(`Set ${facility.name} as active Route Origin.`);
    } else {
      setRouteDestination(facility);
      showNotification(`Set ${facility.name} as active Route Destination.`);
    }
  };

  const handleVisualizeRoute = (source: NetworkFacility, destination: NetworkFacility) => {
    setRouteOrigin(source);
    setRouteDestination(destination);
    setIsFindNearbyOpen(false);
    setSelectedFacility(source);
    showNotification(`Plotted transfer corridor: ${source.name} &rarr; ${destination.name}`);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterType('ALL');
    setFilterDistrict('ALL');
    setFilterMedicineRisk('ALL');
    setFilterCapacity('ALL');
    setFilterWorkforce('ALL');
    setFilterPreparedness('ALL');
  };

  return (
    <div className="space-y-4">
      {/* Top Operational Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase tracking-wider">
                Geographic Surveillance & Supply Network
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Western Rajasthan Region</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-emerald-700" />
              <span>Map & Network Intelligence</span>
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Authorized geospatial mapping of Primary Health Centres, Community Referral Hospitals, RMSCL Warehouses, and live cold-chain transit corridors.
            </p>
          </div>

          {/* Quick Metrics & Provider Switcher */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            {/* Provider Switcher Badge (API-Ready Architecture) */}
            <button
              type="button"
              onClick={() => setShowProviderModal(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-300 transition-colors cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Map Engine: <strong>OpenStreetMap</strong></span>
              <span className="text-[10px] bg-emerald-200 text-emerald-900 font-mono px-1.5 py-0.2 rounded font-bold">
                API-Ready
              </span>
            </button>

            {/* Quick Find Nearby CTA */}
            {selectedFacility && selectedFacility.keyShortages.length > 0 && (
              <button
                type="button"
                onClick={() => handleOpenFindNearby(selectedFacility)}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Find Nearby Resources</span>
              </button>
            )}
          </div>
        </div>

        {/* Route Measurement Corridor Bar */}
        {routeCalculations && routeOrigin && routeDestination && (
          <div className="mt-4 p-3 bg-blue-50/90 border border-blue-200 rounded-xl text-xs text-blue-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 font-bold">
                <Navigation className="w-4 h-4 text-blue-700 shrink-0" />
                <span>Active Route Corridor:</span>
              </div>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-blue-200 text-slate-800 font-bold">
                {routeOrigin.name}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-blue-200 text-slate-800 font-bold">
                {routeDestination.name}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-blue-900">
              <span>
                Road Distance: <strong className="text-slate-900">{routeCalculations.roadKm} km</strong> ({routeCalculations.haversineKm} km air)
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Est. Transit Time: <strong className="text-indigo-900">{routeCalculations.travelTimeMins >= 60 ? `${(routeCalculations.travelTimeMins / 60).toFixed(1)} hrs` : `${routeCalculations.travelTimeMins} mins`}</strong></span>
              </span>
              <span>•</span>
              <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                {routeCalculations.roadType}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Layer Toggles & Multi-Faceted Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-xs border border-slate-200 space-y-3">
        {/* Layer Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Layers className="w-4 h-4 text-slate-500" />
            <span>Map Layers:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer border border-slate-200">
              <input
                type="checkbox"
                checked={layers.facilities}
                onChange={(e) => setLayers({ ...layers, facilities: e.target.checked })}
                className="rounded accent-emerald-600"
              />
              <span>🏥 Facilities ({filteredFacilities.length})</span>
            </label>

            <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer border border-slate-200">
              <input
                type="checkbox"
                checked={layers.logistics}
                onChange={(e) => setLayers({ ...layers, logistics: e.target.checked })}
                className="rounded accent-blue-600"
              />
              <span>🚚 Live Logistics Trucks ({routes.length})</span>
            </label>

            <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer border border-slate-200">
              <input
                type="checkbox"
                checked={layers.redistributions}
                onChange={(e) => setLayers({ ...layers, redistributions: e.target.checked })}
                className="rounded accent-indigo-600"
              />
              <span>⇄ Redistribution Links ({redistributionLinks.length})</span>
            </label>

            <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer border border-slate-200">
              <input
                type="checkbox"
                checked={layers.weather}
                onChange={(e) => setLayers({ ...layers, weather: e.target.checked })}
                className="rounded accent-amber-600"
              />
              <span>🔥 Heatwave Zones (IMD Level 3/4)</span>
            </label>

            <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer border border-slate-200">
              <input
                type="checkbox"
                checked={layers.searchRadius}
                onChange={(e) => setLayers({ ...layers, searchRadius: e.target.checked })}
                className="rounded accent-teal-600"
              />
              <span>⭕ Radius Circle ({searchRadiusKm} km)</span>
            </label>
          </div>

          <button
            type="button"
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{showFilterPanel ? 'Hide Filters' : 'Show Advanced Filters'}</span>
          </button>
        </div>

        {/* Search & Primary Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search facility, block, medicine..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Facility Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Facility Types (PHC, CHC, Depot)</option>
              <option value="24x7 PHC">24x7 PHC Only</option>
              <option value="PHC">Standard PHC Only</option>
              <option value="CHC">Community Health Centre (CHC)</option>
              <option value="Sub-Centre">Sub-Centre / HWC</option>
              <option value="RMSCL Warehouse">RMSCL Warehouses & Depots</option>
            </select>
          </div>

          {/* Medicine Risk Filter */}
          <div>
            <select
              value={filterMedicineRisk}
              onChange={(e) => setFilterMedicineRisk(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Medicine Risk Levels</option>
              <option value="CRITICAL_DEFICIT">Critical Deficit (Immediate Risk)</option>
              <option value="BUFFER_DEPLETING">Buffer Depleting (Watch)</option>
              <option value="ADEQUATE">Adequate Inventory</option>
              <option value="SURPLUS_AVAILABLE">Surplus Available (Potential Donor)</option>
            </select>
          </div>

          {/* District Filter */}
          <div className="flex items-center gap-2">
            <select
              value={filterDistrict}
              onChange={(e) => setFilterDistrict(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Districts</option>
              <option value="Jodhpur">Jodhpur District</option>
              <option value="Phalodi">Phalodi District</option>
            </select>

            {(searchTerm ||
              filterType !== 'ALL' ||
              filterDistrict !== 'ALL' ||
              filterMedicineRisk !== 'ALL' ||
              filterCapacity !== 'ALL' ||
              filterWorkforce !== 'ALL' ||
              filterPreparedness !== 'ALL') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters Expandable Drawer */}
        {showFilterPanel && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/90 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs animate-in fade-in">
            {/* Capacity Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Bed Capacity Pressure:
              </label>
              <select
                value={filterCapacity}
                onChange={(e) => setFilterCapacity(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
              >
                <option value="ALL">All Capacity Levels</option>
                <option value="NORMAL">Normal Bed Utilization (&lt;70%)</option>
                <option value="STRAINED">Strained Occupancy (70% - 85%)</option>
                <option value="CRITICAL">Critical Saturation (&gt;85%)</option>
              </select>
            </div>

            {/* Workforce Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Workforce Staffing Status:
              </label>
              <select
                value={filterWorkforce}
                onChange={(e) => setFilterWorkforce(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
              >
                <option value="ALL">All Staffing Levels</option>
                <option value="OPTIMAL">Optimal Deployment</option>
                <option value="MODERATE">Moderate Shortfall</option>
                <option value="SHORTAGE">Severe Staff Shortage (&lt;60%)</option>
              </select>
            </div>

            {/* Preparedness Status Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Preparedness Alert Category:
              </label>
              <select
                value={filterPreparedness}
                onChange={(e) => setFilterPreparedness(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
              >
                <option value="ALL">All Preparedness Statuses</option>
                <option value="PREPARED">Fully Prepared</option>
                <option value="ALERTED">Seasonal Weather Alert Active</option>
                <option value="ACTION_REQUIRED">Action Required (Critical Gap)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Map Canvas Area with Floating Drawer */}
      <div className="relative w-full h-[640px] rounded-2xl overflow-hidden shadow-lg border border-slate-200">
        {/* Leaflet Interactive Map Canvas */}
        <InteractiveMap
          facilities={filteredFacilities}
          selectedFacility={selectedFacility}
          onSelectFacility={(fac) => setSelectedFacility(fac)}
          onFindNearbyResources={(fac) => handleOpenFindNearby(fac)}
          routes={routes}
          redistributionLinks={redistributionLinks}
          weatherZones={weatherZones}
          layers={layers}
          searchRadiusKm={searchRadiusKm}
          routeOrigin={routeOrigin}
          routeDestination={routeDestination}
          onSetRouteEndpoint={handleSetRouteNode}
        />

        {/* Legend Overlay at Bottom-Left */}
        <div className="absolute bottom-4 left-4 z-400 bg-white/90 backdrop-blur-md p-3 rounded-xl border border-slate-200/90 shadow-md text-[11px] space-y-1.5 pointer-events-auto max-w-xs">
          <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center justify-between">
            <span>Facility Map Legend</span>
            <span className="font-mono text-slate-400">v2.4</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-700">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
              <span>RMSCL Warehouse</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
              <span>Referral CHC</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
              <span>Primary PHC (24x7)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 inline-block" />
              <span>Sub-Centre / HWC</span>
            </div>
          </div>
          <div className="pt-1 border-t border-slate-200 flex items-center justify-between text-[10px]">
            <span className="text-rose-700 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping inline-block" />
              Critical Stockout
            </span>
            <span className="text-amber-700 font-semibold">Low Buffer</span>
            <span className="text-emerald-700 font-semibold">+ Surplus</span>
          </div>
        </div>

        {/* Selected Facility Detail Drawer */}
        <FacilityDetailDrawer
          facility={selectedFacility}
          onClose={() => setSelectedFacility(null)}
          onFindNearbyResources={(fac) => handleOpenFindNearby(fac)}
          onMeasureDistance={handleSetRouteNode}
          isOrigin={routeOrigin?.id === selectedFacility?.id}
          isDestination={routeDestination?.id === selectedFacility?.id}
        />
      </div>

      {/* Dispatched Logistics Fleet Live Surveillance Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Live Logistics Fleet Surveillance (RMSCL State Cold-Chain Depots)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {routes.length} Active Vehicles En Route • GPS Real-Time Telemetry
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {routes.map((route) => (
            <div
              key={route.id}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors text-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900">{route.consignmentId}</span>
                <span
                  className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                    route.priority === 'EMERGENCY_REPLENISHMENT'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-blue-100 text-blue-900 border border-blue-300'
                  }`}
                >
                  {route.priority.replace('_', ' ')}
                </span>
              </div>

              <div className="text-[11px] text-slate-700">
                <div className="font-semibold">{route.originName} &rarr; {route.destinationName}</div>
                <div className="text-slate-500 truncate mt-0.5">{route.cargoDescription}</div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Progress: {route.progressPercent}%</span>
                  <span className="font-bold text-indigo-700">ETA {route.etaMinutes} mins</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${route.progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-600">
                <span>Vehicle: <strong className="font-mono">{route.vehicleNumber}</strong></span>
                {route.reeferTempC && (
                  <span className="font-mono font-bold text-emerald-700">
                    ILR: {route.reeferTempC}°C
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* "Find Nearby Resources" Modal */}
      {nearbyTargetFacility && (
        <FindNearbyResourcesModal
          isOpen={isFindNearbyOpen}
          onClose={() => setIsFindNearbyOpen(false)}
          facility={nearbyTargetFacility}
          allFacilities={facilities}
          initialMedicineName={nearbyMedicineName}
          onVisualizeRoute={handleVisualizeRoute}
        />
      )}

      {/* API-Ready Provider Modal */}
      {showProviderModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-5 space-y-4 animate-in fade-in zoom-in-95 text-xs text-slate-700">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                  Map Engine Architecture
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Geographic Engine & Provider Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowProviderModal(false)}
                className="text-slate-400 hover:text-slate-800 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="leading-relaxed">
              This module is engineered with an <strong>API-ready provider abstraction layer</strong>. It currently renders high-performance vector tiles via <strong>OpenStreetMap / CartoDB</strong> and is pre-wired to load <strong>Google Maps Platform</strong> if an API key is configured.
            </p>

            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="font-bold text-slate-800 block text-[11px]">
                Active Map Provider:
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                  <input
                    type="radio"
                    name="provider"
                    checked={mapProvider === 'leaflet'}
                    onChange={() => setMapProvider('leaflet')}
                    className="accent-emerald-600"
                  />
                  <span>OpenStreetMap / Leaflet (Current, Zero-Key)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-500">
                  <input
                    type="radio"
                    name="provider"
                    checked={mapProvider === 'google-maps'}
                    onChange={() => setMapProvider('google-maps')}
                    className="accent-emerald-600"
                  />
                  <span>Google Maps Platform (API-Ready)</span>
                </label>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] leading-relaxed">
              <strong>Provider Portability Note:</strong> All network nodes, markers, route coordinates, and haversine calculations use standardized WGS84 coordinates compatible with any GIS provider (Google Maps, Mapbox, ESRI, OSM).
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowProviderModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
