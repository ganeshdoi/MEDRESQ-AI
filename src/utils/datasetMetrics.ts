import { INDIA_PHC_DIRECTORY } from '../data/indiaPHCDirectory.ts';
import { NATIONAL_ESSENTIAL_MEDICINES_LIST } from '../data/nationalEssentialMedicines.ts';
import {
  MedicineItem,
  OperationalAlert,
  LogisticsOrder,
  RedistributionOpportunity,
  ProactiveStockAlert,
  PHCFacility,
  NetworkFacility
} from '../types.ts';
import {
  evaluateMedicineThresholdAndReplenishment,
  calculateMedicineForecast
} from './inventoryForecast.ts';

/**
 * Single Source of Truth for Dataset Scope, Provenance, and Reference Formulary Constants.
 * All UI headers, cards, badges, and disclaimers derive their counts and labels from here.
 *
 * DATA MODE:
 * - Rajasthan PHCs: 59
 * - Total demo PHC profiles: 96
 * - Essential medicines: 51 NLEM medicines
 * - Active facility: PHC Osian (24x7)
 */
export const DATA_MODE_CONFIG = {
  rajasthanPhcsCount: INDIA_PHC_DIRECTORY.filter((p) => p.state === 'Rajasthan').length, // 59
  totalDemoPhcProfilesCount: INDIA_PHC_DIRECTORY.length, // 96
  essentialMedicinesNlemCount: NATIONAL_ESSENTIAL_MEDICINES_LIST.length, // 51
  activeFacilityDefaultId: 'phc-osian',
  activeFacilityDefaultName: 'PHC Osian (24x7)',
  datasetBadgeLabel: 'Prototype • Synthetic Dataset',
  referenceFormularyLabel: `Reference Formulary: NLEM 2022 (${NATIONAL_ESSENTIAL_MEDICINES_LIST.length} Essential Medicines)`,
  syntheticDataDisclaimer:
    'Prototype • Synthetic Dataset — All facility profiles, stock levels, batch expiry dates, alerts, and demand forecasts are synthetic demonstration data and not official government records.'
} as const;

export interface DatasetFacilityMetrics {
  totalDemoPhcProfilesCount: number;
  rajasthanPhcsCount: number;
  otherStatesDemoPhcsCount: number;
  essentialMedicinesNlemCount: number;
  statesCount: number;
  districtsCount: number;
  rajasthanDistrictsCount: number;
  // Unified aliases for all views
  samplePhcTotalCount: number;
  rajasthanPhcCount: number;
  otherStatesPhcCount: number;
  nlemCatalogueCount: number;
  nlemMedicineCount: number;
  facilityTrackedMedCount: number;
  networkMapTotalCount: number;
  networkMapMappedPhcCount: number;
  networkMapUnmappedCount: number;
  activeFacilityDefaultName: string;
  datasetBadgeLabel: string;
  demoDisclaimerShort: string;
}

export function getDatasetFacilityMetrics(
  facilities: PHCFacility[] = INDIA_PHC_DIRECTORY,
  facilityMedCount: number = NATIONAL_ESSENTIAL_MEDICINES_LIST.length
): DatasetFacilityMetrics {
  const safeFacilities = Array.isArray(facilities) ? facilities : INDIA_PHC_DIRECTORY;
  const rajasthanPhcs = safeFacilities.filter((p) => p.state === 'Rajasthan');
  const statesSet = new Set(safeFacilities.map((p) => p.state));
  const districtsSet = new Set(safeFacilities.map((p) => `${p.state}:${p.district}`));
  const rajasthanDistrictsSet = new Set(rajasthanPhcs.map((p) => p.district));

  const totalCount = safeFacilities.length;
  const rjCount = rajasthanPhcs.length;
  const otherCount = totalCount - rjCount;
  const nlemCount = NATIONAL_ESSENTIAL_MEDICINES_LIST.length;

  return {
    totalDemoPhcProfilesCount: totalCount,
    rajasthanPhcsCount: rjCount,
    otherStatesDemoPhcsCount: otherCount,
    essentialMedicinesNlemCount: nlemCount,
    statesCount: statesSet.size,
    districtsCount: districtsSet.size,
    rajasthanDistrictsCount: rajasthanDistrictsSet.size,
    samplePhcTotalCount: totalCount,
    rajasthanPhcCount: rjCount,
    otherStatesPhcCount: otherCount,
    nlemCatalogueCount: nlemCount,
    nlemMedicineCount: nlemCount,
    facilityTrackedMedCount: facilityMedCount,
    networkMapTotalCount: totalCount,
    networkMapMappedPhcCount: totalCount,
    networkMapUnmappedCount: 0,
    activeFacilityDefaultName: DATA_MODE_CONFIG.activeFacilityDefaultName,
    datasetBadgeLabel: DATA_MODE_CONFIG.datasetBadgeLabel,
    demoDisclaimerShort: DATA_MODE_CONFIG.datasetBadgeLabel
  };
}

