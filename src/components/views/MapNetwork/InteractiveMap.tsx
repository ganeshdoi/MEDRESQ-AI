import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  NetworkFacility,
  LogisticsTransitRoute,
  RedistributionLink,
  WeatherContourZone
} from '../../../types.ts';

interface InteractiveMapProps {
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
  onSetRouteEndpoint: (facility: NetworkFacility) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  facilities,
  selectedFacility,
  onSelectFacility,
  onFindNearbyResources,
  routes,
  redistributionLinks,
  weatherZones,
  layers,
  searchRadiusKm,
  routeOrigin,
  routeDestination,
  onSetRouteEndpoint
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layers feature groups
  const facilitiesLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const redistributionsLayerRef = useRef<L.LayerGroup | null>(null);
  const weatherLayerRef = useRef<L.LayerGroup | null>(null);
  const radiusLayerRef = useRef<L.LayerGroup | null>(null);
  const activeRouteLineRef = useRef<L.Polyline | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center: Osian, Jodhpur (26.726, 72.912), Zoom: 9.5
      const map = L.map(mapContainerRef.current, {
        center: [26.65, 72.95],
        zoom: 9.5,
        zoomControl: false,
        attributionControl: true
      });

      // High quality CartoDB Positron Clean Map Tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      // Reposition zoom control to top-left
      L.control.zoom({ position: 'topleft' }).addTo(map);

      // Create Layer Groups
      weatherLayerRef.current = L.layerGroup().addTo(map);
      redistributionsLayerRef.current = L.layerGroup().addTo(map);
      routesLayerRef.current = L.layerGroup().addTo(map);
      facilitiesLayerRef.current = L.layerGroup().addTo(map);
      radiusLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Weather Heatwave Contour Polygons
  useEffect(() => {
    const group = weatherLayerRef.current;
    if (!group) return;
    group.clearLayers();

    if (!layers.weather) return;

    weatherZones.forEach((zone) => {
      let fillColor = '#f59e0b';
      let strokeColor = '#d97706';

      if (zone.alertLevel === 'RED_ALERT') {
        fillColor = '#ef4444';
        strokeColor = '#dc2626';
      } else if (zone.alertLevel === 'ORANGE_ALERT') {
        fillColor = '#f97316';
        strokeColor = '#ea580c';
      } else if (zone.alertLevel === 'YELLOW_ALERT') {
        fillColor = '#eab308';
        strokeColor = '#ca8a04';
      }

      const polygon = L.polygon(zone.polygon as [number, number][], {
        color: strokeColor,
        weight: 2,
        dashArray: '4, 4',
        fillColor: fillColor,
        fillOpacity: 0.12
      });

      polygon.bindTooltip(
        `<div style="font-family: sans-serif; font-size: 11px; padding: 4px;">
          <strong style="color: ${strokeColor}; font-weight: bold;">${zone.name}</strong><br/>
          <span>Ambient Temp: <strong>${zone.ambientTempC}°C</strong> | Heat Index: <strong>${zone.heatIndexC}°C</strong></span><br/>
          <span style="font-size: 10px; color: #475569;">${zone.advisoryText}</span>
        </div>`,
        { sticky: true, opacity: 0.95 }
      );

      polygon.addTo(group);
    });
  }, [weatherZones, layers.weather]);

