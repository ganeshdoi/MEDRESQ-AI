/// <reference types="google.maps" />
import { NetworkFacility, DistanceMatrixTransportEstimate } from '../types.ts';
import {
  calculateHaversineDistanceKm,
  calculateRoadDistanceKm,
  estimateTravelTimeMinutes
} from '../data/networkData.ts';

export interface DistanceMatrixQueryOptions {
  origin: NetworkFacility;
  destinations: NetworkFacility[];
  medicineName?: string;
  travelMode?: 'DRIVING' | 'TWO_WHEELER';
}

/**
 * Computes live transport times and distances between a selected PHC and multiple surplus facilities
 * using Google Maps spherical geometry & calibrated NH/SH road-network models without invoking
 * the deprecated legacy DistanceMatrixService endpoint.
 */
export async function computeMedicalTransportMatrix({
  origin,
  destinations,
  medicineName,
  travelMode = 'DRIVING'
}: DistanceMatrixQueryOptions): Promise<DistanceMatrixTransportEstimate[]> {
  if (!origin || !destinations || destinations.length === 0) {
    return [];
  }

  // 1. Filter out the origin if it was included in destinations and sort by proximity
  const validDestinations = [...destinations]
    .filter((d) => d.id !== origin.id)
    .sort((a, b) => {
      const distA = calculateHaversineDistanceKm(origin.latitude, origin.longitude, a.latitude, a.longitude);
      const distB = calculateHaversineDistanceKm(origin.latitude, origin.longitude, b.latitude, b.longitude);
      return distA - distB;
    });

  if (validDestinations.length === 0) {
    return [];
  }

  // Determine cold-chain requirements
  const isColdChain =
    Boolean(medicineName) &&
    (medicineName!.toLowerCase().includes('snake') ||
      medicineName!.toLowerCase().includes('asv') ||
      medicineName!.toLowerCase().includes('oxytocin') ||
      medicineName!.toLowerCase().includes('vaccine'));

  const hasGoogleMapsGeometry =
    typeof window !== 'undefined' &&
    Boolean(window.google?.maps?.geometry?.spherical?.computeDistanceBetween);

  return validDestinations.map((dest) => {
    const matchingSurplus = medicineName
      ? dest.keySurpluses.find((s) =>
          s.medicineName.toLowerCase().includes(medicineName.split(' ')[0].toLowerCase())
        )
      : dest.keySurpluses[0];

    let airDistanceKm: number;
    if (hasGoogleMapsGeometry && window.google?.maps?.LatLng) {
      try {
        const fromLatLng = new window.google.maps.LatLng(origin.latitude, origin.longitude);
        const toLatLng = new window.google.maps.LatLng(dest.latitude, dest.longitude);
        const meters = window.google.maps.geometry.spherical.computeDistanceBetween(fromLatLng, toLatLng);
        airDistanceKm = meters / 1000;
      } catch {
        airDistanceKm = calculateHaversineDistanceKm(
          origin.latitude,
          origin.longitude,
          dest.latitude,
          dest.longitude
        );
      }
    } else {
      airDistanceKm = calculateHaversineDistanceKm(
        origin.latitude,
        origin.longitude,
        dest.latitude,
        dest.longitude
      );
    }

    const distanceKm = calculateRoadDistanceKm(airDistanceKm);
    const distanceText = `${distanceKm.toFixed(1)} km`;

    const highwayType =
      dest.facilityType === 'RMSCL Warehouse'
        ? 'Highway (NH-62)'
        : distanceKm > 40
        ? 'State Highway'
        : 'Rural / Desert Road';

    const baseDurationMinutes = estimateTravelTimeMinutes(distanceKm, highwayType);
    const durationMinutes =
      travelMode === 'TWO_WHEELER'
        ? Math.max(5, Math.round(baseDurationMinutes * 0.92))
        : baseDurationMinutes;

    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    const durationText = hours > 0 ? `${hours} hr ${mins} mins` : `${durationMinutes} mins`;
    const trafficBufferMinutes = Math.max(2, Math.round(durationMinutes * 1.08));
    const durationInTrafficText = `${trafficBufferMinutes} mins (est. +8% buffer)`;

    const logisticsMode: DistanceMatrixTransportEstimate['transportMode'] = isColdChain
      ? '108 Ambulance (Cold-Chain)'
      : dest.facilityType === 'RMSCL Warehouse'
      ? 'RMSCL Heavy Reefer'
      : distanceKm <= 15
      ? 'Rapid Two-Wheeler'
      : 'Block Mobile Courier';

    const priority: DistanceMatrixTransportEstimate['emergencyPriority'] =
      isColdChain || durationMinutes <= 30
        ? 'CRITICAL_URGENT'
        : durationMinutes <= 60
        ? 'HIGH'
        : 'ROUTINE';

    return {
      originFacilityId: origin.id,
      originFacilityName: origin.name,
      surplusFacilityId: dest.id,
      surplusFacility: dest,
      medicineName: matchingSurplus?.medicineName || medicineName,
      surplusQuantity: matchingSurplus?.surplusQuantity,
      unit: matchingSurplus?.unit || 'Units',
      distanceKm,
      distanceText,
      durationMinutes,
      durationText,
      durationInTrafficText,
      status: 'OK',
      isRealtimeGoogleDistanceMatrix: false,
      transportMode: logisticsMode,
      emergencyPriority: priority
    };
  });
}