export interface CanonicalMedicineInventoryMetrics {
  totalTrackedItems: number;
  totalTrackedItemsCount: number;
  criticalCount: number;
  warningCount: number;
  lowStockCount: number;
  thresholdBreachedCount: number;
  normalCount: number;
  surplusCount: number;
  expiringSoonCount: number;
  expiringWithin90DaysCount: number;
  expiredBatchesItemCount: number;
  totalExpiredUnitsExcluded: number;
  inwardPipelineCount: number;
  pendingOrdersItemCount: number;
  totalUnitsInTransit: number;
  healthyStockPercentage: number;
  criticalItems: MedicineItem[];
  warningItems: MedicineItem[];
  lowStockItems: MedicineItem[];
  surplusItems: MedicineItem[];
  expiringSoonItems: MedicineItem[];
  evaluationsByMedId: Record<string, ReturnType<typeof evaluateMedicineThresholdAndReplenishment>>;
}

/**
 * Canonical evaluator for a PHC's medicine inventory counts so HomeOverview, Sidebar, TopBar,
 * MedicineIntelligence, AlertCentre, and AnalyticsReports always display identical numbers.
 */
export function getCanonicalMedicineInventoryMetrics(
  medicines: MedicineItem[] = [],
  referenceDate: string = '2026-09-22'
): CanonicalMedicineInventoryMetrics {
  const safeMedicines = Array.isArray(medicines) ? medicines : [];
  const refMs = Date.parse(`${referenceDate}T00:00:00Z`);

  const criticalItems: MedicineItem[] = [];
  const warningItems: MedicineItem[] = [];
  const lowStockItems: MedicineItem[] = [];
  const surplusItems: MedicineItem[] = [];
  const expiringSoonItems: MedicineItem[] = [];
  const evaluationsByMedId: Record<
    string,
    ReturnType<typeof evaluateMedicineThresholdAndReplenishment>
  > = {};

  let normalCount = 0;
  let expiredBatchesItemCount = 0;
  let totalExpiredUnitsExcluded = 0;
  let pendingOrdersItemCount = 0;
  let totalUnitsInTransit = 0;

  for (const med of safeMedicines) {
    if (!med) continue;
    const evalResult = evaluateMedicineThresholdAndReplenishment(med, { referenceDate });
    evaluationsByMedId[med.id] = evalResult;

    const forecast = calculateMedicineForecast({
      medicine: med,
      referenceDate,
      isSyntheticData: true
    });

    const isCritical = evalResult.riskLevel === 'CRITICAL' || med.stockoutRisk === 'CRITICAL';
    const isWarning =
      !isCritical &&
      (evalResult.riskLevel === 'WARNING' ||
        med.stockoutRisk === 'WARNING' ||
        evalResult.isThresholdBreached);
    const isSurplus =
      !isCritical &&
      !isWarning &&
      (evalResult.riskLevel === 'SURPLUS' || med.stockoutRisk === 'SURPLUS');

    if (isCritical) {
      criticalItems.push(med);
      lowStockItems.push(med);
    } else if (isWarning) {
      warningItems.push(med);
      lowStockItems.push(med);
    } else if (isSurplus) {
      surplusItems.push(med);
    } else {
      normalCount++;
    }

    if (forecast.expiredBatchStock > 0) {
      expiredBatchesItemCount++;
      totalExpiredUnitsExcluded += forecast.expiredBatchStock;
    }

    // Check if any non-expired batch expires within 90 days
    const expMs = Date.parse(`${med.expiryDate}T00:00:00Z`);
    const daysUntilPrimaryExp = !Number.isNaN(expMs)
      ? Math.ceil((expMs - refMs) / (1000 * 60 * 60 * 24))
      : 999;

    const hasExpiringBatch =
      (daysUntilPrimaryExp > 0 && daysUntilPrimaryExp <= 90) ||
      med.fefoPriority === 'URGENT' ||
      med.fefoPriority === 'EXPIRING_SOON' ||
      (Array.isArray(med.batches) &&
        med.batches.some((b) => {
          const bMs = Date.parse(`${b.expiryDate}T00:00:00Z`);
          const bDays = !Number.isNaN(bMs) ? Math.ceil((bMs - refMs) / (1000 * 60 * 60 * 24)) : 999;
          return bDays > 0 && bDays <= 90 && b.quantity > 0;
        }));

    if (hasExpiringBatch) {
      expiringSoonItems.push(med);
    }

    if ((med.pendingOrders || 0) > 0) {
      pendingOrdersItemCount++;
      totalUnitsInTransit += med.pendingOrders || 0;
    }
  }

  const totalTrackedItemsCount = safeMedicines.length;
  const criticalCount = criticalItems.length;
  const warningCount = warningItems.length;
  const lowStockCount = lowStockItems.length;
  const surplusCount = surplusItems.length;
  const expiringWithin90DaysCount = expiringSoonItems.length;
  const healthyCount = Math.max(0, totalTrackedItemsCount - lowStockCount);
  const healthyStockPercentage =
    totalTrackedItemsCount > 0 ? Math.round((healthyCount / totalTrackedItemsCount) * 100) : 100;

  return {
    totalTrackedItems: totalTrackedItemsCount,
    totalTrackedItemsCount,
    criticalCount,
    warningCount,
    lowStockCount,
    thresholdBreachedCount: lowStockCount,
    normalCount,
    surplusCount,
    expiringSoonCount: expiringWithin90DaysCount,
    expiringWithin90DaysCount,
    expiredBatchesItemCount,
    totalExpiredUnitsExcluded,
    inwardPipelineCount: totalUnitsInTransit,
    pendingOrdersItemCount,
    totalUnitsInTransit,
    healthyStockPercentage,
    criticalItems,
    warningItems,
    lowStockItems,
    surplusItems,
    expiringSoonItems,
    evaluationsByMedId
  };
}