  // Update Lateral Redistribution Links Layer
  useEffect(() => {
    const group = redistributionsLayerRef.current;
    if (!group) return;
    group.clearLayers();

    if (!layers.redistributions) return;

    redistributionLinks.forEach((link) => {
      const source = facilities.find((f) => f.id === link.sourceFacilityId);
      const dest = facilities.find((f) => f.id === link.destinationFacilityId);

      if (!source || !dest) return;

      const latlngs: [number, number][] = [
        [source.latitude, source.longitude],
        [dest.latitude, dest.longitude]
      ];

      // Draw dashed transfer vector line
      const line = L.polyline(latlngs, {
        color: link.urgency === 'CRITICAL' ? '#e11d48' : '#2563eb',
        weight: 3,
        dashArray: '6, 8',
        opacity: 0.85
      });

      line.bindTooltip(
        `<div style="font-family: sans-serif; font-size: 11px; padding: 4px;">
          <strong>Lateral Transfer Proposal:</strong><br/>
          <span>${source.name} &rarr; ${dest.name}</span><br/>
          <strong style="color: #059669;">+${link.recommendedQuantity} ${link.unit}</strong> of ${link.medicineName}<br/>
          <span>Distance: ${link.distanceKm} km (~${link.estimatedTransitHours} hrs)</span><br/>
          <span style="font-size: 10px; color: #b45309; font-weight: bold;">Status: ${link.status.replace('_', ' ')} (Requires Approval)</span>
        </div>`,
        { sticky: true, opacity: 0.95 }
      );

      line.addTo(group);

      // Midpoint Transfer Quantity Badge
      const midLat = (source.latitude + dest.latitude) / 2;
      const midLng = (source.longitude + dest.longitude) / 2;

      const badgeIcon = L.divIcon({
        className: 'custom-transfer-badge',
        html: `
          <div style="background: white; border: 1.5px solid ${link.urgency === 'CRITICAL' ? '#e11d48' : '#2563eb'}; border-radius: 9999px; padding: 2px 6px; font-size: 9px; font-weight: bold; color: #0f172a; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 3px;">
            <span>⇄</span>
            <span>+${link.recommendedQuantity}</span>
          </div>
        `,
        iconSize: [60, 20],
        iconAnchor: [30, 10]
      });

      L.marker([midLat, midLng], { icon: badgeIcon }).addTo(group);
    });
  }, [redistributionLinks, facilities, layers.redistributions]);

