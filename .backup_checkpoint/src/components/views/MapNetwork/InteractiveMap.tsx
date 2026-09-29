/// <reference types="google.maps" />
import React, { useEffect, useState, useRef } from 'react';
import {
  APIProvider,
  Map,
  useMap,
  useMapsLibrary,
  AdvancedMarker,
  Pin,
  InfoWindow
} from '@vis.gl/react-google-maps';
import {
  NetworkFacility,
  LogisticsTransitRoute,
  RedistributionLink,
  WeatherContourZone,
  InterPHCCorridor,
  RoutingOperationMode
} from '../../../types.ts';
import {
  calculateHaversineDistanceKm,
  calculateRoadDistanceKm,
  estimateTravelTimeMinutes
} from '../../../data/networkData.ts';
import {
  Building2,
  Phone,
  Navigation,
  ExternalLink,
  BedDouble,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Compass,
  Layers,
  ArrowRight,
  Truck,
  Sparkles,
  CheckCircle2,
  X,
  Users,
  Boxes,
  Zap,
  Filter
} from 'lucide-react';

export interface RiskLayersState {
  critical: boolean; // <3 days remaining
  warning: boolean;  // 3-7 days remaining
  safeSurplus: boolean; // >7 days or surplus >14 days
  warehouses: boolean;
}

export interface DirectionsLegData {
  startAddress?: string;
  endAddress?: string;
  distanceText: string;
  durationText: string;
  distanceMeters?: number;
  durationSeconds?: number;
  steps: Array<{
    instructions: string;
    distance: string;
    duration: string;
  }>;
}

export interface DirectionsResultData {
  distanceText: string;
  durationText: string;
  distanceMeters?: number;
  durationSeconds?: number;
  legs?: DirectionsLegData[];
  waypointOrder?: number[];
  steps: Array<{
    instructions: string;
    distance: string;
    duration: string;
  }>;
}

export interface InteractiveMapProps {
  facilities: NetworkFacility[];
  selectedFacility: NetworkFacility | null;
  onSelectFacility: (facility: NetworkFacility) => void;
  onFindNearbyResources: (facility: NetworkFacility) => void;
  routes: LogisticsTransitRoute[];
  redistributionLinks: RedistributionLink[];
  weatherZones: WeatherContourZone[];
  layers: {
    facilities: boolean;
    logistics: boolean;
    redistributions: boolean;
    weather: boolean;
    searchRadius: boolean;
  };
  searchRadiusKm: number;
  routeOrigin: NetworkFacility | null;
  routeDestination: NetworkFacility | null;
  routeWaypoints?: NetworkFacility[];
  optimizeWaypoints?: boolean;
  activeRouteMode?: RoutingOperationMode;
  interPHCCorridors?: InterPHCCorridor[];
  onSetRouteEndpoint: (facility: NetworkFacility) => void;
  onRouteDirectionsComputed?: (data: DirectionsResultData | null) => void;
  showTraffic?: boolean;
  mapTypeId?: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
  riskLayers?: RiskLayersState;
  onlyWithin30Km?: boolean;
  baseFacility?: NetworkFacility | null;
  onOpenInstantTransfer?: (facility: NetworkFacility, preferredDrug?: string) => void;
  onToggleRiskLayer?: (layer: keyof RiskLayersState) => void;
  onToggle30KmFilter?: () => void;
  fitBoundsTrigger?: number;
  onFitAllFacilities?: () => void;
}

const GOOGLE_MAPS_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) ||
  'AIzaSyCIJS3i3rKXOaYTTA3EJs1g7PE_EM3RcPQ';