export interface CanonicalAlertMetrics {
  totalSystemAlertsCount: number;
  totalAlertsCount: number;
  activeSystemAlertsCount: number;
  activeAlertsCount: number;
  criticalSystemAlertsCount: number;
  criticalAlertsCount: number;
  warningSystemAlertsCount: number;
  warningAlertsCount: number;
  resolvedSystemAlertsCount: number;
  acknowledgedSystemAlertsCount: number;
  resolvedOrAcknowledgedCount: number;
  unreadProactiveAlertsCount: number;
  totalProactiveAlertsCount: number;
  unreadLowStockNotifications: number;
  totalLowStockNotifications: number;
  criticalLowStockNotifications: number;
  warningLowStockNotifications: number;
  activeAlerts: OperationalAlert[];
}

export function getCanonicalAlertMetrics(
  alerts: OperationalAlert[] = [],
  proactiveStockAlerts: ProactiveStockAlert[] = []
): CanonicalAlertMetrics {
  const validAlerts = (Array.isArray(alerts) ? alerts : []).filter(Boolean);
  const safeProactive = (Array.isArray(proactiveStockAlerts) ? proactiveStockAlerts : []).filter(Boolean);

  const activeAlerts = validAlerts.filter((a) => a.status !== 'RESOLVED');
  const criticalAlerts = activeAlerts.filter((a) => a.category === 'CRITICAL');
  const warningAlerts = activeAlerts.filter((a) => a.category === 'WARNING');
  const resolvedAlerts = validAlerts.filter((a) => a.status === 'RESOLVED');
  const acknowledgedAlerts = validAlerts.filter((a) => a.status === 'ACKNOWLEDGED');
  const unreadProactive = safeProactive.filter((a) => !a.read);
  const criticalProactive = safeProactive.filter((a) => a.severity === 'CRITICAL');
  const warningProactive = safeProactive.filter((a) => a.severity === 'WARNING');

  return {
    totalSystemAlertsCount: validAlerts.length,
    totalAlertsCount: validAlerts.length,
    activeSystemAlertsCount: activeAlerts.length,
    activeAlertsCount: activeAlerts.length,
    criticalSystemAlertsCount: criticalAlerts.length,
    criticalAlertsCount: criticalAlerts.length,
    warningSystemAlertsCount: warningAlerts.length,
    warningAlertsCount: warningAlerts.length,
    resolvedSystemAlertsCount: resolvedAlerts.length,
    acknowledgedSystemAlertsCount: acknowledgedAlerts.length,
    resolvedOrAcknowledgedCount: resolvedAlerts.length + acknowledgedAlerts.length,
    unreadProactiveAlertsCount: unreadProactive.length,
    totalProactiveAlertsCount: safeProactive.length,
    unreadLowStockNotifications: unreadProactive.length,
    totalLowStockNotifications: safeProactive.length,
    criticalLowStockNotifications: criticalProactive.length,
    warningLowStockNotifications: warningProactive.length,
    activeAlerts
  };
}