  // Update Logistics Transit Routes Layer
  useEffect(() => {
    const group = routesLayerRef.current;
    if (!group) return;
    group.clearLayers();

    if (!layers.logistics) return;

    routes.forEach((route) => {
      // Draw road transit route line
      const polyline = L.polyline(route.waypoints, {
        color: route.priority === 'EMERGENCY_REPLENISHMENT' ? '#d97706' : '#3b82f6',
        weight: 4,
        opacity: 0.8
      });

      polyline.bindTooltip(
        `<div style="font-family: sans-serif; font-size: 11px; padding: 4px;">
          <strong>Consignment ${route.consignmentId}</strong> (${route.priority})<br/>
          <span>${route.originName} &rarr; ${route.destinationName}</span><br/>
          <span>Cargo: ${route.cargoDescription}</span><br/>
          <span>Vehicle: ${route.vehicleNumber} (${route.driverName})</span><br/>
          <strong>ETA: ${route.etaMinutes} mins</strong> | Progress: ${route.progressPercent}%
        </div>`,
        { sticky: true }
      );

      polyline.addTo(group);

      // Animated Truck Location Marker
      const truckIcon = L.divIcon({
        className: 'custom-truck-marker',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            <div style="background: #1e293b; color: white; border: 2px solid ${route.priority === 'EMERGENCY_REPLENISHMENT' ? '#f59e0b' : '#3b82f6'}; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
              🚚
            </div>
            ${route.reeferTempC ? `
              <div style="position: absolute; -top: 8px; right: -8px; background: #0284c7; color: white; font-size: 8px; font-weight: bold; border-radius: 4px; padding: 1px 3px; font-family: monospace;">
                ${route.reeferTempC}°C
              </div>
            ` : ''}
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const truckMarker = L.marker(route.currentPosition, { icon: truckIcon });
      truckMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; min-width: 200px;">
          <div style="font-weight: bold; color: #0f172a; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
            🚚 Dispatched Supply Vehicle: ${route.vehicleNumber}
          </div>
          <div style="font-size: 11px; color: #475569;">
            <strong>Consignment:</strong> ${route.consignmentId}<br/>
            <strong>Route:</strong> ${route.originName} &rarr; ${route.destinationName}<br/>
            <strong>Cargo:</strong> ${route.cargoDescription}<br/>
            <strong>Driver:</strong> ${route.driverName} (${route.driverContact})<br/>
            <strong>Progress:</strong> ${route.progressPercent}% (${route.etaMinutes} mins to delivery)<br/>
            ${route.reeferTempC ? `<strong>Cold-Chain Temp:</strong> <span style="color: #0284c7; font-weight: bold;">${route.reeferTempC}°C Potency Stable</span>` : ''}
          </div>
        </div>
      `);

      truckMarker.addTo(group);
    });
  }, [routes, layers.logistics]);

  // Update Facility Markers Layer
  useEffect(() => {
    const group = facilitiesLayerRef.current;
    if (!group) return;
    group.clearLayers();

    if (!layers.facilities) return;

    facilities.forEach((fac) => {
      const isSelected = selectedFacility?.id === fac.id;
      const isOrigin = routeOrigin?.id === fac.id;
      const isDest = routeDestination?.id === fac.id;

      // Color scheme based on facility type & medicine risk
      let bgTheme = '#059669'; // Emerald default
      let iconSymbol = '🏥';

      if (fac.facilityType === 'RMSCL Warehouse') {
        bgTheme = '#2563eb'; // Blue
        iconSymbol = '📦';
      } else if (fac.facilityType === 'CHC') {
        bgTheme = '#7c3aed'; // Purple
        iconSymbol = '🏛️';
      } else if (fac.facilityType === 'Sub-Centre') {
        bgTheme = '#0891b2'; // Teal
        iconSymbol = '🏡';
      }

      // Border and halo indicator for risk
      let ringColor = '#cbd5e1';
      let pulseHtml = '';

      if (fac.medicineRisk === 'CRITICAL_DEFICIT') {
        ringColor = '#e11d48'; // Red alert
        pulseHtml = `<div style="position: absolute; inset: -4px; border-radius: 9999px; background: rgba(225, 29, 72, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`;
      } else if (fac.medicineRisk === 'BUFFER_DEPLETING') {
        ringColor = '#f59e0b'; // Amber warning
      } else if (fac.medicineRisk === 'SURPLUS_AVAILABLE') {
        ringColor = '#10b981'; // Green surplus
      }

      if (isSelected || isOrigin || isDest) {
        ringColor = isOrigin ? '#3b82f6' : isDest ? '#10b981' : '#0f172a';
      }

      const customHtml = `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          ${pulseHtml}
          <div style="background: ${bgTheme}; width: 32px; height: 32px; border-radius: 9999px; border: 2.5px solid ${ringColor}; display: flex; align-items: center; justify-content: center; font-size: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.25); color: white; transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'}; transition: transform 0.2s;">
            ${iconSymbol}
          </div>
          ${fac.keyShortages.length > 0 ? `
            <div style="position: absolute; top: -2px; right: -2px; background: #e11d48; color: white; font-size: 9px; font-weight: bold; width: 14px; height: 14px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; border: 1.5px solid white;">
              !
            </div>
          ` : ''}
          ${fac.keySurpluses.length > 0 && fac.keyShortages.length === 0 ? `
            <div style="position: absolute; top: -2px; right: -2px; background: #059669; color: white; font-size: 9px; font-weight: bold; width: 14px; height: 14px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; border: 1.5px solid white;">
              +
            </div>
          ` : ''}
        </div>
      `;

      const markerIcon = L.divIcon({
        className: 'custom-facility-pin',
        html: customHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([fac.latitude, fac.longitude], { icon: markerIcon });

      // Click Event to select facility
      marker.on('click', () => {
        onSelectFacility(fac);
      });

      // Quick Popup
      const shortageCount = fac.keyShortages.length;
      const surplusCount = fac.keySurpluses.length;

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; min-width: 220px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: bold; font-family: monospace; background: #f1f5f9; padding: 1px 4px; border-radius: 4px; color: #475569;">
              ${fac.facilityType}
            </span>
            <span style="font-size: 10px; color: #64748b;">${fac.district}</span>
          </div>

          <div style="font-weight: bold; font-size: 13px; color: #0f172a; margin-bottom: 2px;">
            ${fac.name}
          </div>

          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
            MOIC: <strong>${fac.medicalOfficerInCharge}</strong><br/>
            Bed Occupancy: <strong>${fac.occupiedBeds} / ${fac.sanctionedBeds} (${fac.capacityUtilization}%)</strong>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px; font-size: 10px; text-align: center;">
            <div style="background: ${fac.operationalRisk === 'CRITICAL' ? '#fee2e2' : '#f8fafc'}; color: ${fac.operationalRisk === 'CRITICAL' ? '#991b1b' : '#334155'}; padding: 3px; border-radius: 4px; font-weight: bold;">
              Risk: ${fac.operationalRisk}
            </div>
            <div style="background: ${shortageCount > 0 ? '#fee2e2' : surplusCount > 0 ? '#dcfce7' : '#f8fafc'}; color: ${shortageCount > 0 ? '#991b1b' : surplusCount > 0 ? '#166534' : '#334155'}; padding: 3px; border-radius: 4px; font-weight: bold;">
              ${shortageCount > 0 ? `${shortageCount} Deficits` : surplusCount > 0 ? `${surplusCount} Surpluses` : 'Adequate'}
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 4px;">
            <button
              id="btn-inspect-${fac.id}"
              style="width: 100%; background: #0f172a; color: white; border: none; border-radius: 6px; padding: 5px 8px; font-size: 11px; font-weight: bold; cursor: pointer;"
            >
              Inspect Details & Route &rarr;
            </button>
            ${shortageCount > 0 ? `
              <button
                id="btn-surplus-${fac.id}"
                style="width: 100%; background: #047857; color: white; border: none; border-radius: 6px; padding: 5px 8px; font-size: 11px; font-weight: bold; cursor: pointer;"
              >
                ✨ Find Nearby Resources
              </button>
            ` : ''}
          </div>
        </div>
      `);

      marker.on('popupopen', () => {
        const inspectBtn = document.getElementById(`btn-inspect-${fac.id}`);
        if (inspectBtn) {
          inspectBtn.onclick = () => onSelectFacility(fac);
        }
        const surplusBtn = document.getElementById(`btn-surplus-${fac.id}`);
        if (surplusBtn) {
          surplusBtn.onclick = () => onFindNearbyResources(fac);
        }
      });

      marker.addTo(group);
    });
  }, [facilities, selectedFacility, routeOrigin, routeDestination, layers.facilities, onSelectFacility, onFindNearbyResources]);

  // Update Search Radius Circle
  useEffect(() => {
    const group = radiusLayerRef.current;
    if (!group) return;
    group.clearLayers();

    if (!layers.searchRadius || !selectedFacility) return;

    const circle = L.circle([selectedFacility.latitude, selectedFacility.longitude], {
      radius: searchRadiusKm * 1000,
      color: '#059669',
      weight: 1.5,
      dashArray: '4, 4',
      fillColor: '#10b981',
      fillOpacity: 0.08
    });

    circle.addTo(group);
  }, [selectedFacility, layers.searchRadius, searchRadiusKm]);

  // Update Route Polyline between Route Origin & Destination
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeRouteLineRef.current) {
      map.removeLayer(activeRouteLineRef.current);
      activeRouteLineRef.current = null;
    }

    if (routeOrigin && routeDestination) {
      const latlngs: [number, number][] = [
        [routeOrigin.latitude, routeOrigin.longitude],
        // Midpoint bend for road realism
        [
          (routeOrigin.latitude + routeDestination.latitude) / 2 + 0.02,
          (routeOrigin.longitude + routeDestination.longitude) / 2 - 0.03
        ],
        [routeDestination.latitude, routeDestination.longitude]
      ];

      const line = L.polyline(latlngs, {
        color: '#2563eb',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.9
      }).addTo(map);

      activeRouteLineRef.current = line;
      map.fitBounds(line.getBounds(), { padding: [60, 60] });
    }
  }, [routeOrigin, routeDestination]);

  // Center on Selected Facility when changed
  useEffect(() => {
    if (!selectedFacility || !mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo(
      [selectedFacility.latitude, selectedFacility.longitude],
      11,
      { duration: 0.8 }
    );
  }, [selectedFacility]);

  return (
    <div className="relative w-full h-full min-h-[550px] rounded-2xl overflow-hidden shadow-inner border border-slate-200">
      <div ref={mapContainerRef} className="w-full h-full min-h-[550px]" tabIndex={0} />
    </div>
  );
};
