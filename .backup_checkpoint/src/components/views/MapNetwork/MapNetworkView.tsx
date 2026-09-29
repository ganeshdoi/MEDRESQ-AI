import React, { useState, useMemo, useEffect } from 'react';
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
  ChevronUp,
  Building2,
  Clock,
  ArrowRight,
  Maximize2,
  Activity,
  CheckCircle2,
  ExternalLink,
  Phone,
  Radio,
  Share2,
  LifeBuoy,
  Users,
  Boxes,
  Route,
  FileText,
  X
} from 'lucide-react';
import {
  NetworkFacility,
  LogisticsTransitRoute,
  RedistributionLink,
  RoutingOperationMode,
  EmergencyCircuitPlan
} from '../../../types.ts';
import {
  RAJASTHAN_NETWORK_FACILITIES,
  ACTIVE_LOGISTICS_ROUTES,
  REDISTRIBUTION_MAP_LINKS,
  WEATHER_CONTOURS,
  calculateHaversineDistanceKm,
  calculateRoadDistanceKm,
  estimateTravelTimeMinutes
} from '../../../data/networkData.ts';
import {
  EMERGENCY_CIRCUITS_PRESETS,
  INTER_PHC_CORRIDORS
} from '../../../data/emergencyCircuitsData.ts';
import { InteractiveMap, DirectionsResultData, RiskLayersState } from './InteractiveMap.tsx';
import { FacilityDetailDrawer } from './FacilityDetailDrawer.tsx';
import { FindNearbyResourcesModal } from './FindNearbyResourcesModal.tsx';
import { EmergencyCircuitModal } from './EmergencyCircuitModal.tsx';
import { InstantTransferModal } from './InstantTransferModal.tsx';
import { DistanceMatrixTransportPanel } from './DistanceMatrixTransportPanel.tsx';
import { useApp } from '../../../context/AppContext.tsx';

type EmergencyFilterType = 'ALL' | 'ANTIVENOM' | 'OXYGEN' | 'ICU_BEDS' | 'ORS_SALINE' | 'BLOOD' | 'MCH';