export interface CanonicalOrderMetrics {
  totalOrdersCount: number;
  activeOrdersCount: number;
  activePipelineOrdersCount: number;
  completedOrdersCount: number;
  deliveredOrdersCount: number;
  cancelledOrdersCount: number;
  totalTransfersCount: number;
  pendingTransfersCount: number;
  pendingRedistributionsCount: number;
  approvedTransfersCount: number;
  approvedOrActiveTransfersCount: number;
  completedTransfersCount: number;
  completedOrApprovedRedistributionsCount: number;
  rejectedTransfersCount: number;
}

export function getCanonicalOrderMetrics(
  orders: LogisticsOrder[] = [],
  redistributions: RedistributionOpportunity[] = []
): CanonicalOrderMetrics {
  const safeOrders = (Array.isArray(orders) ? orders : []).filter(Boolean);
  const safeRedist = (Array.isArray(redistributions) ? redistributions : []).filter(Boolean);

  const activePipelineOrders = safeOrders.filter(
    (o) =>
      o.status !== 'DELIVERED' &&
      o.status !== 'RECEIVED' &&
      o.status !== 'CANCELLED'
  );
  const deliveredOrders = safeOrders.filter(
    (o) => o.status === 'DELIVERED' || o.status === 'RECEIVED'
  );
  const cancelledOrders = safeOrders.filter((o) => o.status === 'CANCELLED');

  const pendingRedist = safeRedist.filter(
    (r) => r.status === 'PROPOSED' || r.status === 'PENDING_REVIEW'
  );
  const approvedOrActiveTransfers = safeRedist.filter(
    (r) =>
      r.status === 'APPROVED' ||
      r.status === 'DISPATCHED' ||
      r.status === 'IN_TRANSIT'
  );
  const completedTransfers = safeRedist.filter(
    (r) => r.status === 'COMPLETED' || r.status === 'RECEIVED'
  );
  const rejectedTransfers = safeRedist.filter(
    (r) => r.status === 'REJECTED' || r.status === 'CANCELLED'
  );

  return {
    totalOrdersCount: safeOrders.length,
    activeOrdersCount: activePipelineOrders.length,
    activePipelineOrdersCount: activePipelineOrders.length,
    completedOrdersCount: deliveredOrders.length,
    deliveredOrdersCount: deliveredOrders.length,
    cancelledOrdersCount: cancelledOrders.length,
    totalTransfersCount: safeRedist.length,
    pendingTransfersCount: pendingRedist.length,
    pendingRedistributionsCount: pendingRedist.length,
    approvedTransfersCount: approvedOrActiveTransfers.length + completedTransfers.length,
    approvedOrActiveTransfersCount: approvedOrActiveTransfers.length,
    completedTransfersCount: completedTransfers.length,
    completedOrApprovedRedistributionsCount:
      approvedOrActiveTransfers.length + completedTransfers.length,
    rejectedTransfersCount: rejectedTransfers.length
  };
}

export interface CanonicalNetworkMapMetrics {
  totalFacilitiesCount: number;
  rajasthanFacilitiesCount: number;
  otherStatesFacilitiesCount: number;
  criticalCount: number;
  warningCount: number;
  normalCount: number;
  surplusCount: number;
  unknownCount: number;
}

export function getCanonicalNetworkMapMetrics(
  facilities: NetworkFacility[] = []
): CanonicalNetworkMapMetrics {
  const safeFacilities = Array.isArray(facilities) ? facilities : [];
  let criticalCount = 0;
  let warningCount = 0;
  let normalCount = 0;
  let surplusCount = 0;
  let unknownCount = 0;
  let rajasthanFacilitiesCount = 0;

  for (const f of safeFacilities) {
    if (!f) continue;
    if (f.state === 'Rajasthan') {
      rajasthanFacilitiesCount++;
    }
    if (f.isInventoryMatched === false || f.assessedRiskCategory === 'UNKNOWN') {
      unknownCount++;
    } else if (f.assessedRiskCategory === 'CRITICAL' || f.medicineRisk === 'CRITICAL_DEFICIT') {
      criticalCount++;
    } else if (f.assessedRiskCategory === 'WARNING' || f.medicineRisk === 'BUFFER_DEPLETING') {
      warningCount++;
    } else if (f.assessedRiskCategory === 'SURPLUS' || f.medicineRisk === 'SURPLUS_AVAILABLE') {
      surplusCount++;
    } else {
      normalCount++;
    }
  }

  return {
    totalFacilitiesCount: safeFacilities.length,
    rajasthanFacilitiesCount,
    otherStatesFacilitiesCount: safeFacilities.length - rajasthanFacilitiesCount,
    criticalCount,
    warningCount,
    normalCount,
    surplusCount,
    unknownCount
  };
}