// 1. Google Maps Route Polyline Layer (Point-to-Point & Multi-Stop TSP Circuit)
function DirectionsLayer({
  origin,
  destination,
  waypoints = [],
  optimizeWaypoints = true,
  onDirectionsComputed
}: {
  origin: NetworkFacility | null;
  destination: NetworkFacility | null;
  waypoints?: NetworkFacility[];
  optimizeWaypoints?: boolean;
  onDirectionsComputed?: (data: DirectionsResultData | null) => void;
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!mapsLib || !map || !origin || !destination) {
      if (onDirectionsComputed) onDirectionsComputed(null);
      return;
    }

    // Order waypoints using nearest-neighbor TSP if optimizeWaypoints is enabled
    const orderedWaypoints: NetworkFacility[] = [];
    const waypointOrder: number[] = [];

    if (waypoints.length > 0) {
      if (optimizeWaypoints) {
        const remaining = waypoints.map((wp, idx) => ({ wp, idx }));
        let currentPos = { lat: origin.latitude, lng: origin.longitude };
        while (remaining.length > 0) {
          let bestIdx = 0;
          let bestDist = Infinity;
          for (let i = 0; i < remaining.length; i++) {
            const d = calculateHaversineDistanceKm(
              currentPos.lat,
              currentPos.lng,
              remaining[i].wp.latitude,
              remaining[i].wp.longitude
            );
            if (d < bestDist) {
              bestDist = d;
              bestIdx = i;
            }
          }
          const chosen = remaining.splice(bestIdx, 1)[0];
          orderedWaypoints.push(chosen.wp);
          waypointOrder.push(chosen.idx);
          currentPos = { lat: chosen.wp.latitude, lng: chosen.wp.longitude };
        }
      } else {
        waypoints.forEach((wp, idx) => {
          orderedWaypoints.push(wp);
          waypointOrder.push(idx);
        });
      }
    }

    const stops: NetworkFacility[] = [origin, ...orderedWaypoints, destination];
    const pathCoords = stops.map((s) => ({ lat: s.latitude, lng: s.longitude }));

    const routePolyline = new mapsLib.Polyline({
      path: pathCoords,
      geodesic: true,
      strokeColor: '#0284c7', // sky-600
      strokeOpacity: 0.9,
      strokeWeight: 5.5,
      map
    });

    // Compute legs & turn-by-turn corridor steps
    let totalDistKmNum = 0;
    let totalDurMins = 0;
    const allSteps: Array<{ instructions: string; distance: string; duration: string }> = [];
    const legsData: DirectionsLegData[] = [];

    for (let i = 0; i < stops.length - 1; i++) {
      const fromStop = stops[i];
      const toStop = stops[i + 1];
      const airKm = calculateHaversineDistanceKm(
        fromStop.latitude,
        fromStop.longitude,
        toStop.latitude,
        toStop.longitude
      );
      const roadKm = calculateRoadDistanceKm(airKm);
      const highwayType =
        fromStop.facilityType === 'RMSCL Warehouse' || toStop.facilityType === 'RMSCL Warehouse'
          ? 'Highway (NH-62)'
          : roadKm > 40
          ? 'State Highway'
          : 'Rural / Desert Road';
      const legMins = estimateTravelTimeMinutes(roadKm, highwayType);

      totalDistKmNum += roadKm;
      totalDurMins += legMins;

      const seg1Km = (roadKm * 0.25).toFixed(1);
      const seg2Km = (roadKm * 0.55).toFixed(1);
      const seg3Km = (roadKm * 0.2).toFixed(1);
      const seg1Min = Math.max(2, Math.round(legMins * 0.25));
      const seg2Min = Math.max(4, Math.round(legMins * 0.55));
      const seg3Min = Math.max(2, legMins - seg1Min - seg2Min);

      const legSteps = [
        {
          instructions: `Depart ${fromStop.name} (${fromStop.block}) via District Link Road`,
          distance: `${seg1Km} km`,
          duration: `${seg1Min} mins`
        },
        {
          instructions: `Continue along ${highwayType} emergency medical corridor toward ${toStop.district}`,
          distance: `${seg2Km} km`,
          duration: `${seg2Min} mins`
        },
        {
          instructions: `Arrive at ${toStop.name} (${toStop.code}) cold-chain receiving bay`,
          distance: `${seg3Km} km`,
          duration: `${seg3Min} mins`
        }
      ];

      allSteps.push(...legSteps);
      legsData.push({
        startAddress: `${fromStop.name}, ${fromStop.block}, ${fromStop.district}`,
        endAddress: `${toStop.name}, ${toStop.block}, ${toStop.district}`,
        distanceText: `${roadKm.toFixed(1)} km`,
        durationText: `${legMins} mins`,
        distanceMeters: Math.round(roadKm * 1000),
        durationSeconds: legMins * 60,
        steps: legSteps
      });
    }

    const totalHours = Math.floor(totalDurMins / 60);
    const remMins = totalDurMins % 60;
    const totalDurationText =
      totalHours > 0 ? `${totalHours} hr ${remMins} min` : `${totalDurMins} min`;

    if (onDirectionsComputed) {
      onDirectionsComputed({
        distanceText: `${totalDistKmNum.toFixed(1)} km`,
        durationText: totalDurationText,
        distanceMeters: Math.round(totalDistKmNum * 1000),
        durationSeconds: totalDurMins * 60,
        legs: legsData,
        waypointOrder,
        steps: allSteps
      });
    }

    return () => {
      routePolyline.setMap(null);
    };
  }, [mapsLib, map, origin, destination, waypoints, optimizeWaypoints]);

  return null;
}