export const MapNetworkView: React.FC = () => {
  const { selectedPHC, showNotification } = useApp();

  // All network data state
  const [facilities] = useState<NetworkFacility[]>(RAJASTHAN_NETWORK_FACILITIES);
  const [routes] = useState<LogisticsTransitRoute[]>(ACTIVE_LOGISTICS_ROUTES);
  const [redistributionLinks] = useState<RedistributionLink[]>(REDISTRIBUTION_MAP_LINKS);
  const [weatherZones] = useState(WEATHER_CONTOURS);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterState, setFilterState] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterDistrict, setFilterDistrict] = useState<string>('ALL');
  const [emergencyFilter, setEmergencyFilter] = useState<EmergencyFilterType>('ALL');
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState<number>(1);

  const availableStates = useMemo(() => {
    const set = new Set(facilities.map((f) => f.state));
    return Array.from(set).sort();
  }, [facilities]);

  const availableDistricts = useMemo(() => {
    const list =
      filterState === 'ALL' ? facilities : facilities.filter((f) => f.state === filterState);
    const set = new Set(list.map((f) => f.district));
    return Array.from(set).sort();
  }, [facilities, filterState]);

  // Google Maps Risk Layers State (<3 days Critical, 3-7 days Warning, >14 days Surplus)
  const [riskLayers, setRiskLayers] = useState<RiskLayersState>({
    critical: true,
    warning: true,
    safeSurplus: true,
    warehouses: true
  });
  const [onlyWithin30Km, setOnlyWithin30Km] = useState<boolean>(false);

  // Instant Transfer Possibilities Modal State
  const [instantTransferFacility, setInstantTransferFacility] = useState<NetworkFacility | null>(null);
  const [instantTransferDrug, setInstantTransferDrug] = useState<string | undefined>(undefined);

  // Google Maps Control States
  const [showTraffic, setShowTraffic] = useState<boolean>(true);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');

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
    return (
      RAJASTHAN_NETWORK_FACILITIES.find((f) => f.code === selectedPHC.code) ||
      RAJASTHAN_NETWORK_FACILITIES.find((f) => f.id === 'phc-osian') ||
      RAJASTHAN_NETWORK_FACILITIES[0]
    );
  });
  const [routeDestination, setRouteDestination] = useState<NetworkFacility | null>(() => {
    return RAJASTHAN_NETWORK_FACILITIES.find((f) => f.id === 'rmscl-mandore') || null;
  });

  // Sync active PHC selection with map focus
  useEffect(() => {
    const match = facilities.find(
      (f) =>
        f.code.toLowerCase() === selectedPHC.code.toLowerCase() ||
        f.id.toLowerCase() === selectedPHC.id.toLowerCase() ||
        f.name.toLowerCase().includes(selectedPHC.name.toLowerCase())
    );
    if (match) {
      setSelectedFacility(match);
      setRouteOrigin(match);
    }
  }, [selectedPHC, facilities]);

  // Google Maps Live Directions Data
  const [directionsData, setDirectionsData] = useState<DirectionsResultData | null>(null);
  const [showDirectionsSteps, setShowDirectionsSteps] = useState<boolean>(false);

  // Multi-PHC Circuit Routing & Personnel Deployment States
  const [routingMode, setRoutingMode] = useState<RoutingOperationMode>('DIRECT');
  const [routeWaypoints, setRouteWaypoints] = useState<NetworkFacility[]>([]);
  const [optimizeWaypoints, setOptimizeWaypoints] = useState<boolean>(true);
  const [isCircuitModalOpen, setIsCircuitModalOpen] = useState<boolean>(false);
  const [activeCircuitTitle, setActiveCircuitTitle] = useState<string | null>(null);
  const [activeCircuitPlan, setActiveCircuitPlan] = useState<EmergencyCircuitPlan | null>(null);

  // Filter Drawer / Panel Toggle on Mobile
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);

  // Filter facilities based on all active criteria + Emergency Triage Filter
  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      // 1. Emergency Triage Filter (The core real problem solver)
      if (emergencyFilter === 'ANTIVENOM') {
        const hasAntivenom = f.keySurpluses.some((s) =>
          s.medicineName.toLowerCase().includes('antivenom') ||
          s.medicineName.toLowerCase().includes('anti-snake')
        ) || f.facilityType === 'RMSCL Warehouse' || f.name.includes('CHC') || f.name.includes('Hospital');
        if (!hasAntivenom) return false;
      } else if (emergencyFilter === 'OXYGEN') {
        const hasOxygen = f.facilityType !== 'Sub-Centre' && f.sanctionedBeds >= 10;
        if (!hasOxygen) return false;
      } else if (emergencyFilter === 'ICU_BEDS') {
        const hasFreeBeds = (f.sanctionedBeds - f.occupiedBeds) >= 2;
        if (!hasFreeBeds) return false;
      } else if (emergencyFilter === 'ORS_SALINE') {
        const hasFluids = f.keySurpluses.some((s) =>
          s.medicineName.toLowerCase().includes('ors') ||
          s.medicineName.toLowerCase().includes('saline') ||
          s.medicineName.toLowerCase().includes('ringer')
        ) || f.facilityType === 'RMSCL Warehouse';
        if (!hasFluids) return false;
      } else if (emergencyFilter === 'BLOOD') {
        const isBloodBank = f.name.includes('Hospital') || f.name.includes('AIIMS') || f.facilityType === 'RMSCL Warehouse';
        if (!isBloodBank) return false;
      } else if (emergencyFilter === 'MCH') {
        const isMCH = f.facilityType === '24x7 PHC' || f.name.includes('CHC') || f.name.includes('Hospital');
        if (!isMCH) return false;
      }

      // Search text match
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = f.name.toLowerCase().includes(query);
        const matchesCode = f.code.toLowerCase().includes(query);
        const matchesBlock = f.block.toLowerCase().includes(query);
        const matchesDistrict = f.district.toLowerCase().includes(query);
        const matchesState = f.state.toLowerCase().includes(query);
        const matchesMedicine =
          f.keyShortages.some((s) => s.medicineName.toLowerCase().includes(query)) ||
          f.keySurpluses.some((s) => s.medicineName.toLowerCase().includes(query));

        if (!matchesName && !matchesCode && !matchesBlock && !matchesDistrict && !matchesState && !matchesMedicine) {
          return false;
        }
      }

      // State filter
      if (filterState !== 'ALL' && f.state !== filterState) return false;

      // Facility Type filter
      if (filterType !== 'ALL' && f.facilityType !== filterType) return false;

      // District filter
      if (filterDistrict !== 'ALL' && f.district !== filterDistrict) return false;

      return true;
    });
  }, [facilities, searchTerm, filterState, filterType, filterDistrict, emergencyFilter]);

  // Handle Emergency Filter Click with automatic nearest routing
  const handleEmergencyFilterSelect = (filter: EmergencyFilterType) => {
    setEmergencyFilter(filter);

    if (filter === 'ALL') {
      showNotification('Viewing all network facilities.');
      return;
    }

    // Auto-locate the nearest facility from current PHC that satisfies this condition
    const currentOrigin = routeOrigin || facilities[0];
    const eligibleFacilities = facilities.filter((f) => {
      if (f.id === currentOrigin.id) return false;
      if (filter === 'ANTIVENOM') {
        return f.keySurpluses.some((s) =>
          s.medicineName.toLowerCase().includes('antivenom') ||
          s.medicineName.toLowerCase().includes('anti-snake')
        ) || f.facilityType === 'RMSCL Warehouse' || f.name.includes('CHC');
      }
      if (filter === 'OXYGEN') return f.sanctionedBeds >= 10;
      if (filter === 'ICU_BEDS') return (f.sanctionedBeds - f.occupiedBeds) >= 2;
      if (filter === 'ORS_SALINE') {
        return f.keySurpluses.some((s) =>
          s.medicineName.toLowerCase().includes('ors') ||
          s.medicineName.toLowerCase().includes('saline')
        ) || f.facilityType === 'RMSCL Warehouse';
      }
      if (filter === 'BLOOD') return f.name.includes('Hospital') || f.facilityType === 'RMSCL Warehouse';
      if (filter === 'MCH') return f.facilityType === '24x7 PHC' || f.name.includes('CHC');
      return true;
    });

    if (eligibleFacilities.length > 0) {
      // Sort by air distance to find closest
      const sorted = [...eligibleFacilities].sort((a, b) => {
        const distA = calculateHaversineDistanceKm(currentOrigin.latitude, currentOrigin.longitude, a.latitude, a.longitude);
        const distB = calculateHaversineDistanceKm(currentOrigin.latitude, currentOrigin.longitude, b.latitude, b.longitude);
        return distA - distB;
      });

      const nearest = sorted[0];
      setRouteDestination(nearest);
      setSelectedFacility(nearest);
      showNotification(`🚨 Emergency Filter: Routed to nearest match ${nearest.name} with active Google Maps directions.`);
    }
  };

  // Distance & Travel Time Calculation Fallback
  const fallbackRouteCalculations = useMemo(() => {
    if (!routeOrigin || !routeDestination) return null;

    const haversineKm = calculateHaversineDistanceKm(
      routeOrigin.latitude,
      routeOrigin.longitude,
      routeDestination.latitude,
      routeDestination.longitude
    );
    const roadKm = calculateRoadDistanceKm(haversineKm);
    const travelTimeMins = estimateTravelTimeMinutes(roadKm, 'State Highway');

    return { haversineKm, roadKm, travelTimeMins };
  }, [routeOrigin, routeDestination]);

  // Handlers for "Find Nearby Resources"
  const handleOpenFindNearby = (facility: NetworkFacility, medicineName?: string) => {
    setNearbyTargetFacility(facility);
    setNearbyMedicineName(medicineName);
    setIsFindNearbyOpen(true);
  };

  // Set Origin / Destination for Route
  const handleSetRouteNode = (facility: NetworkFacility) => {
    if (!routeOrigin || (routeOrigin.id !== facility.id && routeDestination?.id === facility.id)) {
      setRouteOrigin(facility);
      showNotification(`Route origin set to ${facility.name}`);
    } else {
      setRouteDestination(facility);
      showNotification(`Route destination set to ${facility.name}. Computing Google Maps driving route...`);
    }
  };

  const handleSwapRouteEndpoints = () => {
    if (routeOrigin && routeDestination) {
      const temp = routeOrigin;
      setRouteOrigin(routeDestination);
      setRouteDestination(temp);
      showNotification('Route endpoints reversed. Recomputing Google Maps directions...');
    }
  };

  const handleVisualizeRoute = (origin: NetworkFacility | string, dest: NetworkFacility | string) => {
    const originFac = typeof origin === 'string' ? facilities.find((f) => f.id === origin) : origin;
    const destFac = typeof dest === 'string' ? facilities.find((f) => f.id === dest) : dest;
    if (originFac && destFac) {
      setRouteOrigin(originFac);
      setRouteDestination(destFac);
      setIsFindNearbyOpen(false);
      showNotification(`Driving route active on Google Map: ${originFac.name} to ${destFac.name}`);
    }
  };

  const handleSwitchRoutingMode = (mode: RoutingOperationMode) => {
    setRoutingMode(mode);
    if (mode === 'DIRECT') {
      setRouteWaypoints([]);
      setActiveCircuitTitle(null);
      setActiveCircuitPlan(null);
      showNotification('📍 1:1 Emergency Referral mode active.');
    } else if (mode === 'SUPPLY_CIRCUIT') {
      const preset = EMERGENCY_CIRCUITS_PRESETS[0];
      const origin = facilities.find((f) => f.id === preset.originId) || facilities[0];
      const dest = facilities.find((f) => f.id === preset.destinationId) || facilities[facilities.length - 1];
      const waypoints = preset.waypointIds
        .map((id) => facilities.find((f) => f.id === id))
        .filter(Boolean) as NetworkFacility[];

      setRouteOrigin(origin);
      setRouteDestination(dest);
      setRouteWaypoints(waypoints);
      setActiveCircuitTitle(preset.title);
      setActiveCircuitPlan(preset);
      showNotification(`🚚 Medical Supply Distribution Circuit active: ${preset.title}. Google Maps computing TSP multi-stop route.`);
    } else if (mode === 'PERSONNEL_DEPLOYMENT') {
      const preset = EMERGENCY_CIRCUITS_PRESETS[2];
      const origin = facilities.find((f) => f.id === preset.originId) || facilities[0];
      const dest = facilities.find((f) => f.id === preset.destinationId) || facilities[facilities.length - 1];
      const waypoints = preset.waypointIds
        .map((id) => facilities.find((f) => f.id === id))
        .filter(Boolean) as NetworkFacility[];

      setRouteOrigin(origin);
      setRouteDestination(dest);
      setRouteWaypoints(waypoints);
      setActiveCircuitTitle(preset.title);
      setActiveCircuitPlan(preset);
      showNotification(`👨‍⚕️ Emergency Personnel Surge Deployment active: ${preset.title}.`);
    } else if (mode === 'CLUSTER_MESH') {
      showNotification('🕸️ Inter-PHC Emergency Corridors Mesh active on Google Map.');
    }
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = EMERGENCY_CIRCUITS_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const origin = facilities.find((f) => f.id === preset.originId);
    const dest = facilities.find((f) => f.id === preset.destinationId);
    const waypoints = preset.waypointIds
      .map((id) => facilities.find((f) => f.id === id))
      .filter(Boolean) as NetworkFacility[];

    if (origin && dest) {
      setRoutingMode(preset.category === 'SUPPLY_DISTRIBUTION' ? 'SUPPLY_CIRCUIT' : 'PERSONNEL_DEPLOYMENT');
      setRouteOrigin(origin);
      setRouteDestination(dest);
      setRouteWaypoints(waypoints);
      setActiveCircuitTitle(preset.title);
      setActiveCircuitPlan(preset);
      showNotification(`🚨 Scenario Loaded: ${preset.title}. Google Maps plotting multi-waypoint driving route.`);
    }
  };

  const handleApplyCircuit = (
    origin: NetworkFacility,
    destination: NetworkFacility,
    waypoints: NetworkFacility[],
    circuitTitle?: string,
    payloadData?: any
  ) => {
    setRouteOrigin(origin);
    setRouteDestination(destination);
    setRouteWaypoints(waypoints);
    if (circuitTitle) setActiveCircuitTitle(circuitTitle);
    if (payloadData) setActiveCircuitPlan(payloadData);
    setRoutingMode(
      payloadData?.category === 'PERSONNEL_DEPLOYMENT' ? 'PERSONNEL_DEPLOYMENT' : 'SUPPLY_CIRCUIT'
    );
    showNotification(`🚚 Google Maps route updated: ${origin.name} through ${waypoints.length} stops to ${destination.name}`);
  };

  const handleClearCircuit = () => {
    setRouteWaypoints([]);
    setActiveCircuitTitle(null);
    setActiveCircuitPlan(null);
    setRoutingMode('DIRECT');
    showNotification('Circuit cleared. Returned to 1:1 direct referral routing.');
  };

  const googleMapsNavigationUrl = useMemo(() => {
    if (!routeOrigin || !routeDestination) return '#';
    const originStr = `${routeOrigin.latitude},${routeOrigin.longitude}`;
    const destStr = `${routeDestination.latitude},${routeDestination.longitude}`;
    if (routeWaypoints.length > 0) {
      const waypointsStr = routeWaypoints.map((w) => `${w.latitude},${w.longitude}`).join('|');
      return `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&waypoints=${waypointsStr}&travelmode=driving`;
    }
    return `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&travelmode=driving`;
  }, [routeOrigin, routeDestination, routeWaypoints]);

  // Format active road distance and time from Google Maps DirectionsService
  const liveDistance = directionsData?.distanceText || (fallbackRouteCalculations ? `${fallbackRouteCalculations.roadKm} km` : 'Computing...');
  const liveDuration = directionsData?.durationText || (fallbackRouteCalculations ? `${fallbackRouteCalculations.travelTimeMins} mins` : 'Computing...');

  // Compute active counts for critical, warning, and surplus facilities
  const riskCounts = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let surplus = 0;
    facilities.forEach((f) => {
      const isCritical = f.keyShortages.some((s) => s.daysRemaining < 3.0) || f.medicineRisk === 'CRITICAL_DEFICIT';
      const isWarning = !isCritical && (f.keyShortages.some((s) => s.daysRemaining >= 3.0 && s.daysRemaining <= 7.0) || f.medicineRisk === 'BUFFER_DEPLETING');
      if (isCritical) critical++;
      else if (isWarning) warning++;
      else if (f.facilityType !== 'RMSCL Warehouse') surplus++;
    });
    return { critical, warning, surplus };
  }, [facilities]);

  const handleOpenInstantTransfer = (facility: NetworkFacility, preferredDrug?: string) => {
    setInstantTransferFacility(facility);
    setInstantTransferDrug(preferredDrug);
  };

  const handleToggleRiskLayer = (layer: keyof RiskLayersState) => {
    const nextEnabled = !riskLayers[layer];
    setRiskLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
    const label =
      layer === 'critical'
        ? 'Critical Risk (<3d)'
        : layer === 'warning'
        ? 'Warning (3-7d)'
        : layer === 'safeSurplus'
        ? 'Surplus (>14d)'
        : 'RMSCL Warehouses';
    showNotification(`Layer ${label} ${nextEnabled ? 'enabled' : 'hidden'}.`);
  };

  const handleToggle30KmFilter = () => {
    const nextVal = !onlyWithin30Km;
    setOnlyWithin30Km(nextVal);
    showNotification(
      `30 km Radius Filter: ${nextVal ? 'ACTIVE (showing only PHCs within 30 km)' : 'DISABLED (showing all network)'}`
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Problem Solver Introduction */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                Google Maps Platform
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Advanced Markers • Live Directions API • Real-Time Traffic
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-sky-600" />
              <span>All-India PHC Map &amp; Emergency Resource Dispatch ({facilities.length} Facilities)</span>
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              All <strong>{facilities.length} Primary Health Centres, CHCs, Sub-Centres &amp; RMSCL Warehouses</strong> across <strong>{availableStates.length} States</strong> plotted on Google Maps with live stock &amp; routing from <strong>{selectedPHC.name}</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Google Maps Map Type Selector */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-xs font-semibold text-slate-700">
              <button
                type="button"
                onClick={() => setMapTypeId('roadmap')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  mapTypeId === 'roadmap' ? 'bg-white text-sky-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                Roadmap
              </button>
              <button
                type="button"
                onClick={() => setMapTypeId('satellite')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  mapTypeId === 'satellite' ? 'bg-white text-sky-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                Satellite
              </button>
              <button
                type="button"
                onClick={() => setMapTypeId('terrain')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  mapTypeId === 'terrain' ? 'bg-white text-sky-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                Terrain
              </button>
            </div>

            {/* Traffic Toggle */}
            <button
              type="button"
              onClick={() => setShowTraffic(!showTraffic)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                showTraffic
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-slate-100 border-slate-300 text-slate-600'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>Traffic: {showTraffic ? 'ON' : 'OFF'}</span>
            </button>

            {/* Quick Find Nearby */}
            {selectedFacility && (
              <button
                type="button"
                onClick={() => handleOpenFindNearby(selectedFacility)}
                className="px-3.5 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-sky-200" />
                <span>Search Nearby Resources</span>
              </button>
            )}
          </div>
        </div>

        {/* 1b. Emergency Operations Mode Selector & Circuit Planner Trigger */}
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-sky-800 font-bold bg-sky-100 px-2 py-0.5 rounded border border-sky-200">
                Route Mode
              </span>
              <div className="flex flex-wrap items-center gap-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => handleSwitchRoutingMode('DIRECT')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                    routingMode === 'DIRECT'
                      ? 'bg-slate-900 text-white shadow-2xs font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>1:1 Emergency Referral</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchRoutingMode('SUPPLY_CIRCUIT')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                    routingMode === 'SUPPLY_CIRCUIT'
                      ? 'bg-sky-700 text-white shadow-2xs font-bold'
                      : 'bg-sky-50 text-sky-900 hover:bg-sky-100'
                  }`}
                >
                  <Boxes className="w-3.5 h-3.5 text-amber-500" />
                  <span>Multi-PHC Supply Distribution</span>
                  <span className="text-[9px] px-1 py-0.2 bg-amber-400 text-amber-950 rounded font-mono font-bold">
                    TSP
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchRoutingMode('PERSONNEL_DEPLOYMENT')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                    routingMode === 'PERSONNEL_DEPLOYMENT'
                      ? 'bg-purple-700 text-white shadow-2xs font-bold'
                      : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  <span>Personnel Surge Deployment</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchRoutingMode('CLUSTER_MESH')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                    routingMode === 'CLUSTER_MESH'
                      ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                      : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                  }`}
                >
                  <Route className="w-3.5 h-3.5 text-emerald-600" />
                  <span>PHCs Corridor Mesh</span>
                </button>
              </div>
            </div>

            {/* Custom Circuit Planner Modal Button */}
            <button
              type="button"
              onClick={() => setIsCircuitModalOpen(true)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-200" />
              <span>Multi-PHC Circuit Planner</span>
            </button>
          </div>

          {/* Quick Scenario Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-mono text-slate-500 font-bold uppercase mr-1">
              Rapid Scenarios:
            </span>
            {EMERGENCY_CIRCUITS_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer flex items-center gap-1 ${
                  activeCircuitPlan?.id === preset.id
                    ? 'bg-sky-900 text-white border-sky-900 font-bold shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{preset.category === 'SUPPLY_DISTRIBUTION' ? '📦' : '👨‍⚕️'}</span>
                <span>{preset.title.split(' ')[0]} {preset.title.split(' ')[1]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. REAL PROBLEM SOLVER: One-Click Emergency Triage Filter Bar */}
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <LifeBuoy className="w-4 h-4 text-rose-600 animate-pulse" />
              <span>1-Click Emergency Triage Matcher (Find Life-Saving Stock):</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Filters facilities & auto-routes ambulance to closest verified inventory
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleEmergencyFilterSelect('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                emergencyFilter === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              All Facilities ({facilities.length})
            </button>

            <button
              type="button"
              onClick={() => handleEmergencyFilterSelect('ANTIVENOM')}
              className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                emergencyFilter === 'ANTIVENOM'
                  ? 'bg-rose-700 text-white border-rose-800 shadow-2xs ring-2 ring-rose-300'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <span>🐍 Anti-Snake Venom (ASV)</span>
            </button>

            <button
              type="button"
              onClick={() => handleEmergencyFilterSelect('OXYGEN')}
              className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                emergencyFilter === 'OXYGEN'
                  ? 'bg-sky-700 text-white border-sky-800 shadow-2xs ring-2 ring-sky-300'
                  : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
              }`}
            >
              <span>🫁 Oxygen Supported Beds</span>
            </button>

            <button
              type="button"
              onClick={() => handleEmergencyFilterSelect('ICU_BEDS')}
              className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                emergencyFilter === 'ICU_BEDS'
                  ? 'bg-amber-700 text-white border-amber-800 shadow-2xs ring-2 ring-amber-300'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span>🛏️ Free Emergency Beds</span>
            </button>

            <button
              type="button"
              onClick={() => handleEmergencyFilterSelect('ORS_SALINE')}
              className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                emergencyFilter === 'ORS_SALINE'
                  ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs ring-2 ring-emerald-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <span>💧 Saline & ORS Buffer</span>
            </button>

            <button
              type="button"
              onClick={() => handleEmergencyFilterSelect('BLOOD')}
              className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                emergencyFilter === 'BLOOD'
                  ? 'bg-purple-700 text-white border-purple-800 shadow-2xs ring-2 ring-purple-300'
                  : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
              }`}
            >
              <span>🩸 Blood Bank & Transfusion</span>
            </button>

            <button
              type="button"
              onClick={() => handleEmergencyFilterSelect('MCH')}
              className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                emergencyFilter === 'MCH'
                  ? 'bg-pink-700 text-white border-pink-800 shadow-2xs ring-2 ring-pink-300'
                  : 'bg-pink-50 text-pink-800 border-pink-200 hover:bg-pink-100'
              }`}
            >
              <span>👶 Maternal & Newborn FRU</span>
            </button>
          </div>
        </div>

        {/* 2b. REAL PROBLEM SOLVER: Visual Risk Layers (Google Maps Markers) & Instant Transfer Engine */}
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-600" />
                <span>Google Maps Visual Risk Layers &amp; Instant Reallocation Engine:</span>
              </span>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Layer markers by clinical depletion risk: Critical (&lt;3d) • Warning (3–7d) • Surplus (&gt;14d). Click any marker for instant transfer.
              </p>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600">
              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-200">
                {riskCounts.critical} Critical PHCs
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">
                {riskCounts.warning} Warning
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                {riskCounts.surplus} Surplus Donors
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleToggleRiskLayer('critical')}
                className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  riskLayers.critical
                    ? 'bg-rose-100 text-rose-900 border-rose-300 ring-2 ring-rose-200 shadow-2xs'
                    : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                <span>Critical Risk (&lt;3d): {riskCounts.critical} PHCs</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleRiskLayer('warning')}
                className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  riskLayers.warning
                    ? 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-200 shadow-2xs'
                    : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Warning Risk (3–7d): {riskCounts.warning} PHCs</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleRiskLayer('safeSurplus')}
                className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  riskLayers.safeSurplus
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300 ring-2 ring-emerald-200 shadow-2xs'
                    : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span>Surplus Donors (&gt;14d): {riskCounts.surplus} PHCs</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleRiskLayer('warehouses')}
                className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  riskLayers.warehouses
                    ? 'bg-blue-100 text-blue-900 border-blue-300 ring-2 ring-blue-200 shadow-2xs'
                    : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span>RMSCL Hubs</span>
              </button>

              <button
                type="button"
                onClick={handleToggle30KmFilter}
                className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  onlyWithin30Km
                    ? 'bg-purple-700 text-white border-purple-800 shadow-2xs ring-2 ring-purple-300'
                    : 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-purple-600" />
                <span>≤30 km Cluster Radius {onlyWithin30Km ? '(ACTIVE)' : '(OFF)'}</span>
              </button>
            </div>

            {/* Instant Transfer Trigger for current or selected facility */}
            {selectedFacility && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('distance-matrix-transport-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                    showNotification('Navigating to Google Distance Matrix Medical Transport Matrix');
                  }}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer border border-slate-700"
                >
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>⏱️ Distance Matrix ETAs</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenInstantTransfer(selectedFacility)}
                  className="px-4 py-2 bg-gradient-to-r from-rose-600 via-amber-600 to-emerald-600 hover:from-rose-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>⚡ Instant Transfer Possibilities ({selectedFacility.name.split(' ')[0]} {selectedFacility.name.split(' ')[1] || ''})</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. Real-time Google Maps Route Corridor & Multi-Stop Emergency Dispatch Card */}
        {routeOrigin && routeDestination && (
          <div className="mt-4 p-4 bg-slate-900 rounded-xl text-white shadow-md space-y-3">
            {/* Header with circuit title if in multi-stop mode */}
            {routeWaypoints.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                    {routingMode === 'SUPPLY_CIRCUIT' ? (
                      <Boxes className="w-4 h-4" />
                    ) : (
                      <Users className="w-4 h-4" />
                    )}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{activeCircuitTitle || 'Multi-PHC Emergency Route'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-sky-950 text-sky-300 border border-sky-800">
                        {routeWaypoints.length + 2} Stops Total
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {routingMode === 'SUPPLY_CIRCUIT'
                        ? 'Cold-chain medical supply replenishment across rural Primary Health Centres'
                        : 'Emergency doctor and triage team surge transfer between facilities'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-800 text-[11px] font-mono text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Google Maps TSP Optimized</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearCircuit}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Clear multi-stop circuit"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Stop Sequence Strip */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
                {/* Start */}
                <div className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 bg-purple-900 text-purple-200 rounded font-mono font-bold text-[10px]">
                    START
                  </span>
                  <span className="font-mono bg-slate-800 px-2.5 py-1 rounded border border-slate-700 font-bold text-white">
                    {routeOrigin.name}
                  </span>
                </div>

                {/* Waypoints */}
                {routeWaypoints.map((wp, idx) => (
                  <React.Fragment key={wp.id}>
                    <ArrowRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 bg-sky-900 text-sky-200 rounded font-mono font-bold text-[10px]">
                        STOP #{idx + 1}
                      </span>
                      <span className="font-mono bg-slate-800 px-2 py-1 rounded border border-slate-700 text-slate-200">
                        {wp.name}
                      </span>
                    </div>
                  </React.Fragment>
                ))}

                {/* Destination */}
                <ArrowRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <div className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 bg-rose-900 text-rose-200 rounded font-mono font-bold text-[10px]">
                    DEST
                  </span>
                  <span className="font-mono bg-sky-950 px-2.5 py-1 rounded border border-sky-600 font-bold text-sky-200">
                    {routeDestination.name}
                  </span>
                </div>

                {/* Swap button for 1:1 mode */}
                {routeWaypoints.length === 0 && (
                  <button
                    type="button"
                    onClick={handleSwapRouteEndpoints}
                    className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white cursor-pointer ml-1"
                    title="Reverse endpoints"
                  >
                    <ArrowRight className="w-4 h-4 text-sky-400" />
                  </button>
                )}
              </div>

              {/* Real Distance, Time & Turn-by-Turn GPS Button */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-800 rounded-lg text-xs font-mono">
                  <span>
                    Total: <strong className="text-white text-sm">{liveDistance}</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>ETA: <strong className="text-emerald-400 text-sm">{liveDuration}</strong></span>
                  </span>
                </div>

                {/* Configure Stops / Payload Modal */}
                <button
                  type="button"
                  onClick={() => setIsCircuitModalOpen(true)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Boxes className="w-3.5 h-3.5 text-amber-400" />
                  <span>Configure Circuit</span>
                </button>

                {/* Direct Google Maps Turn-by-Turn GPS Navigation App Link */}
                <a
                  href={googleMapsNavigationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <span>Launch Google Maps GPS</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {/* Direct Emergency Call Button */}
                <a
                  href={`tel:${routeDestination.contactNumber}`}
                  className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Hospital</span>
                </a>

                {/* Toggle Step-by-Step Directions */}
                {directionsData?.steps && directionsData.steps.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowDirectionsSteps(!showDirectionsSteps)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1"
                    title="View Turn-by-Turn Driving Steps"
                  >
                    <span>{showDirectionsSteps ? 'Hide Maneuvers' : 'View Steps'}</span>
                    {showDirectionsSteps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {/* Expandable Step-by-Step Navigation Maneuvers */}
            {showDirectionsSteps && directionsData?.steps && (
              <div className="pt-3 border-t border-slate-800 max-h-48 overflow-y-auto space-y-1.5 text-xs text-slate-300 font-sans pr-2">
                <div className="font-bold text-sky-400 font-mono text-[11px] uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Turn-by-Turn Route Navigation Steps ({directionsData.steps.length} maneuvers):</span>
                  {directionsData.legs && directionsData.legs.length > 1 && (
                    <span className="text-slate-400">
                      Multi-Stop Circuit: {directionsData.legs.length} transit legs
                    </span>
                  )}
                </div>
                {directionsData.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3 p-1.5 rounded bg-slate-800/60 border border-slate-700/50">
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-slate-400 text-[10px] w-5 text-right mt-0.5">{idx + 1}.</span>
                      <span className="text-slate-200">{step.instructions}</span>
                    </div>
                    <span className="font-mono text-slate-400 shrink-0 text-[11px]">{step.distance}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Quick Filters, State/District Scope & Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl shadow-xs border border-slate-200 space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mr-1">
              Map Scope:
            </span>
            <button
              type="button"
              onClick={() => {
                setFilterState('ALL');
                setFilterDistrict('ALL');
                setFilterType('ALL');
                setOnlyWithin30Km(false);
                setFitBoundsTrigger((prev) => prev + 1);
                showNotification(`Showing all ${facilities.length} PHCs and health facilities across India on the map.`);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                filterState === 'ALL' && filterDistrict === 'ALL' && !onlyWithin30Km
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              🇮🇳 All India PHCs ({facilities.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterState('Rajasthan');
                setFilterDistrict('ALL');
                setOnlyWithin30Km(false);
                setFitBoundsTrigger((prev) => prev + 1);
                showNotification('Focused map on all Rajasthan PHCs, CHCs & RMSCL Warehouses.');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                filterState === 'Rajasthan' && filterDistrict === 'ALL'
                  ? 'bg-emerald-700 text-white border-emerald-800'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              🏜️ Rajasthan Network ({facilities.filter((f) => f.state === 'Rajasthan').length})
            </button>

            {selectedPHC.state !== 'Rajasthan' && (
              <button
                type="button"
                onClick={() => {
                  setFilterState(selectedPHC.state);
                  setFilterDistrict('ALL');
                  setOnlyWithin30Km(false);
                  setFitBoundsTrigger((prev) => prev + 1);
                  showNotification(`Focused map on ${selectedPHC.state} PHCs.`);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                  filterState === selectedPHC.state
                    ? 'bg-sky-700 text-white border-sky-800'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                📍 {selectedPHC.state} PHCs
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setFitBoundsTrigger((prev) => prev + 1);
                showNotification(`Zoomed map to fit ${filteredFacilities.length} visible PHCs.`);
              }}
              className="px-3 py-1.5 rounded-lg font-bold border border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100 transition-colors cursor-pointer"
            >
              🔄 Fit All {filteredFacilities.length} Pins in View
            </button>
          </div>

          <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            Showing {filteredFacilities.length} of {facilities.length} PHCs on Map
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search any PHC name, state, district, block, code, or medicine stock..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterState}
              onChange={(e) => {
                setFilterState(e.target.value);
                setFilterDistrict('ALL');
                setFitBoundsTrigger((prev) => prev + 1);
              }}
              className="p-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white cursor-pointer"
            >
              <option value="ALL">All States ({availableStates.length})</option>
              {availableStates.map((st) => (
                <option key={st} value={st}>
                  {st} ({facilities.filter((f) => f.state === st).length})
                </option>
              ))}
            </select>

            <select
              value={filterDistrict}
              onChange={(e) => {
                setFilterDistrict(e.target.value);
                setFitBoundsTrigger((prev) => prev + 1);
              }}
              className="p-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white cursor-pointer"
            >
              <option value="ALL">All Districts ({availableDistricts.length})</option>
              {availableDistricts.map((dist) => (
                <option key={dist} value={dist}>
                  {dist} District
                </option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setFitBoundsTrigger((prev) => prev + 1);
              }}
              className="p-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white cursor-pointer"
            >
              <option value="ALL">All Facility Tiers ({facilities.length})</option>
              <option value="24x7 PHC">24x7 Primary Health Centres</option>
              <option value="PHC">Standard Primary Health Centres (PHC)</option>
              <option value="CHC">Community Health Centres (CHCs)</option>
              <option value="RMSCL Warehouse">RMSCL Warehouses</option>
              <option value="Sub-Centre">Sub-Centres / HWCs</option>
            </select>

            {/* Search Radius Slider */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
              <span className="font-medium text-[11px]">Radius:</span>
              <select
                value={searchRadiusKm}
                onChange={(e) => setSearchRadiusKm(Number(e.target.value))}
                className="font-mono font-bold bg-transparent border-0 text-sky-800 focus:outline-none cursor-pointer"
              >
                <option value={30}>30 km</option>
                <option value={60}>60 km</option>
                <option value={100}>100 km</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Main Google Map Canvas with Interactive Floating Details */}
      <div className="relative w-full h-[650px] rounded-2xl overflow-hidden shadow-lg border border-slate-200">
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
          routeWaypoints={routeWaypoints}
          optimizeWaypoints={optimizeWaypoints}
          activeRouteMode={routingMode}
          interPHCCorridors={INTER_PHC_CORRIDORS}
          onSetRouteEndpoint={handleSetRouteNode}
          onRouteDirectionsComputed={setDirectionsData}
          showTraffic={showTraffic}
          mapTypeId={mapTypeId}
          riskLayers={riskLayers}
          onlyWithin30Km={onlyWithin30Km}
          baseFacility={facilities.find((f) => f.code === selectedPHC.code) || facilities[0]}
          onOpenInstantTransfer={handleOpenInstantTransfer}
          onToggleRiskLayer={handleToggleRiskLayer}
          onToggle30KmFilter={handleToggle30KmFilter}
          fitBoundsTrigger={fitBoundsTrigger}
          onFitAllFacilities={() =>
            showNotification(`Fitted all ${filteredFacilities.length} plotted PHCs into map view.`)
          }
        />

        {/* Legend Overlay at Bottom-Left */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-md text-[11px] space-y-1.5 max-w-xs pointer-events-auto">
          <div className="font-bold text-slate-900 uppercase tracking-wider text-[10px] flex items-center justify-between">
            <span>Google Maps Pin Risk Legend</span>
            <span className="font-mono text-emerald-700 font-bold">● Live Telemetry</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-700 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block animate-pulse" />
              <span className="font-bold text-rose-900">Critical (&lt;3d)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span className="font-bold text-amber-900">Warning (3–7d)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
              <span>Surplus (&gt;14d)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
              <span>RMSCL Hub</span>
            </div>
          </div>
          <div className="pt-1 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
            <span>Click Pin: <strong className="text-sky-700">Instant Transfer</strong></span>
            <span>Radius: <strong className="font-mono">{onlyWithin30Km ? '≤30 km' : `${searchRadiusKm} km`}</strong></span>
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
          onOpenInstantTransfer={handleOpenInstantTransfer}
        />
      </div>

      {/* 5b. All Mapped PHCs Interactive Directory Strip */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>All Plotted PHCs &amp; Health Facilities on Map ({filteredFacilities.length})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Click any PHC below to pan the Google Map directly to its pin or calculate driving directions
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setFilterState('ALL');
                setFilterDistrict('ALL');
                setFilterType('ALL');
                setSearchTerm('');
                setFitBoundsTrigger((prev) => prev + 1);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer"
            >
              Reset Map Filters ({facilities.length} Total)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
          {filteredFacilities.map((fac) => {
            const isSel = selectedFacility?.id === fac.id;
            const isCrit =
              fac.keyShortages.some((s) => s.daysRemaining < 3.0) ||
              fac.medicineRisk === 'CRITICAL_DEFICIT';
            const isWarn =
              !isCrit &&
              (fac.keyShortages.some((s) => s.daysRemaining <= 7.0) ||
                fac.medicineRisk === 'BUFFER_DEPLETING');

            return (
              <div
                key={fac.id}
                onClick={() => setSelectedFacility(fac)}
                className={`p-3 rounded-xl border text-xs transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isSel
                    ? 'bg-sky-50 border-sky-500 ring-1 ring-sky-300'
                    : 'bg-slate-50/70 hover:bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-slate-500">
                    <span className="flex items-center gap-1 font-bold text-slate-700">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          fac.facilityType === 'RMSCL Warehouse'
                            ? 'bg-blue-600'
                            : isCrit
                            ? 'bg-rose-600'
                            : isWarn
                            ? 'bg-amber-500'
                            : 'bg-emerald-600'
                        }`}
                      />
                      {fac.facilityType}
                    </span>
                    <span>{fac.state}</span>
                  </div>
                  <div className="font-bold text-slate-900 truncate mt-0.5">{fac.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {fac.block} · {fac.district}
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-200/70 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-600">
                    {fac.sanctionedBeds > 0
                      ? `${fac.occupiedBeds}/${fac.sanctionedBeds} Beds`
                      : 'Nodal Depot'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetRouteNode(fac);
                    }}
                    className="font-sans font-bold text-sky-700 hover:text-sky-900 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Navigation className="w-2.5 h-2.5" />
                    <span>Route</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Google Distance Matrix API: Estimated Transport Times for Medical Supplies */}
      <div id="distance-matrix-transport-section" className="scroll-mt-6">
        <DistanceMatrixTransportPanel
          selectedPHC={
            selectedFacility ||
            facilities.find((f) => f.code === selectedPHC.code) ||
            facilities[0]
          }
          allFacilities={facilities}
          onSelectRoute={(origin, dest) => {
            handleVisualizeRoute(origin, dest);
            window.scrollTo({ top: 400, behavior: 'smooth' });
          }}
          onOpenInstantTransfer={handleOpenInstantTransfer}
          onSelectFacility={(fac) => setSelectedFacility(fac)}
        />
      </div>

      {/* 7. Active Cold-Chain Logistics Surveillance Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-sky-600" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Live Logistics Fleet Surveillance (RMSCL Desert Transit Network)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {routes.length} Active Vehicles En Route • Google Maps Real-Time Corridors
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {routes.map((route) => (
            <div
              key={route.id}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-colors text-xs space-y-2 shadow-2xs"
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
                  <span className="font-bold text-sky-700">ETA {route.etaMinutes} mins</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-600 h-full rounded-full transition-all"
                    style={{ width: `${route.progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-600">
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

      {/* Multi-PHC Emergency Circuit Planner Modal (Supplies & Personnel) */}
      <EmergencyCircuitModal
        isOpen={isCircuitModalOpen}
        onClose={() => setIsCircuitModalOpen(false)}
        facilities={facilities}
        currentOrigin={routeOrigin}
        currentDestination={routeDestination}
        currentWaypoints={routeWaypoints}
        directionsData={directionsData}
        optimizeWaypoints={optimizeWaypoints}
        onToggleOptimize={setOptimizeWaypoints}
        onApplyCircuit={handleApplyCircuit}
      />

      {/* Instant Transfer Possibilities Modal */}
      {instantTransferFacility && (
        <InstantTransferModal
          isOpen={Boolean(instantTransferFacility)}
          onClose={() => setInstantTransferFacility(null)}
          facility={instantTransferFacility}
          allFacilities={facilities}
          baseFacility={facilities.find((f) => f.code === selectedPHC.code) || facilities[0]}
          preferredDrug={instantTransferDrug}
          onVisualizeRoute={handleVisualizeRoute}
        />
      )}
    </div>
  );
};