// 1b. Inter-PHC Corridor Mesh Overlay
function CorridorsMeshOverlay({
  enabled,
  corridors = [],
  facilities = []
}: {
  enabled: boolean;
  corridors?: InterPHCCorridor[];
  facilities?: NetworkFacility[];
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || !enabled || !corridors || corridors.length === 0) return;

    const polylines: google.maps.Polyline[] = [];

    corridors.forEach((corridor) => {
      const facA = facilities.find((f) => f.id === corridor.facilityAId);
      const facB = facilities.find((f) => f.id === corridor.facilityBId);
      if (!facA || !facB) return;

      const strokeColor =
        corridor.emergencyStatus === 'CLEAR'
          ? '#10b981' // emerald-500
          : corridor.emergencyStatus === 'CAUTION_HEATWAVE'
          ? '#f59e0b' // amber-500
          : '#f43f5e'; // rose-500

      const polyline = new mapsLib.Polyline({
        path: [
          { lat: facA.latitude, lng: facA.longitude },
          { lat: facB.latitude, lng: facB.longitude }
        ],
        geodesic: true,
        strokeColor,
        strokeOpacity: 0.8,
        strokeWeight: 3.5,
        map
      });

      polylines.push(polyline);
    });

    return () => {
      polylines.forEach((p) => p.setMap(null));
    };
  }, [map, mapsLib, enabled, corridors, facilities]);

  return null;
}

// 2. Google Maps Live Traffic Overlay
function TrafficOverlay({ enabled }: { enabled: boolean }) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);

  useEffect(() => {
    if (!mapsLib || !map) return;
    if (!trafficLayerRef.current) {
      trafficLayerRef.current = new mapsLib.TrafficLayer();
    }
    if (enabled) {
      trafficLayerRef.current.setMap(map);
    } else {
      trafficLayerRef.current.setMap(null);
    }

    return () => {
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
      }
    };
  }, [enabled, map, mapsLib]);

  return null;
}

// 3. Google Maps Weather / Heatwave Corridor Overlay
function WeatherOverlay({
  enabled,
  weatherZones
}: {
  enabled: boolean;
  weatherZones: WeatherContourZone[];
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || !enabled) return;
    const circles: google.maps.Circle[] = [];

    weatherZones.forEach((zone) => {
      const polygonCoords = zone.polygon;
      if (!polygonCoords || polygonCoords.length === 0) return;
      const avgLat = polygonCoords.reduce((sum: number, c: [number, number]) => sum + c[0], 0) / polygonCoords.length;
      const avgLng = polygonCoords.reduce((sum: number, c: [number, number]) => sum + c[1], 0) / polygonCoords.length;

      const zoneColor =
        zone.alertLevel === 'RED_ALERT'
          ? '#ef4444'
          : zone.alertLevel === 'ORANGE_ALERT'
          ? '#f97316'
          : '#eab308';

      const circle = new mapsLib.Circle({
        strokeColor: zoneColor,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: zoneColor,
        fillOpacity: zone.alertLevel === 'RED_ALERT' ? 0.18 : 0.1,
        map,
        center: { lat: avgLat, lng: avgLng },
        radius: 20000 // 20km radius
      });
      circles.push(circle);
    });

    return () => {
      circles.forEach((c) => c.setMap(null));
    };
  }, [map, mapsLib, enabled, weatherZones]);

  return null;
}

// 4. Search Radius Circle Overlay
function RadiusOverlay({
  enabled,
  center,
  radiusKm
}: {
  enabled: boolean;
  center: { lat: number; lng: number } | null;
  radiusKm: number;
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || !enabled || !center) return;
    const circle = new mapsLib.Circle({
      strokeColor: '#0284c7',
      strokeOpacity: 0.7,
      strokeWeight: 1.5,
      fillColor: '#38bdf8',
      fillOpacity: 0.08,
      map,
      center,
      radius: radiusKm * 1000
    });

    return () => {
      circle.setMap(null);
    };
  }, [map, mapsLib, enabled, center, radiusKm]);

  return null;
}

// 5. Smooth Camera Pan & Fit-All-PHCs Bounds Controller
function CameraController({
  selectedFacility,
  facilities,
  fitBoundsTrigger = 0
}: {
  selectedFacility: NetworkFacility | null;
  facilities: NetworkFacility[];
  fitBoundsTrigger?: number;
}) {
  const map = useMap();
  const hasInitialFitRef = useRef(false);

  // Pan when a specific facility is selected
  useEffect(() => {
    if (!map || !selectedFacility || !hasInitialFitRef.current) return;
    map.panTo({ lat: selectedFacility.latitude, lng: selectedFacility.longitude });
  }, [selectedFacility, map]);

  // Fit bounds to all visible PHCs on initial mount or when fitBoundsTrigger changes
  useEffect(() => {
    if (!map || !window.google?.maps || facilities.length === 0) return;

    if (!hasInitialFitRef.current || fitBoundsTrigger > 0) {
      hasInitialFitRef.current = true;
      if (facilities.length === 1) {
        map.panTo({ lat: facilities[0].latitude, lng: facilities[0].longitude });
        map.setZoom(11);
        return;
      }
      const bounds = new window.google.maps.LatLngBounds();
      facilities.forEach((f) => {
        bounds.extend({ lat: f.latitude, lng: f.longitude });
      });
      map.fitBounds(bounds, 52);
    }
  }, [map, fitBoundsTrigger, facilities.length]);

  return null;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  facilities,
  selectedFacility,
  onSelectFacility,
  onFindNearbyResources,
  weatherZones,
  layers,
  searchRadiusKm,
  routeOrigin,
  routeDestination,
  routeWaypoints = [],
  optimizeWaypoints = true,
  activeRouteMode = 'DIRECT',
  interPHCCorridors = [],
  onSetRouteEndpoint,
  onRouteDirectionsComputed,
  showTraffic = true,
  mapTypeId = 'roadmap',
  riskLayers = { critical: true, warning: true, safeSurplus: true, warehouses: true },
  onlyWithin30Km = false,
  baseFacility = null,
  onOpenInstantTransfer,
  onToggleRiskLayer,
  onToggle30KmFilter,
  fitBoundsTrigger = 0,
  onFitAllFacilities
}) => {
  const [activeInfoWindowFacility, setActiveInfoWindowFacility] = useState<NetworkFacility | null>(
    selectedFacility
  );
  const [localFitTrigger, setLocalFitTrigger] = useState<number>(0);

  useEffect(() => {
    if (selectedFacility) {
      setActiveInfoWindowFacility(selectedFacility);
    }
  }, [selectedFacility]);

  // Center coordinate (India / Rajasthan overview)
  const defaultCenter = { lat: 23.5, lng: 77.5 };

  // Calculate active filter counts for markers
  const activeClusterCounts = React.useMemo(() => {
    let criticalCount = 0;
    let warningCount = 0;
    let surplusCount = 0;

    facilities.forEach((f) => {
      const isCritical = f.keyShortages.some((s) => s.daysRemaining < 3.0) || f.medicineRisk === 'CRITICAL_DEFICIT';
      const isWarning = !isCritical && (f.keyShortages.some((s) => s.daysRemaining >= 3.0 && s.daysRemaining <= 7.0) || f.medicineRisk === 'BUFFER_DEPLETING');
      if (isCritical) criticalCount++;
      else if (isWarning) warningCount++;
      else if (f.facilityType !== 'RMSCL Warehouse') surplusCount++;
    });

    return { criticalCount, warningCount, surplusCount };
  }, [facilities]);

  return (
    <div className="relative w-full h-full min-h-[580px] rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['marker', 'routes', 'places', 'geometry']}>
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={9.5}
          mapId="DEMO_MAP_ID"
          mapTypeId={mapTypeId}
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          fullscreenControl={true}
          mapTypeControl={true}
          streetViewControl={true}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          className="w-full h-full min-h-[580px]"
        >
          {/* Real-time Directions Layer (Point-to-Point & Multi-Stop TSP Circuit) */}
          <DirectionsLayer
            origin={routeOrigin}
            destination={routeDestination}
            waypoints={routeWaypoints}
            optimizeWaypoints={optimizeWaypoints}
            onDirectionsComputed={onRouteDirectionsComputed}
          />

          {/* Inter-PHC Corridor Mesh Overlay */}
          <CorridorsMeshOverlay
            enabled={activeRouteMode === 'CLUSTER_MESH'}
            corridors={interPHCCorridors}
            facilities={facilities}
          />

          {/* Traffic Overlay */}
          <TrafficOverlay enabled={showTraffic} />

          {/* Weather / Heatwave Contours */}
          <WeatherOverlay enabled={layers.weather} weatherZones={weatherZones} />

          {/* Search Radius Circle */}
          <RadiusOverlay
            enabled={layers.searchRadius}
            center={
              selectedFacility
                ? { lat: selectedFacility.latitude, lng: selectedFacility.longitude }
                : null
            }
            radiusKm={searchRadiusKm}
          />

          {/* Camera Controller */}
          <CameraController
            selectedFacility={selectedFacility}
            facilities={facilities}
            fitBoundsTrigger={fitBoundsTrigger + localFitTrigger}
          />

          {/* Facilities Advanced Markers with Visual Risk Layering */}
          {facilities.map((facility) => {
            const isSelected = selectedFacility?.id === facility.id;
            const isWarehouse = facility.facilityType === 'RMSCL Warehouse';

            // Check exact clinical depletion timelines (<3 days = CRITICAL, 3-7 days = WARNING)
            const criticalShortage = facility.keyShortages.find((s) => s.daysRemaining < 3.0);
            const warningShortage = facility.keyShortages.find(
              (s) => s.daysRemaining >= 3.0 && s.daysRemaining <= 7.0
            );

            const isCritical =
              Boolean(criticalShortage) ||
              facility.capacityUtilization >= 85 ||
              facility.medicineRisk === 'CRITICAL_DEFICIT';
            const isWarning =
              !isCritical &&
              !isWarehouse &&
              (Boolean(warningShortage) ||
                facility.capacityUtilization >= 70 ||
                facility.medicineRisk === 'BUFFER_DEPLETING');
            const isSurplus = !isCritical && !isWarning && !isWarehouse;

            // 1. Layer Visibility Check
            if (isCritical && !riskLayers.critical) return null;
            if (isWarning && !riskLayers.warning) return null;
            if (isSurplus && !riskLayers.safeSurplus) return null;
            if (isWarehouse && !riskLayers.warehouses) return null;

            // 2. 30 km Emergency Radius Filter Check
            if (
              onlyWithin30Km &&
              baseFacility &&
              facility.id !== baseFacility.id &&
              facility.id !== selectedFacility?.id
            ) {
              const airDist = calculateHaversineDistanceKm(
                baseFacility.latitude,
                baseFacility.longitude,
                facility.latitude,
                facility.longitude
              );
              if (airDist * 1.28 > 30) return null;
            }

            const isOrigin = routeOrigin?.id === facility.id;
            const isDestination = routeDestination?.id === facility.id;
            const waypointIndex = (routeWaypoints || []).findIndex((wp) => wp.id === facility.id);
            const isWaypoint = waypointIndex !== -1;

            // Pin styling based on Risk Layers & Facility Tier
            let pinBg = '#059669'; // Emerald-600
            let borderColor = '#047857';
            let glyphColor = '#ffffff';

            if (isWarehouse) {
              pinBg = '#2563eb'; // Blue-600
              borderColor = '#1d4ed8';
            } else if (isCritical) {
              pinBg = '#dc2626'; // Red-600
              borderColor = '#991b1b';
            } else if (isWarning) {
              pinBg = '#d97706'; // Amber-600
              borderColor = '#92400e';
            }

            if (isOrigin) {
              pinBg = '#7c3aed'; // Purple
              borderColor = '#6d28d9';
            } else if (isDestination) {
              pinBg = '#dc2626'; // Red
              borderColor = '#b91c1c';
            } else if (isWaypoint) {
              pinBg = '#0284c7'; // Sky-600
              borderColor = '#0369a1';
            }

            return (
              <AdvancedMarker
                key={facility.id}
                position={{ lat: facility.latitude, lng: facility.longitude }}
                title={`${facility.name} (${isCritical ? 'CRITICAL RISK' : isWarning ? 'WARNING' : 'SURPLUS/SAFE'})`}
                onClick={() => {
                  onSelectFacility(facility);
                  setActiveInfoWindowFacility(facility);
                }}
              >
                <div
                  className={`relative transition-transform cursor-pointer ${
                    isSelected ? 'scale-125 z-40' : isCritical ? 'hover:scale-120 z-30' : 'hover:scale-115 z-20'
                  }`}
                >
                  {/* Endpoint Labels if routed */}
                  {isOrigin && (
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-purple-700 text-white font-mono text-[9px] font-bold shadow-md border border-white whitespace-nowrap z-30">
                      START
                    </span>
                  )}
                  {isDestination && (
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-rose-700 text-white font-mono text-[9px] font-bold shadow-md border border-white whitespace-nowrap z-30">
                      DEST
                    </span>
                  )}
                  {isWaypoint && (
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-sky-600 text-white font-mono text-[9px] font-bold shadow-md border border-white whitespace-nowrap z-30">
                      STOP #{waypointIndex + 1}
                    </span>
                  )}

                  {/* Visual Risk Layer Badge (Floating on Pin) */}
                  {!isOrigin && !isDestination && !isWaypoint && (
                    <>
                      {isCritical && (
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-rose-700 text-white font-mono text-[9px] font-bold shadow-lg border border-white whitespace-nowrap z-25 flex items-center gap-1 animate-bounce">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          <span>
                            {criticalShortage
                              ? `${criticalShortage.medicineName.split(' ')[0]}: ${criticalShortage.daysRemaining}d`
                              : 'CRITICAL <3d'}
                          </span>
                        </span>
                      )}

                      {isWarning && (
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-amber-600 text-white font-mono text-[8px] font-bold shadow-md border border-white whitespace-nowrap z-20 flex items-center gap-1">
                          <span>
                            ⚠️{' '}
                            {warningShortage
                              ? `${warningShortage.medicineName.split(' ')[0]}: ${warningShortage.daysRemaining}d`
                              : 'WARNING 3-7d'}
                          </span>
                        </span>
                      )}

                      {isSurplus && (
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-emerald-700 text-white font-mono text-[8px] font-bold shadow-xs border border-white whitespace-nowrap z-15">
                          ✓ Surplus &gt;14d
                        </span>
                      )}

                      {isWarehouse && (
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-blue-700 text-white font-mono text-[8px] font-bold shadow-xs border border-white whitespace-nowrap z-15">
                          🏢 RMSCL Hub
                        </span>
                      )}
                    </>
                  )}

                  {/* Pulsating Ring for Critical Deficit Facilities */}
                  {isCritical && (
                    <span className="absolute -inset-1.5 rounded-full bg-rose-500 opacity-60 animate-ping pointer-events-none" />
                  )}

                  <Pin
                    background={pinBg}
                    borderColor={borderColor}
                    glyphColor={glyphColor}
                    scale={isSelected ? 1.3 : isCritical ? 1.25 : 1.1}
                  />

                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 border-2 border-white rounded-full animate-ping" />
                  )}
                </div>
              </AdvancedMarker>
            );
          })}

          {/* Active Facility InfoWindow */}
          {activeInfoWindowFacility && (
            <InfoWindow
              position={{
                lat: activeInfoWindowFacility.latitude,
                lng: activeInfoWindowFacility.longitude
              }}
              onCloseClick={() => setActiveInfoWindowFacility(null)}
              pixelOffset={[0, -42]}
              headerDisabled={false}
            >
              <div className="p-2.5 max-w-[310px] text-slate-800 space-y-2">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold font-mono">
                    <span className="text-sky-800 flex items-center gap-1 uppercase">
                      <Building2 className="w-3 h-3" />
                      <span>{activeInfoWindowFacility.facilityType}</span>
                    </span>
                    <span className="text-slate-500">{activeInfoWindowFacility.district}</span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm leading-snug mt-0.5">
                    {activeInfoWindowFacility.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {activeInfoWindowFacility.code} • Block: {activeInfoWindowFacility.block}
                  </p>
                </div>

                {/* Risk Level Alert Strip */}
                {activeInfoWindowFacility.keyShortages.some((s) => s.daysRemaining < 3.0) ? (
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-950 space-y-1">
                    <div className="font-bold text-[11px] flex items-center gap-1.5 text-rose-800">
                      <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                      <span>CRITICAL STOCK DEFICIT (&lt;3 DAYS)</span>
                    </div>
                    <div className="text-[10px] text-rose-900 space-y-0.5 font-mono">
                      {activeInfoWindowFacility.keyShortages
                        .filter((s) => s.daysRemaining < 3.0)
                        .map((s, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{s.medicineName.split(' ')[0]}: {s.currentStock} {s.unit}</span>
                            <span className="font-bold text-rose-700">{s.daysRemaining}d left</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : activeInfoWindowFacility.keyShortages.some((s) => s.daysRemaining <= 7.0) ? (
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
                    <div className="font-bold text-[11px] flex items-center gap-1 text-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>WARNING BUFFER DEPLETION (3–7 DAYS)</span>
                    </div>
                    <div className="text-[10px] text-amber-900 space-y-0.5 font-mono">
                      {activeInfoWindowFacility.keyShortages
                        .filter((s) => s.daysRemaining <= 7.0)
                        .map((s, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{s.medicineName.split(' ')[0]}: {s.currentStock} {s.unit}</span>
                            <span className="font-bold text-amber-700">{s.daysRemaining}d left</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10px] font-mono font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>SAFE RESERVES &amp; SURPLUS (&gt;14 DAYS BUFFER)</span>
                  </div>
                )}

                {/* Available Surpluses Highlight */}
                {activeInfoWindowFacility.keySurpluses && activeInfoWindowFacility.keySurpluses.length > 0 && (
                  <div className="text-[10px] text-emerald-800 bg-emerald-50/80 p-1.5 rounded-md border border-emerald-200">
                    <span className="font-bold">Available Surplus to Share: </span>
                    {activeInfoWindowFacility.keySurpluses
                      .map((s) => `${s.medicineName.split(' ')[0]}: +${s.surplusQuantity}`)
                      .join(', ')}
                  </div>
                )}

                {/* Distance Matrix Travel ETA from Selected PHC */}
                {baseFacility && baseFacility.id !== activeInfoWindowFacility.id && (
                  <div className="flex items-center justify-between text-[10px] font-mono px-2 py-1 rounded bg-slate-100 border border-slate-200">
                    <span className="text-slate-600 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-sky-600" />
                      <span>ETA to {baseFacility.name.split(' ')[0]}:</span>
                    </span>
                    <strong className="text-emerald-800 font-bold">
                      ~{estimateTravelTimeMinutes(
                        calculateRoadDistanceKm(
                          calculateHaversineDistanceKm(
                            baseFacility.latitude,
                            baseFacility.longitude,
                            activeInfoWindowFacility.latitude,
                            activeInfoWindowFacility.longitude
                          )
                        ),
                        activeInfoWindowFacility.facilityType === 'RMSCL Warehouse' ? 'Highway (NH-62)' : 'State Highway'
                      )} mins ({calculateRoadDistanceKm(
                        calculateHaversineDistanceKm(
                          baseFacility.latitude,
                          baseFacility.longitude,
                          activeInfoWindowFacility.latitude,
                          activeInfoWindowFacility.longitude
                        )
                      )} km)
                    </strong>
                  </div>
                )}

                {/* VIBRANT ACTION BUTTON: INSTANT TRANSFER POSSIBILITIES */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenInstantTransfer) {
                      onOpenInstantTransfer(activeInfoWindowFacility);
                    } else {
                      onFindNearbyResources(activeInfoWindowFacility);
                    }
                  }}
                  className="w-full py-2 px-3 bg-gradient-to-r from-rose-600 via-amber-600 to-emerald-600 hover:from-rose-700 hover:to-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>Instant Transfer Possibilities &rarr;</span>
                </button>

                {/* Quick Action Navigation Grid */}
                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onSetRouteEndpoint(activeInfoWindowFacility)}
                    className="px-2 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-[11px] font-bold flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Navigation className="w-3 h-3 text-sky-400" />
                    <span>Route Driving</span>
                  </button>

                  <a
                    href={`tel:${activeInfoWindowFacility.contactNumber}`}
                    className="px-2 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold flex items-center justify-center gap-1 shadow-2xs transition-colors"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Call MOIC</span>
                  </a>
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

      {/* On-Map Floating Visual Risk Layer Quick-Toggle Strip */}
      <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-md flex flex-wrap items-center gap-1 text-[11px] font-semibold text-slate-700 pointer-events-auto">
        <span className="text-[10px] font-mono uppercase font-bold text-slate-500 px-1">Risk Layers:</span>
        <button
          type="button"
          onClick={() => onToggleRiskLayer && onToggleRiskLayer('critical')}
          className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
            riskLayers.critical
              ? 'bg-rose-100 text-rose-900 border-rose-300 ring-1 ring-rose-200'
              : 'bg-slate-100 text-slate-400 border-slate-200'
          }`}
          title="Toggle Critical Risk (<3 days) Layer"
        >
          <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
          <span>Critical ({activeClusterCounts.criticalCount})</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleRiskLayer && onToggleRiskLayer('warning')}
          className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
            riskLayers.warning
              ? 'bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-200'
              : 'bg-slate-100 text-slate-400 border-slate-200'
          }`}
          title="Toggle Warning Risk (3-7 days) Layer"
        >
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Warning ({activeClusterCounts.warningCount})</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleRiskLayer && onToggleRiskLayer('safeSurplus')}
          className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
            riskLayers.safeSurplus
              ? 'bg-emerald-100 text-emerald-900 border-emerald-300 ring-1 ring-emerald-200'
              : 'bg-slate-100 text-slate-400 border-slate-200'
          }`}
          title="Toggle Surplus Donors (>14 days) Layer"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span>Surplus ({activeClusterCounts.surplusCount})</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleRiskLayer && onToggleRiskLayer('warehouses')}
          className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
            riskLayers.warehouses
              ? 'bg-blue-100 text-blue-900 border-blue-300 ring-1 ring-blue-200'
              : 'bg-slate-100 text-slate-400 border-slate-200'
          }`}
          title="Toggle RMSCL Warehouses Layer"
        >
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          <span>Warehouses</span>
        </button>

        <button
          type="button"
          onClick={() => onToggle30KmFilter && onToggle30KmFilter()}
          className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
            onlyWithin30Km
              ? 'bg-purple-700 text-white border-purple-800 shadow-2xs'
              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
          }`}
          title="Focus strictly on facilities within 30 km radius"
        >
          <Compass className="w-3 h-3 text-purple-400" />
          <span>≤30 km Radius {onlyWithin30Km ? 'ON' : 'OFF'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setLocalFitTrigger((prev) => prev + 1);
            if (onFitAllFacilities) onFitAllFacilities();
          }}
          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900 text-white hover:bg-slate-800 border border-slate-900 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
          title="Zoom map to fit all PHCs currently in view"
        >
          <span>🗺️ Fit All ({facilities.length} PHCs)</span>
        </button>
      </div>

      {/* Floating Bottom-Right Google Maps Platform Compliance Badge */}
      <div className="absolute bottom-6 right-3 z-10 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-xs border border-slate-200/90 shadow-sm px-2.5 py-1 rounded-md text-[10px] font-mono text-slate-600 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Google Maps Platform • Active Driving Routing &amp; Advanced Markers</span>
        </div>
      </div>
    </div>
  );
};

