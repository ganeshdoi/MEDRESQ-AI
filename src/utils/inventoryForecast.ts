import type { MedicineBatch, MedicineItem, NetworkFacility, PHCFacility } from '../types.ts';
import { resolveMedicineMatch } from './medicineMatcher.ts';

export interface InventoryForecastInput {
  medicine: Partial<MedicineItem> & { name?: string; unit?: string };
  phcName?: string;
  leadTimeDays?: number;
  safetyBufferDays?: number;
  replenishmentCycleDays?: number;
  demandSurgeMultiplier?: number;
  consumptionPeriodDays?: number;
  consumptionHistoryDaily?: number[];
  referenceDate?: string; // YYYY-MM-DD, defaults to '2026-09-22'
  isSyntheticData?: boolean;
}

export interface InventoryForecastFormulas {
  usableStockFormula: string;
  avgDailyConsumptionFormula: string;
  daysRemainingFormula: string;
  stockoutDateFormula: string;
  safetyStockFormula: string;
  reorderPointFormula: string;
  suggestedReplenishmentFormula: string;
  assumptions: string[];
}

export interface InventoryForecastResult {
  medicineId: string;
  medicineName: string;
  phcId: string;
  phcName: string;
  unit: string;
  referenceDate: string;

  // 1. Stock & Batch Expiry Breakdown
  totalPhysicalStock: number;
  expiredBatchStock: number;
  usableStock: number;
  pendingInwardStock: number;
  netUsablePlusPipeline: number;
  batchDataAvailable: boolean;
  batchesBreakdown: Array<{
    batchNumber: string;
    quantity: number;
    expiryDate: string;
    isExpired: boolean;
    daysToExpiry: number | null;
  }>;

  // 2. Consumption & Demand
  recentAvgDailyConsumption: number | null;
  consumptionPeriodLabel: string;
  consumptionPeriodDays: number;
  demandSurgeMultiplier: number;
  effectiveDailyDemand: number | null;

  // 3. Depletion Runway & Stock-Out Date
  isDepletionCalculable: boolean;
  nonCalculableReason: string | null;
  estimatedDaysRemaining: number | null;
  estimatedDaysWithPipeline: number | null;
  estimatedStockoutDate: string | null;
  estimatedStockoutDateFormatted: string;

  // 4. Replenishment Arithmetic (Lead Time, Safety Stock, ROP, Order Qty)
  leadTimeDays: number;
  leadTimeDemand: number;
  safetyBufferDays: number;
  formularyMinBuffer: number;
  safetyStock: number;
  reorderPoint: number;
  targetCycleDays: number;
  targetStockLevel: number;
  suggestedReplenishmentQty: number;
  packRoundingUnit: number;

  // 5. Risk Classification & Short Explanation
  riskLevel: 'CRITICAL' | 'WARNING' | 'NORMAL' | 'SURPLUS' | 'UNKNOWN';
  primaryRiskReason: string;
  primaryRiskFactor:
    | 'IMMEDIATE_STOCKOUT'
    | 'LEAD_TIME_DEFICIT'
    | 'BELOW_REORDER_POINT'
    | 'EXPIRED_BATCH_DEDUCTION'
    | 'MISSING_CONSUMPTION_DATA'
    | 'SURPLUS_STOCK'
    | 'NORMAL_COVERAGE';

  // 6. Transparency & Provenance
  isSimulatedEstimate: boolean;
  estimateBadgeLabel: string;
  disclaimerText: string;
  formulas: InventoryForecastFormulas;
}

/**
 * Parses a YYYY-MM-DD string into a UTC midnight timestamp for deterministic date arithmetic.
 */
function parseDateUTC(dateStr?: string): number | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const ms = Date.UTC(year, month, day);
    return Number.isFinite(ms) ? ms : null;
  }
  const fallback = Date.parse(trimmed);
  return Number.isFinite(fallback) ? fallback : null;
}

function formatDateUTC(ms: number): string {
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatHumanDateUTC(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

/**
 * Deterministic, transparent calculation engine for MEDRESQ AI medicine demand and stock-out forecasting.
 * Zero external dependencies; handles missing/invalid data safely and never invents figures.
 */
export function calculateMedicineForecast(input: InventoryForecastInput): InventoryForecastResult {
  const med = input.medicine || {};
  const referenceDate = input.referenceDate || '2026-09-22';
  const refMs = parseDateUTC(referenceDate) ?? Date.UTC(2026, 8, 22);

  const unit = med.unit || 'Units';
  const medicineId = med.id || 'unknown-med';
  const medicineName = med.name || 'Unspecified Medicine';
  const phcId = med.phcId || 'unknown-phc';
  const phcName = input.phcName || 'Selected PHC';

  // 1. Safe physical stock & batch expiry deduction
  const rawPhysicalStock = Number(med.currentStock);
  const safePhysicalStock =
    Number.isFinite(rawPhysicalStock) && rawPhysicalStock > 0 ? Math.floor(rawPhysicalStock) : 0;

  const rawPendingOrders = Number(med.pendingOrders);
  const pendingInwardStock =
    Number.isFinite(rawPendingOrders) && rawPendingOrders > 0 ? Math.floor(rawPendingOrders) : 0;

  let totalPhysicalStock = safePhysicalStock;
  let expiredBatchStock = 0;
  let usableStock = safePhysicalStock;
  let batchDataAvailable = false;
  const batchesBreakdown: InventoryForecastResult['batchesBreakdown'] = [];

  if (Array.isArray(med.batches) && med.batches.length > 0) {
    batchDataAvailable = true;
    let sumTotal = 0;
    let sumExpired = 0;
    let sumUsable = 0;

    for (const b of med.batches as MedicineBatch[]) {
      const qty = Number.isFinite(Number(b.quantity)) && Number(b.quantity) > 0 ? Math.floor(Number(b.quantity)) : 0;
      const expMs = parseDateUTC(b.expiryDate);
      const daysToExpiry = expMs !== null ? Math.ceil((expMs - refMs) / 86400000) : null;
      const isExpired = b.status === 'EXPIRED' || (expMs !== null && expMs < refMs);

      sumTotal += qty;
      if (isExpired) {
        sumExpired += qty;
      } else {
        sumUsable += qty;
      }

      batchesBreakdown.push({
        batchNumber: b.batchNumber || 'UNLABELED-BATCH',
        quantity: qty,
        expiryDate: b.expiryDate || 'Unknown',
        isExpired,
        daysToExpiry
      });
    }

    // If med.currentStock was updated (e.g., via order receipt, transfer, or consumption) and differs from sumTotal,
    // reconcile the active batch quantity so usableStock accurately reflects the updated currentStock minus expired batches.
    if (med.currentStock !== undefined && safePhysicalStock !== sumTotal) {
      const delta = safePhysicalStock - sumTotal;
      const activeIdx = batchesBreakdown.findIndex((b) => !b.isExpired);
      if (activeIdx >= 0) {
        batchesBreakdown[activeIdx].quantity = Math.max(0, batchesBreakdown[activeIdx].quantity + delta);
      }
      totalPhysicalStock = safePhysicalStock;
      expiredBatchStock = sumExpired;
      usableStock = Math.max(0, safePhysicalStock - sumExpired);
    } else {
      totalPhysicalStock = sumTotal;
      expiredBatchStock = sumExpired;
      usableStock = sumUsable;
    }
  } else if (med.batchNumber || med.expiryDate) {
    batchDataAvailable = Boolean(med.expiryDate);
    const expMs = parseDateUTC(med.expiryDate);
    const daysToExpiry = expMs !== null ? Math.ceil((expMs - refMs) / 86400000) : null;
    const isExpired = expMs !== null && expMs < refMs;

    if (isExpired) {
      expiredBatchStock = safePhysicalStock;
      usableStock = 0;
    } else {
      expiredBatchStock = 0;
      usableStock = safePhysicalStock;
    }

    batchesBreakdown.push({
      batchNumber: med.batchNumber || 'PRIMARY-BATCH',
      quantity: safePhysicalStock,
      expiryDate: med.expiryDate || 'Unknown',
      isExpired,
      daysToExpiry
    });
  }

  const netUsablePlusPipeline = usableStock + pendingInwardStock;

  // 2. Recent average daily consumption & period used
  const periodDays =
    Number.isFinite(Number(input.consumptionPeriodDays)) && Number(input.consumptionPeriodDays) > 0
      ? Math.round(Number(input.consumptionPeriodDays))
      : 30;

  let recentAvgDailyConsumption: number | null = null;
  let consumptionPeriodLabel = `Last ${periodDays} days (Aug 24 – Sep 22, 2026 • Synthetic OPD Ledger)`;

  if (Array.isArray(input.consumptionHistoryDaily) && input.consumptionHistoryDaily.length > 0) {
    const validVals = input.consumptionHistoryDaily
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v >= 0);
    if (validVals.length > 0) {
      const sum = validVals.reduce((a, b) => a + b, 0);
      recentAvgDailyConsumption = Number((sum / validVals.length).toFixed(1));
      consumptionPeriodLabel = `Last ${validVals.length} days (${
        input.isSyntheticData !== false ? 'DEMO/SIMULATED' : 'Recorded'
      } daily dispensing series)`;
    }
  } else {
    const rawDaily = Number(med.dailyConsumption);
    const rawWeekly = Number(med.weeklyConsumption);
    if (Number.isFinite(rawDaily) && rawDaily >= 0 && med.dailyConsumption !== undefined && med.dailyConsumption !== null) {
      recentAvgDailyConsumption = Number(rawDaily.toFixed(1));
      consumptionPeriodLabel = `Last ${periodDays} days rolling average (${
        input.isSyntheticData !== false ? 'DEMO/SIMULATED' : 'Recorded'
      } PHC register)`;
    } else if (Number.isFinite(rawWeekly) && rawWeekly >= 0 && med.weeklyConsumption !== undefined && med.weeklyConsumption !== null) {
      recentAvgDailyConsumption = Number((rawWeekly / 7).toFixed(1));
      consumptionPeriodLabel = `Last 7 days rolling average (${
        input.isSyntheticData !== false ? 'DEMO/SIMULATED' : 'Recorded'
      } weekly register ÷ 7)`;
    } else {
      recentAvgDailyConsumption = null;
      consumptionPeriodLabel = 'Consumption history unavailable';
    }
  }

  const rawMultiplier = Number(input.demandSurgeMultiplier);
  const demandSurgeMultiplier =
    Number.isFinite(rawMultiplier) && rawMultiplier > 0 ? Number(rawMultiplier.toFixed(2)) : 1.0;

  const effectiveDailyDemand =
    recentAvgDailyConsumption !== null
      ? Number((recentAvgDailyConsumption * demandSurgeMultiplier).toFixed(1))
      : null;

  // 3. Estimated days of stock remaining & stock-out date
  let isDepletionCalculable = false;
  let nonCalculableReason: string | null = null;
  let estimatedDaysRemaining: number | null = null;
  let estimatedDaysWithPipeline: number | null = null;
  let estimatedStockoutDate: string | null = null;
  let estimatedStockoutDateFormatted = 'Not calculable';

  if (effectiveDailyDemand === null) {
    isDepletionCalculable = false;
    nonCalculableReason = 'Recent daily consumption data is missing.';
  } else if (effectiveDailyDemand <= 0) {
    isDepletionCalculable = false;
    nonCalculableReason = 'Daily consumption rate is 0 units/day; depletion date cannot be divided by zero.';
  } else {
    isDepletionCalculable = true;
    estimatedDaysRemaining = Number((usableStock / effectiveDailyDemand).toFixed(1));
    estimatedDaysWithPipeline = Number((netUsablePlusPipeline / effectiveDailyDemand).toFixed(1));

    const daysOffsetFloor = Math.floor(estimatedDaysRemaining);
    const stockoutMs = refMs + daysOffsetFloor * 86400000;
    estimatedStockoutDate = formatDateUTC(stockoutMs);
    estimatedStockoutDateFormatted =
      usableStock <= 0
        ? `${formatHumanDateUTC(refMs)} (Immediate — 0 usable stock)`
        : `${formatHumanDateUTC(stockoutMs)} (${estimatedStockoutDate})`;
  }

  // 4. Lead time, safety stock, reorder point, and suggested replenishment quantity
  const rawLeadTime = Number(input.leadTimeDays);
  const leadTimeDays =
    Number.isFinite(rawLeadTime) && rawLeadTime > 0 ? Number(rawLeadTime.toFixed(1)) : 3.5;

  const rawSafetyDays = Number(input.safetyBufferDays);
  const safetyBufferDays =
    Number.isFinite(rawSafetyDays) && rawSafetyDays >= 0 ? Number(rawSafetyDays.toFixed(1)) : 3.0;

  const rawCycleDays = Number(input.replenishmentCycleDays);
  const targetCycleDays =
    Number.isFinite(rawCycleDays) && rawCycleDays > 0 ? Math.round(rawCycleDays) : 14;

  const rawMinStock = Number(med.minStockLevel);
  const formularyMinBuffer =
    Number.isFinite(rawMinStock) && rawMinStock >= 0 ? Math.round(rawMinStock) : 0;

  const activeDemandForMath = effectiveDailyDemand !== null && effectiveDailyDemand > 0 ? effectiveDailyDemand : 0;

  // Lead-Time Demand = Effective Daily Demand * Lead Time (days)
  const leadTimeDemand = Math.ceil(activeDemandForMath * leadTimeDays);

  // Safety Stock = max(Formulary Min Buffer, ceil(Effective Daily Demand * Safety Buffer Days))
  // To keep ROP strictly anchored to daily demand & buffer days while respecting formulary reserve:
  const demandBasedSafetyStock = Math.ceil(activeDemandForMath * safetyBufferDays);
  const safetyStock =
    activeDemandForMath > 0
      ? Math.max(demandBasedSafetyStock, Math.min(formularyMinBuffer, Math.ceil(activeDemandForMath * 7)))
      : formularyMinBuffer;

  // Reorder Point (ROP) = Lead-Time Demand + Safety Stock
  const reorderPoint = leadTimeDemand + safetyStock;

  // Target Stock Level = Cycle Demand (targetCycleDays * Effective Daily Demand) + Safety Stock
  const cycleDemand = Math.ceil(activeDemandForMath * targetCycleDays);
  const targetStockLevel = Math.max(reorderPoint, cycleDemand + safetyStock);

  // Pack size rounding: 5 for critical low-volume vials (minStockLevel < 50), 25 for medium (minStockLevel < 250), 50 for bulk tablets/sachets
  const packRoundingUnit = formularyMinBuffer < 50 ? 5 : formularyMinBuffer < 250 ? 25 : 50;

  const rawReplenishmentNeed = Math.max(0, targetStockLevel - netUsablePlusPipeline);
  const suggestedReplenishmentQty =
    rawReplenishmentNeed > 0
      ? Math.max(packRoundingUnit, Math.ceil(rawReplenishmentNeed / packRoundingUnit) * packRoundingUnit)
      : usableStock <= reorderPoint && reorderPoint > netUsablePlusPipeline
      ? Math.max(packRoundingUnit, Math.ceil((reorderPoint - netUsablePlusPipeline) / packRoundingUnit) * packRoundingUnit)
      : 0;

  // 5. Risk Level & Short Explanation of the Main Reason for the Risk
  let riskLevel: InventoryForecastResult['riskLevel'] = 'NORMAL';
  let primaryRiskFactor: InventoryForecastResult['primaryRiskFactor'] = 'NORMAL_COVERAGE';
  let primaryRiskReason = '';

  const expiredNote =
    expiredBatchStock > 0
      ? ` Note: ${expiredBatchStock} ${unit} of expired batch stock were excluded from usable inventory.`
      : '';

  if (!isDepletionCalculable || effectiveDailyDemand === null) {
    if (usableStock <= 0) {
      riskLevel = 'CRITICAL';
      primaryRiskFactor = expiredBatchStock > 0 ? 'EXPIRED_BATCH_DEDUCTION' : 'IMMEDIATE_STOCKOUT';
      primaryRiskReason =
        expiredBatchStock > 0
          ? `Zero usable stock available because all ${expiredBatchStock} ${unit} on shelf are expired.`
          : `Zero usable stock on hand (${usableStock} ${unit}); immediate replenishment required.`;
    } else {
      riskLevel = 'UNKNOWN';
      primaryRiskFactor = 'MISSING_CONSUMPTION_DATA';
      primaryRiskReason = `${nonCalculableReason} Usable on-hand stock is ${usableStock} ${unit}.${expiredNote}`;
    }
  } else if (usableStock <= 0) {
    riskLevel = 'CRITICAL';
    primaryRiskFactor = expiredBatchStock > 0 ? 'EXPIRED_BATCH_DEDUCTION' : 'IMMEDIATE_STOCKOUT';
    primaryRiskReason =
      expiredBatchStock > 0
        ? `Immediate stock-out: 0 usable ${unit} remaining after excluding ${expiredBatchStock} ${unit} of expired batch stock against ${effectiveDailyDemand} ${unit}/day demand.`
        : `Immediate stock-out: 0 usable ${unit} on hand against ${effectiveDailyDemand} ${unit}/day demand.`;
  } else if (
    (estimatedDaysRemaining !== null && estimatedDaysRemaining < leadTimeDays) ||
    usableStock <= Math.max(1, Math.round(formularyMinBuffer * 0.5))
  ) {
    riskLevel = 'CRITICAL';
    primaryRiskFactor = 'LEAD_TIME_DEFICIT';
    const critFloor = Math.max(1, Math.round(formularyMinBuffer * 0.5));
    const gapDays =
      estimatedDaysRemaining !== null ? Math.max(0, Number((leadTimeDays - estimatedDaysRemaining).toFixed(1))) : 0;
    primaryRiskReason =
      usableStock <= critFloor
        ? `Critical Demo Floor Breached (≤50% Configurable Min): Usable stock (${usableStock} ${unit}, ~${estimatedDaysRemaining}d cover) dropped at or below the configurable critical floor of ${critFloor} ${unit} (50% of ${formularyMinBuffer} ${unit} configurable minimum).${expiredNote}`
        : `Stock Cover Below Delivery Lead Time: Usable stock (${usableStock} ${unit}) covers ${estimatedDaysRemaining} days at ${effectiveDailyDemand} ${unit}/day (est. stock-out ${estimatedStockoutDate}), which is ${gapDays} days shorter than the ${leadTimeDays}-day delivery lead time (Supplier lead time ${leadTimeDays}d ≤ 3.5d max is within normal limits).${expiredNote}`;
  } else if (
    usableStock < formularyMinBuffer ||
    usableStock < reorderPoint ||
    (estimatedDaysRemaining !== null && estimatedDaysRemaining < leadTimeDays + safetyBufferDays)
  ) {
    riskLevel = 'WARNING';
    primaryRiskFactor = expiredBatchStock > 0 ? 'EXPIRED_BATCH_DEDUCTION' : 'BELOW_REORDER_POINT';
    primaryRiskReason = `Stock Below Configurable Demo Reorder / Min Threshold: Usable stock (${usableStock} ${unit}, ${estimatedDaysRemaining} days cover) is below the configurable threshold (${Math.max(formularyMinBuffer, reorderPoint)} ${unit} — Configurable Min: ${formularyMinBuffer}, ROP: ${reorderPoint} ${unit}). Suggested demo replenishment: +${suggestedReplenishmentQty} ${unit}.${expiredNote}`;
  } else if (
    (estimatedDaysRemaining !== null && estimatedDaysRemaining >= 45) ||
    usableStock >= Math.max(formularyMinBuffer * 2.5, Number(med.maxStockLevel) || formularyMinBuffer * 3)
  ) {
    riskLevel = 'SURPLUS';
    primaryRiskFactor = 'SURPLUS_STOCK';
    primaryRiskReason = `Surplus coverage (Configurable Demo Thresholds): Usable stock (${usableStock} ${unit}) covers ${estimatedDaysRemaining} days at ${effectiveDailyDemand} ${unit}/day, above the ${reorderPoint} ${unit} Reorder Point and ${targetStockLevel} ${unit} target cycle stock. Eligible for simulated inter-PHC transfer.${expiredNote}`;
  } else {
    riskLevel = 'NORMAL';
    primaryRiskFactor = 'NORMAL_COVERAGE';
    primaryRiskReason = `Adequate buffer (Configurable Demo Thresholds): Usable stock (${usableStock} ${unit}) provides ${estimatedDaysRemaining} days of coverage at ${effectiveDailyDemand} ${unit}/day (est. depletion ${estimatedStockoutDate}), above the Reorder Point of ${reorderPoint} ${unit} (${leadTimeDays}d delivery lead time + ${safetyStock} ${unit} demo safety buffer).${expiredNote}`;
  }

  const isSimulatedEstimate = input.isSyntheticData !== false;

  const formulas: InventoryForecastFormulas = {
    usableStockFormula: `Usable Stock = Total Physical Stock (${totalPhysicalStock}) - Expired Batch Stock (${expiredBatchStock}) = ${usableStock} ${unit}`,
    avgDailyConsumptionFormula:
      recentAvgDailyConsumption !== null
        ? demandSurgeMultiplier !== 1.0
          ? `Effective Daily Demand = Recent Avg Daily Burn (${recentAvgDailyConsumption} ${unit}/d over ${periodDays}d) × Scenario Multiplier (${demandSurgeMultiplier}x) = ${effectiveDailyDemand} ${unit}/day`
          : `Recent Avg Daily Consumption = Total Dispensed Over ${periodDays} Days ÷ ${periodDays} = ${recentAvgDailyConsumption} ${unit}/day`
        : 'Recent Avg Daily Consumption = Not calculable (missing historical consumption)',
    daysRemainingFormula:
      isDepletionCalculable && estimatedDaysRemaining !== null
        ? `Days of Stock Remaining = Usable Stock (${usableStock}) ÷ Effective Daily Demand (${effectiveDailyDemand}) = ${estimatedDaysRemaining} days`
        : `Days of Stock Remaining = Not calculable (${nonCalculableReason})`,
    stockoutDateFormula:
      isDepletionCalculable && estimatedStockoutDate !== null
        ? `Est. Stock-Out Date = Reference Date (${referenceDate}) + floor(${estimatedDaysRemaining} days) = ${estimatedStockoutDate}`
        : 'Est. Stock-Out Date = Not calculable',
    safetyStockFormula: `Safety Stock (SS) = max(ceil(Daily Demand ${activeDemandForMath} × ${safetyBufferDays}d safety buffer), Formulary Cap) = ${safetyStock} ${unit}`,
    reorderPointFormula: `Reorder Point (ROP) = Lead-Time Demand (ceil(${activeDemandForMath} × ${leadTimeDays}d) = ${leadTimeDemand}) + Safety Stock (${safetyStock}) = ${reorderPoint} ${unit}`,
    suggestedReplenishmentFormula: `Suggested Order Qty = roundUpTo${packRoundingUnit}(max(0, Target Stock (${targetCycleDays}d cycle = ${targetStockLevel}) - (Usable Stock ${usableStock} + Pending ${pendingInwardStock}))) = ${suggestedReplenishmentQty} ${unit}`,
    assumptions: [
      `Reference date anchored at ${referenceDate}; batches with expiryDate < ${referenceDate} are excluded from usable stock.`,
      `Warehouse delivery lead time assumed at ${leadTimeDays} days from RMSCL District Drug Warehouse; safety buffer floor set to ${safetyBufferDays} days (capped against NLEM min buffer of ${formularyMinBuffer} ${unit}).`,
      `Target replenishment cycle covers ${targetCycleDays} days of demand plus safety stock, rounded up to standard pack multiples of ${packRoundingUnit} ${unit}.`,
      isSimulatedEstimate
        ? 'DEMO / SIMULATED ESTIMATE: Historical consumption and seasonal surge inputs are synthetic demonstration data. Figures are planning estimates, not guaranteed clinical or supply predictions.'
        : 'Forecast derived from recorded ledger transactions; estimates assume constant daily burn over the lead-time horizon.'
    ]
  };

  return {
    medicineId,
    medicineName,
    phcId,
    phcName,
    unit,
    referenceDate,
    totalPhysicalStock,
    expiredBatchStock,
    usableStock,
    pendingInwardStock,
    netUsablePlusPipeline,
    batchDataAvailable,
    batchesBreakdown,
    recentAvgDailyConsumption,
    consumptionPeriodLabel,
    consumptionPeriodDays: periodDays,
    demandSurgeMultiplier,
    effectiveDailyDemand,
    isDepletionCalculable,
    nonCalculableReason,
    estimatedDaysRemaining,
    estimatedDaysWithPipeline,
    estimatedStockoutDate,
    estimatedStockoutDateFormatted,
    leadTimeDays,
    leadTimeDemand,
    safetyBufferDays,
    formularyMinBuffer,
    safetyStock,
    reorderPoint,
    targetCycleDays,
    targetStockLevel,
    suggestedReplenishmentQty,
    packRoundingUnit,
    riskLevel,
    primaryRiskReason,
    primaryRiskFactor,
    isSimulatedEstimate,
    estimateBadgeLabel: isSimulatedEstimate ? 'DEMO / SIMULATED ESTIMATE' : 'DETERMINISTIC ESTIMATE',
    disclaimerText:
      'Deterministic inventory estimate based on synthetic/demo historical consumption and configured lead-time assumptions. Not a guaranteed prediction.',
    formulas
  };
}

export interface DonorEligibilityAssessment {
  phcId: string;
  phcName: string;
  distanceKm: number;
  medicineId: string | null;
  usableStock: number;
  expiredBatchStock: number;
  dailyConsumption: number;
  definedSafetyStock: number;
  reorderPoint: number;
  maxSafeTransferQty: number;
  possibleTransferQty: number;
  donorStockAfterTransfer: number;
  isEligible: boolean;
  eligibilityExplanation: string;
}

export interface SupplyDisruptionSimulationInput {
  recipientPHC: Pick<PHCFacility, 'id' | 'name'> & { distanceKmFromDistrictHQ?: number };
  recipientMedicine: MedicineItem;
  baseLeadTimeDays?: number;
  deliveryDelayDays: number;
  demandSurgeMultiplier?: number;
  candidateDonors: Array<{
    phc: Pick<PHCFacility, 'id' | 'name'> & { distanceKmFromDistrictHQ?: number };
    medicines: MedicineItem[];
  }>;
  referenceDate?: string;
}

export interface SupplyDisruptionSimulationResult {
  isSimulationOnly: true;
  simulationNotice: string;
  referenceDate: string;
  recipientPHCId: string;
  recipientPHCName: string;
  medicineId: string;
  medicineName: string;
  unit: string;
  usableStock: number;
  effectiveDailyDemand: number | null;
  scheduledOrderQty: number;

  // Current Scenario (No Additional Delay)
  currentScenario: {
    leadTimeDays: number;
    expectedDeliveryDate: string;
    onHandDaysRemaining: number | null;
    onHandStockoutDate: string | null;
    effectiveDaysWithDelivery: number | null;
    effectiveStockoutDate: string | null;
    effectiveStockoutDateFormatted: string;
    unprotectedGapDaysBeforeDelivery: number;
    leadTimeDemand: number;
    safetyStock: number;
    reorderPoint: number;
    suggestedReplenishmentQty: number;
    riskLevel: InventoryForecastResult['riskLevel'];
  };

  // Delayed-Delivery Scenario (Base Lead Time + Hypothetical Delay)
  delayedScenario: {
    delayDays: number;
    totalLeadTimeDays: number;
    expectedDeliveryDate: string;
    onHandDaysRemaining: number | null;
    onHandStockoutDate: string | null;
    effectiveDaysWithDelivery: number | null;
    effectiveStockoutDate: string | null;
    effectiveStockoutDateFormatted: string;
    stocksOutBeforeDeliveryArrives: boolean;
    unprotectedGapDaysBeforeDelivery: number;
    unprotectedDeficitUnits: number;
    leadTimeDemand: number;
    safetyStock: number;
    reorderPoint: number;
    recipientBridgeNeedQty: number;
    suggestedReplenishmentQty: number;
    riskLevel: InventoryForecastResult['riskLevel'];
    impactSummary: string;
  };

  // Nearby PHC Donor Eligibility & Safe Transfer Quantities
  donorAssessments: DonorEligibilityAssessment[];
  recommendedDonor: DonorEligibilityAssessment | null;
  assumptions: string[];
}

/**
 * Pure, read-only what-if supply disruption simulator.
 * Reuses calculateMedicineForecast and resolveMedicineMatch without mutating any inventory, orders, or transfers.
 */
export function simulateSupplyDisruption(
  input: SupplyDisruptionSimulationInput
): SupplyDisruptionSimulationResult {
  const referenceDate = input.referenceDate || '2026-09-22';
  const refMs = parseDateUTC(referenceDate) ?? Date.UTC(2026, 8, 22);
  const baseLeadTimeDays =
    Number.isFinite(Number(input.baseLeadTimeDays)) && Number(input.baseLeadTimeDays) > 0
      ? Number(Number(input.baseLeadTimeDays).toFixed(1))
      : 3.5;
  const delayDays =
    Number.isFinite(Number(input.deliveryDelayDays)) && Number(input.deliveryDelayDays) >= 0
      ? Number(Number(input.deliveryDelayDays).toFixed(1))
      : 0;
  const totalDelayedLeadTimeDays = Number((baseLeadTimeDays + delayDays).toFixed(1));
  const surgeMult =
    Number.isFinite(Number(input.demandSurgeMultiplier)) && Number(input.demandSurgeMultiplier) > 0
      ? Number(Number(input.demandSurgeMultiplier).toFixed(2))
      : 1.0;

  // 1. Evaluate Current Scenario using calculateMedicineForecast
  const currentForecast = calculateMedicineForecast({
    medicine: input.recipientMedicine,
    phcName: input.recipientPHC.name,
    leadTimeDays: baseLeadTimeDays,
    safetyBufferDays: 3.0,
    replenishmentCycleDays: 14,
    demandSurgeMultiplier: surgeMult,
    consumptionPeriodDays: 30,
    referenceDate,
    isSyntheticData: true
  });

  // 2. Evaluate Delayed-Delivery Scenario using calculateMedicineForecast
  const delayedForecast = calculateMedicineForecast({
    medicine: input.recipientMedicine,
    phcName: input.recipientPHC.name,
    leadTimeDays: totalDelayedLeadTimeDays,
    safetyBufferDays: 3.0,
    replenishmentCycleDays: 14,
    demandSurgeMultiplier: surgeMult,
    consumptionPeriodDays: 30,
    referenceDate,
    isSyntheticData: true
  });

  const unit = currentForecast.unit;
  const usableStock = currentForecast.usableStock;
  const activeDailyDemand = currentForecast.effectiveDailyDemand;

  // Scheduled warehouse consignment size (pending order if active, else standard formulary replenishment batch)
  const scheduledOrderQty =
    currentForecast.pendingInwardStock > 0
      ? currentForecast.pendingInwardStock
      : Math.max(currentForecast.formularyMinBuffer, currentForecast.suggestedReplenishmentQty || 100);

  const currentDeliveryDate = formatDateUTC(refMs + Math.ceil(baseLeadTimeDays) * 86400000);
  const delayedDeliveryDate = formatDateUTC(refMs + Math.ceil(totalDelayedLeadTimeDays) * 86400000);

  // Compute effective stock-out dates under Current vs Delayed warehouse arrival:
  // If on-hand usable stock lasts until delivery arrival (onHandDays >= leadTime), delivery extends runway by scheduledOrderQty.
  // If on-hand usable stock runs out BEFORE delivery arrival (onHandDays < leadTime), stock-out occurs on onHandStockoutDate!
  let currentEffDays: number | null = null;
  let currentEffDate: string | null = null;
  let currentEffFormatted = 'Not calculable';
  let currentGapDays = 0;

  let delayedEffDays: number | null = null;
  let delayedEffDate: string | null = null;
  let delayedEffFormatted = 'Not calculable';
  let delayedGapDays = 0;
  let delayedDeficitUnits = 0;
  let stocksOutBeforeDelayedDelivery = false;

  if (activeDailyDemand !== null && activeDailyDemand > 0 && currentForecast.estimatedDaysRemaining !== null) {
    const onHandDays = currentForecast.estimatedDaysRemaining;

    // Current scenario
    if (onHandDays >= baseLeadTimeDays) {
      currentEffDays = Number(((usableStock + scheduledOrderQty) / activeDailyDemand).toFixed(1));
      const ms = refMs + Math.floor(currentEffDays) * 86400000;
      currentEffDate = formatDateUTC(ms);
      currentEffFormatted = `${formatHumanDateUTC(ms)} (${currentEffDate} • after ${baseLeadTimeDays}d delivery)`;
      currentGapDays = 0;
    } else {
      currentEffDays = onHandDays;
      currentEffDate = currentForecast.estimatedStockoutDate;
      currentGapDays = Number((baseLeadTimeDays - onHandDays).toFixed(1));
      currentEffFormatted = `${currentForecast.estimatedStockoutDateFormatted} (${currentGapDays}d gap before ${baseLeadTimeDays}d delivery)`;
    }

    // Delayed scenario
    if (onHandDays >= totalDelayedLeadTimeDays) {
      delayedEffDays = Number(((usableStock + scheduledOrderQty) / activeDailyDemand).toFixed(1));
      const ms = refMs + Math.floor(delayedEffDays) * 86400000;
      delayedEffDate = formatDateUTC(ms);
      delayedEffFormatted = `${formatHumanDateUTC(ms)} (${delayedEffDate} • survives +${delayDays}d delay)`;
      delayedGapDays = 0;
      delayedDeficitUnits = 0;
      stocksOutBeforeDelayedDelivery = false;
    } else {
      delayedEffDays = onHandDays;
      delayedEffDate = delayedForecast.estimatedStockoutDate;
      delayedGapDays = Number((totalDelayedLeadTimeDays - onHandDays).toFixed(1));
      delayedDeficitUnits = Math.max(0, Math.ceil(delayedGapDays * activeDailyDemand));
      stocksOutBeforeDelayedDelivery = true;
      delayedEffFormatted = `${delayedForecast.estimatedStockoutDateFormatted} (Stocks out ${delayedGapDays}d before delayed truck on ${delayedDeliveryDate})`;
    }
  }

  // Recipient bridge need to cover delayed lead time + safety stock
  const recipientBridgeNeedQty = Math.max(
    delayedDeficitUnits,
    Math.max(0, delayedForecast.reorderPoint - usableStock)
  );

  const impactSummary =
    activeDailyDemand === null || activeDailyDemand <= 0
      ? 'Stock-out dates are not calculable because daily consumption is zero or missing.'
      : stocksOutBeforeDelayedDelivery
      ? `A +${delayDays}-day warehouse delay (total lead time ${totalDelayedLeadTimeDays}d, arriving ${delayedDeliveryDate}) causes on-hand stock (${usableStock} ${unit}, ${currentForecast.estimatedDaysRemaining}d) to exhaust on ${delayedEffDate}—leaving ${delayedGapDays} days (${delayedDeficitUnits} ${unit}) of unprotected stock-out before the delayed warehouse delivery arrives.`
      : `On-hand usable stock (${usableStock} ${unit}, ${currentForecast.estimatedDaysRemaining}d) is sufficient to outlast the ${totalDelayedLeadTimeDays}-day delayed delivery window (arriving ${delayedDeliveryDate}).`;

  // 3. Evaluate Nearby PHC Donors without reducing any donor below its defined safety stock
  const donorAssessments: DonorEligibilityAssessment[] = input.candidateDonors
    .filter((d) => d.phc.id !== input.recipientPHC.id)
    .map((candidate) => {
      const distKm = Math.max(
        12,
        Math.abs(
          (candidate.phc.distanceKmFromDistrictHQ || 35) -
            (input.recipientPHC.distanceKmFromDistrictHQ || 65)
        )
      );

      const match = resolveMedicineMatch(candidate.medicines, input.recipientMedicine.name);
      if (match.status !== 'MATCHED') {
        return {
          phcId: candidate.phc.id,
          phcName: candidate.phc.name,
          distanceKm: distKm,
          medicineId: null,
          usableStock: 0,
          expiredBatchStock: 0,
          dailyConsumption: 0,
          definedSafetyStock: 0,
          reorderPoint: 0,
          maxSafeTransferQty: 0,
          possibleTransferQty: 0,
          donorStockAfterTransfer: 0,
          isEligible: false,
          eligibilityExplanation: `Ineligible: ${candidate.phc.name} does not hold an active matching batch of ${input.recipientMedicine.name}.`
        };
      }

      const donorMed = match.medicine;
      const donorForecast = calculateMedicineForecast({
        medicine: donorMed,
        phcName: candidate.phc.name,
        leadTimeDays: baseLeadTimeDays,
        safetyBufferDays: 3.0,
        replenishmentCycleDays: 14,
        consumptionPeriodDays: 30,
        referenceDate,
        isSyntheticData: true
      });

      // Donor's defined safety stock floor protects both its NLEM minStockLevel and calculated safetyStock/ROP
      const definedSafetyStock = Math.max(
        donorMed.minStockLevel || 0,
        donorForecast.safetyStock,
        donorForecast.reorderPoint
      );

      const maxSafeTransferQty = Math.max(0, donorForecast.usableStock - definedSafetyStock);
      const isEligible = maxSafeTransferQty > 0;

      // Possible transfer quantity: capped at maxSafeTransferQty so donor NEVER drops below definedSafetyStock
      const possibleTransferQty = isEligible
        ? recipientBridgeNeedQty > 0
          ? Math.min(maxSafeTransferQty, recipientBridgeNeedQty)
          : maxSafeTransferQty
        : 0;

      const donorStockAfterTransfer = donorForecast.usableStock - possibleTransferQty;

      const eligibilityExplanation = isEligible
        ? `ELIGIBLE: Usable stock is ${donorForecast.usableStock} ${unit} vs. defined safety/reorder floor of ${definedSafetyStock} ${unit} (NLEM min: ${donorMed.minStockLevel}, ROP: ${donorForecast.reorderPoint}). Can safely transfer up to ${maxSafeTransferQty} ${unit} (suggested transfer: ${possibleTransferQty} ${unit}, leaving ${donorStockAfterTransfer} ${unit} ≥ ${definedSafetyStock} ${unit}).`
        : `INELIGIBLE: Usable stock (${donorForecast.usableStock} ${unit}) is at or below ${candidate.phc.name}'s protected safety/reorder floor (${definedSafetyStock} ${unit}; NLEM min: ${donorMed.minStockLevel}, ROP: ${donorForecast.reorderPoint}). Any transfer would reduce donor below its safety stock.`;

      return {
        phcId: candidate.phc.id,
        phcName: candidate.phc.name,
        distanceKm: distKm,
        medicineId: donorMed.id,
        usableStock: donorForecast.usableStock,
        expiredBatchStock: donorForecast.expiredBatchStock,
        dailyConsumption: donorForecast.recentAvgDailyConsumption || 0,
        definedSafetyStock,
        reorderPoint: donorForecast.reorderPoint,
        maxSafeTransferQty,
        possibleTransferQty,
        donorStockAfterTransfer,
        isEligible,
        eligibilityExplanation
      };
    });

  const recommendedDonor =
    donorAssessments
      .filter((d) => d.isEligible && d.possibleTransferQty > 0)
      .sort((a, b) => b.possibleTransferQty - a.possibleTransferQty)[0] || null;

  return {
    isSimulationOnly: true,
    simulationNotice:
      'WHAT-IF SIMULATION ONLY (READ-ONLY): Running or adjusting this simulation does not mutate inventory, create orders, or approve transfers. Only an explicit action in the Replenishment Orders & Inter-PHC Transfers workflow changes stock.',
    referenceDate,
    recipientPHCId: input.recipientPHC.id,
    recipientPHCName: input.recipientPHC.name,
    medicineId: currentForecast.medicineId,
    medicineName: currentForecast.medicineName,
    unit,
    usableStock,
    effectiveDailyDemand: activeDailyDemand,
    scheduledOrderQty,
    currentScenario: {
      leadTimeDays: baseLeadTimeDays,
      expectedDeliveryDate: currentDeliveryDate,
      onHandDaysRemaining: currentForecast.estimatedDaysRemaining,
      onHandStockoutDate: currentForecast.estimatedStockoutDate,
      effectiveDaysWithDelivery: currentEffDays,
      effectiveStockoutDate: currentEffDate,
      effectiveStockoutDateFormatted: currentEffFormatted,
      unprotectedGapDaysBeforeDelivery: currentGapDays,
      leadTimeDemand: currentForecast.leadTimeDemand,
      safetyStock: currentForecast.safetyStock,
      reorderPoint: currentForecast.reorderPoint,
      suggestedReplenishmentQty: currentForecast.suggestedReplenishmentQty,
      riskLevel: currentForecast.riskLevel
    },
    delayedScenario: {
      delayDays,
      totalLeadTimeDays: totalDelayedLeadTimeDays,
      expectedDeliveryDate: delayedDeliveryDate,
      onHandDaysRemaining: delayedForecast.estimatedDaysRemaining,
      onHandStockoutDate: delayedForecast.estimatedStockoutDate,
      effectiveDaysWithDelivery: delayedEffDays,
      effectiveStockoutDate: delayedEffDate,
      effectiveStockoutDateFormatted: delayedEffFormatted,
      stocksOutBeforeDeliveryArrives: stocksOutBeforeDelayedDelivery,
      unprotectedGapDaysBeforeDelivery: delayedGapDays,
      unprotectedDeficitUnits: delayedDeficitUnits,
      leadTimeDemand: delayedForecast.leadTimeDemand,
      safetyStock: delayedForecast.safetyStock,
      reorderPoint: delayedForecast.reorderPoint,
      recipientBridgeNeedQty,
      suggestedReplenishmentQty: delayedForecast.suggestedReplenishmentQty,
      riskLevel: delayedForecast.riskLevel,
      impactSummary
    },
    donorAssessments,
    recommendedDonor,
    assumptions: [
      `Reference date anchored at ${referenceDate}; expired batch stock (${currentForecast.expiredBatchStock} ${unit}) is excluded from usable stock.`,
      `Current scenario assumes standard warehouse lead time of ${baseLeadTimeDays} days (arrival ${currentDeliveryDate}); delayed scenario adds +${delayDays} days hypothetical delay (total ${totalDelayedLeadTimeDays} days, arrival ${delayedDeliveryDate}).`,
      `Scheduled warehouse delivery batch assumed at ${scheduledOrderQty} ${unit}. If on-hand stock exhausts before delivery arrival, stock-out occurs on the on-hand depletion date.`,
      `Donor eligibility strictly requires Usable Stock > max(NLEM Min Stock, Safety Stock, Reorder Point). Transfer quantities are capped so the donor never drops below its defined safety stock.`,
      `Read-only guarantee: This simulation performs zero state mutations and zero API write calls.`
    ]
  };
}

export interface NetworkFacilityEvaluationInput {
  facility: NetworkFacility;
  facilityInventory?: MedicineItem[] | null;
  assessedMedicineQuery?: string; // Specific medicine name/id or 'ALL'
  leadTimeDays?: number;
  referenceDate?: string;
  isSimulatedData?: boolean;
}

/**
 * Deterministically evaluates a single mapped NetworkFacility from its current MedicineItem[] inventory
 * and configured thresholds (minStockLevel / minThreshold & maxThreshold / reorderPoint).
 * If inventory cannot be matched to the facility (or if the queried medicine is unmatched),
 * returns an explicit UNKNOWN / unavailable status without inventing any shortage or surplus.
 */
export function evaluateNetworkFacilityInventory(
  inputOrFacility: NetworkFacilityEvaluationInput | NetworkFacility,
  facilityInventoryArg?: MedicineItem[] | null,
  assessedMedicineQueryArg?: string,
  referenceDateArg?: string
): NetworkFacility {
  const isInputObj =
    inputOrFacility &&
    typeof inputOrFacility === 'object' &&
    'facility' in inputOrFacility;

  const facility: NetworkFacility = isInputObj
    ? (inputOrFacility as NetworkFacilityEvaluationInput).facility
    : (inputOrFacility as NetworkFacility);
  const facilityInventory = isInputObj
    ? (inputOrFacility as NetworkFacilityEvaluationInput).facilityInventory
    : facilityInventoryArg;
  const assessedQuery = (
    (isInputObj
      ? (inputOrFacility as NetworkFacilityEvaluationInput).assessedMedicineQuery
      : assessedMedicineQueryArg) || 'ALL'
  ).trim();
  const rawLeadTime = isInputObj
    ? (inputOrFacility as NetworkFacilityEvaluationInput).leadTimeDays
    : undefined;
  const leadTimeDays =
    Number.isFinite(Number(rawLeadTime)) && Number(rawLeadTime) > 0
      ? Number(Number(rawLeadTime).toFixed(1))
      : 3.5;
  const referenceDate =
    (isInputObj
      ? (inputOrFacility as NetworkFacilityEvaluationInput).referenceDate
      : referenceDateArg) || '2026-09-22';
  const isSimulatedData = isInputObj
    ? (inputOrFacility as NetworkFacilityEvaluationInput).isSimulatedData !== false
    : true;

  // 1. If inventory cannot be matched to this facility, return UNKNOWN status with zero invented shortages/surpluses
  if (!Array.isArray(facilityInventory) || facilityInventory.length === 0) {
    const unknownMedName =
      assessedQuery && assessedQuery !== 'ALL'
        ? assessedQuery
        : 'All NLEM Formulary Medicines';
    const unknownReason =
      'Unknown / Unavailable: Facility has no matched PHC inventory ledger. No shortage or surplus is invented.';
    return {
      ...facility,
      isInventoryMatched: false,
      isSimulatedData,
      dataSourceLabel: isSimulatedData
        ? 'DEMO / SIMULATED FACILITY • INVENTORY UNMATCHED'
        : 'FACILITY INVENTORY UNMATCHED',
      medicineRisk: 'UNKNOWN',
      keyShortages: [],
      keySurpluses: [],
      assessedMedicineName: unknownMedName,
      assessedRiskCategory: 'UNKNOWN',
      assessedUsableStock: null,
      assessedUnit: 'Units',
      assessedMinThreshold: null,
      assessedMaxThreshold: null,
      assessedDaysRemaining: null,
      statusReason: unknownReason,
      assessedMedicine: {
        medicineId: null,
        medicineName: unknownMedName,
        unit: 'Units',
        usableStock: null,
        expiredBatchStock: null,
        dailyConsumption: null,
        daysRemaining: null,
        minThreshold: null,
        maxThreshold: null,
        safetyStock: null,
        reorderPoint: null,
        surplusTransferableQty: null,
        deficitQty: null,
        riskCategory: 'UNKNOWN',
        statusReason: unknownReason
      }
    };
  }

  // 2. Evaluate every medicine in the facility's inventory deterministically
  interface EvaluatedMedEntry {
    med: MedicineItem;
    forecast: InventoryForecastResult;
    minThreshold: number;
    maxThreshold: number;
    protectedFloor: number;
    riskCategory: 'CRITICAL' | 'WARNING' | 'NORMAL' | 'SURPLUS' | 'UNKNOWN';
    surplusTransferableQty: number;
    deficitQty: number;
    statusReason: string;
  }

  const evaluatedItems: EvaluatedMedEntry[] = facilityInventory.map((med) => {
    const forecast = calculateMedicineForecast({
      medicine: med,
      phcName: facility.name,
      leadTimeDays,
      safetyBufferDays: 3.0,
      replenishmentCycleDays: 14,
      consumptionPeriodDays: 30,
      referenceDate,
      isSyntheticData: isSimulatedData
    });

    const usable = forecast.usableStock;
    const rawMin = Number(med.minThreshold ?? med.minStockLevel);
    const minThreshold = Number.isFinite(rawMin) && rawMin >= 0 ? Math.round(rawMin) : 0;
    const rawMax = Number(med.maxThreshold ?? med.maxStockLevel);
    const maxThreshold =
      Number.isFinite(rawMax) && rawMax > minThreshold
        ? Math.round(rawMax)
        : Math.max(minThreshold * 3, forecast.targetStockLevel);
    const protectedFloor = Math.max(minThreshold, forecast.safetyStock, forecast.reorderPoint);

    let riskCategory: EvaluatedMedEntry['riskCategory'] = 'NORMAL';
    let statusReason = '';

    if (!forecast.isDepletionCalculable && usable > 0) {
      if (minThreshold > 0 && usable <= Math.floor(minThreshold * 0.5)) {
        riskCategory = 'CRITICAL';
        statusReason = `Critical threshold breach: Usable stock (${usable} ${forecast.unit}) is ≤50% of configured minimum threshold (${minThreshold} ${forecast.unit}).`;
      } else if (minThreshold > 0 && usable <= minThreshold) {
        riskCategory = 'WARNING';
        statusReason = `Below configured threshold: Usable stock (${usable} ${forecast.unit}) is ≤ configured minimum threshold (${minThreshold} ${forecast.unit}).`;
      } else {
        riskCategory = 'UNKNOWN';
        statusReason = `Unknown depletion rate: ${forecast.nonCalculableReason || 'Daily consumption missing.'} Usable stock is ${usable} ${forecast.unit} (min threshold: ${minThreshold} ${forecast.unit}).`;
      }
    } else if (
      usable <= 0 ||
      forecast.riskLevel === 'CRITICAL' ||
      (minThreshold > 0 && usable <= Math.floor(minThreshold * 0.5))
    ) {
      riskCategory = 'CRITICAL';
      statusReason =
        usable <= 0
          ? `Immediate stock-out: 0 usable ${forecast.unit} remaining (configured min threshold: ${minThreshold} ${forecast.unit}, ROP: ${forecast.reorderPoint} ${forecast.unit}).`
          : forecast.estimatedDaysRemaining !== null && forecast.estimatedDaysRemaining <= leadTimeDays
          ? `Critical lead-time deficit: Usable stock (${usable} ${forecast.unit}, ${forecast.estimatedDaysRemaining}d left at ${forecast.effectiveDailyDemand} ${forecast.unit}/d) is below ${leadTimeDays}d delivery lead time and configured thresholds (Min: ${minThreshold}, ROP: ${forecast.reorderPoint} ${forecast.unit}).`
          : `Critical threshold breach: Usable stock (${usable} ${forecast.unit}, ${forecast.estimatedDaysRemaining}d left) dropped to ≤50% of configured facility minimum threshold (${minThreshold} ${forecast.unit}).`;
    } else if (
      usable < minThreshold ||
      (forecast.estimatedDaysRemaining !== null && forecast.estimatedDaysRemaining <= 7.0)
    ) {
      riskCategory = 'WARNING';
      statusReason = `Warning / Buffer depleting: Usable stock (${usable} ${forecast.unit}, ${forecast.estimatedDaysRemaining}d left at ${forecast.effectiveDailyDemand} ${forecast.unit}/d) is below configured minimum threshold (${minThreshold} ${forecast.unit}) or ≤7 days of cover (ROP: ${forecast.reorderPoint} ${forecast.unit}).`;
    } else if (
      usable > protectedFloor &&
      (usable > maxThreshold ||
        forecast.riskLevel === 'SURPLUS' ||
        (minThreshold > 0 &&
          usable >= minThreshold * 2.5 &&
          (forecast.estimatedDaysRemaining === null || forecast.estimatedDaysRemaining >= 30)))
    ) {
      riskCategory = 'SURPLUS';
      const safeSurplus = Math.max(0, usable - protectedFloor);
      statusReason = `Verified surplus: Usable stock (${usable} ${forecast.unit}, ${forecast.estimatedDaysRemaining}d coverage) exceeds configured max threshold (${maxThreshold} ${forecast.unit}) and protected safety floor (${protectedFloor} ${forecast.unit}) by +${safeSurplus} ${forecast.unit}.`;
    } else {
      riskCategory = 'NORMAL';
      statusReason = `Normal adequate stock: Usable stock (${usable} ${forecast.unit}, ${forecast.estimatedDaysRemaining}d coverage at ${forecast.effectiveDailyDemand} ${forecast.unit}/d) is within configured thresholds (Min: ${minThreshold}, Max: ${maxThreshold} ${forecast.unit}).`;
    }

    const surplusTransferableQty =
      riskCategory === 'SURPLUS' ? Math.max(0, usable - protectedFloor) : 0;
    const deficitQty =
      riskCategory === 'CRITICAL' || riskCategory === 'WARNING'
        ? Math.max(1, Math.max(minThreshold, forecast.reorderPoint) - usable)
        : 0;

    return {
      med,
      forecast,
      minThreshold,
      maxThreshold,
      protectedFloor,
      riskCategory,
      surplusTransferableQty,
      deficitQty,
      statusReason
    };
  });

  // 3. Build facility keyShortages and keySurpluses from evaluated inventory
  const keyShortages: NetworkFacility['keyShortages'] = evaluatedItems
    .filter((item) => item.riskCategory === 'CRITICAL' || item.riskCategory === 'WARNING')
    .sort((a, b) => {
      if (a.riskCategory !== b.riskCategory) {
        return a.riskCategory === 'CRITICAL' ? -1 : 1;
      }
      const daysA = a.forecast.estimatedDaysRemaining ?? 999;
      const daysB = b.forecast.estimatedDaysRemaining ?? 999;
      return daysA - daysB;
    })
    .map((item) => ({
      medicineName: item.med.name,
      currentStock: item.forecast.usableStock,
      projectedBurnPerDay: item.forecast.effectiveDailyDemand ?? item.med.dailyConsumption,
      daysRemaining: item.forecast.estimatedDaysRemaining ?? 0,
      deficitQuantity: item.deficitQty,
      unit: item.forecast.unit
    }));

  const keySurpluses: NetworkFacility['keySurpluses'] = evaluatedItems
    .filter((item) => item.riskCategory === 'SURPLUS' && item.surplusTransferableQty > 0)
    .sort((a, b) => b.surplusTransferableQty - a.surplusTransferableQty)
    .map((item) => ({
      medicineName: item.med.name,
      currentStock: item.forecast.usableStock,
      surplusQuantity: item.surplusTransferableQty,
      unit: item.forecast.unit
    }));

  const mapRiskCategoryToFacilityRisk = (
    cat: 'CRITICAL' | 'WARNING' | 'NORMAL' | 'SURPLUS' | 'UNKNOWN'
  ): NetworkFacility['medicineRisk'] => {
    switch (cat) {
      case 'CRITICAL':
        return 'CRITICAL_DEFICIT';
      case 'WARNING':
        return 'BUFFER_DEPLETING';
      case 'SURPLUS':
        return 'SURPLUS_AVAILABLE';
      case 'NORMAL':
        return 'ADEQUATE';
      default:
        return 'UNKNOWN';
    }
  };

  // 4. Determine assessedMedicine and facility medicineRisk based on assessedMedicineQuery
  if (assessedQuery && assessedQuery !== 'ALL') {
    const match = resolveMedicineMatch(facilityInventory, assessedQuery);
    if (match.status !== 'MATCHED') {
      const unmatchedReason = `Unknown / Unavailable: ${match.reason} No shortage or surplus is invented.`;
      return {
        ...facility,
        isInventoryMatched: true,
        isSimulatedData,
        dataSourceLabel: isSimulatedData
          ? 'DEMO / SIMULATED PHC INVENTORY • MEDICINE UNMATCHED'
          : 'RECORDED PHC INVENTORY • MEDICINE UNMATCHED',
        medicineRisk: 'UNKNOWN',
        keyShortages,
        keySurpluses,
        assessedMedicineName: assessedQuery,
        assessedRiskCategory: 'UNKNOWN',
        assessedUsableStock: null,
        assessedUnit: 'Units',
        assessedMinThreshold: null,
        assessedMaxThreshold: null,
        assessedDaysRemaining: null,
        statusReason: unmatchedReason,
        assessedMedicine: {
          medicineId: null,
          medicineName: assessedQuery,
          unit: 'Units',
          usableStock: null,
          expiredBatchStock: null,
          dailyConsumption: null,
          daysRemaining: null,
          minThreshold: null,
          maxThreshold: null,
          safetyStock: null,
          reorderPoint: null,
          surplusTransferableQty: null,
          deficitQty: null,
          riskCategory: 'UNKNOWN',
          statusReason: unmatchedReason
        }
      };
    }

    const entry = evaluatedItems.find((e) => e.med.id === match.medicine.id)!;
    return {
      ...facility,
      isInventoryMatched: true,
      isSimulatedData,
      dataSourceLabel: isSimulatedData
        ? 'DEMO / SIMULATED PHC INVENTORY'
        : 'RECORDED PHC INVENTORY',
      medicineRisk: mapRiskCategoryToFacilityRisk(entry.riskCategory),
      keyShortages,
      keySurpluses,
      assessedMedicineName: entry.med.name,
      assessedRiskCategory: entry.riskCategory,
      assessedUsableStock: entry.forecast.usableStock,
      assessedUnit: entry.forecast.unit,
      assessedMinThreshold: entry.minThreshold,
      assessedMaxThreshold: entry.maxThreshold,
      assessedDaysRemaining: entry.forecast.estimatedDaysRemaining,
      statusReason: entry.statusReason,
      assessedMedicine: {
        medicineId: entry.med.id,
        medicineName: entry.med.name,
        unit: entry.forecast.unit,
        usableStock: entry.forecast.usableStock,
        expiredBatchStock: entry.forecast.expiredBatchStock,
        dailyConsumption: entry.forecast.effectiveDailyDemand,
        daysRemaining: entry.forecast.estimatedDaysRemaining,
        minThreshold: entry.minThreshold,
        maxThreshold: entry.maxThreshold,
        safetyStock: entry.forecast.safetyStock,
        reorderPoint: entry.forecast.reorderPoint,
        surplusTransferableQty: entry.surplusTransferableQty,
        deficitQty: entry.deficitQty,
        riskCategory: entry.riskCategory,
        statusReason: entry.statusReason
      }
    };
  }

  // Portfolio ('ALL') mode: pick primary assessed medicine driving the facility's status
  const criticalItem = evaluatedItems
    .filter((e) => e.riskCategory === 'CRITICAL')
    .sort((a, b) => (a.forecast.estimatedDaysRemaining ?? 999) - (b.forecast.estimatedDaysRemaining ?? 999))[0];
  const warningItem = evaluatedItems
    .filter((e) => e.riskCategory === 'WARNING')
    .sort((a, b) => (a.forecast.estimatedDaysRemaining ?? 999) - (b.forecast.estimatedDaysRemaining ?? 999))[0];
  const surplusItem = evaluatedItems
    .filter((e) => e.riskCategory === 'SURPLUS')
    .sort((a, b) => b.surplusTransferableQty - a.surplusTransferableQty)[0];
  const normalItem = evaluatedItems.find((e) => e.riskCategory === 'NORMAL') || evaluatedItems[0];

  const primaryEntry = criticalItem || warningItem || surplusItem || normalItem;

  return {
    ...facility,
    isInventoryMatched: true,
    isSimulatedData,
    dataSourceLabel: isSimulatedData
      ? 'DEMO / SIMULATED PHC INVENTORY'
      : 'RECORDED PHC INVENTORY',
    medicineRisk: mapRiskCategoryToFacilityRisk(primaryEntry.riskCategory),
    keyShortages,
    keySurpluses,
    assessedMedicineName: primaryEntry.med.name,
    assessedRiskCategory: primaryEntry.riskCategory,
    assessedUsableStock: primaryEntry.forecast.usableStock,
    assessedUnit: primaryEntry.forecast.unit,
    assessedMinThreshold: primaryEntry.minThreshold,
    assessedMaxThreshold: primaryEntry.maxThreshold,
    assessedDaysRemaining: primaryEntry.forecast.estimatedDaysRemaining,
    statusReason: primaryEntry.statusReason,
    assessedMedicine: {
      medicineId: primaryEntry.med.id,
      medicineName: primaryEntry.med.name,
      unit: primaryEntry.forecast.unit,
      usableStock: primaryEntry.forecast.usableStock,
      expiredBatchStock: primaryEntry.forecast.expiredBatchStock,
      dailyConsumption: primaryEntry.forecast.effectiveDailyDemand,
      daysRemaining: primaryEntry.forecast.estimatedDaysRemaining,
      minThreshold: primaryEntry.minThreshold,
      maxThreshold: primaryEntry.maxThreshold,
      safetyStock: primaryEntry.forecast.safetyStock,
      reorderPoint: primaryEntry.forecast.reorderPoint,
      surplusTransferableQty: primaryEntry.surplusTransferableQty,
      deficitQty: primaryEntry.deficitQty,
      riskCategory: primaryEntry.riskCategory,
      statusReason: primaryEntry.statusReason
    }
  };
}

/**
 * Evaluates an entire array of NetworkFacility objects against a facility-to-inventory lookup map.
 * Preserves isolation: changing stock or thresholds in one facility only changes that facility's status.
 */
export interface FefoAdjustmentResult {
  ok: boolean;
  error?: string;
  usableStockBefore: number;
  usableStockAfter: number;
  expiredBatchStock: number;
  deductedBatches: Array<{ batchNumber: string; expiryDate: string; deducted: number; remaining: number }>;
}

/**
 * Applies a stock adjustment (negative for dispensing/transfer deduction, positive for receipt/credit, 0 for recalculation)
 * using strict batch-level FEFO (First-Expiry, First-Out) across non-expired batches.
 * - Expired batches (expiryDate <= referenceDate) are NEVER dispensed or counted toward usable stock.
 * - Never creates negative batch quantities or negative total stock.
 * - Updates med.currentStock, med.stock, med.batchNumber, med.expiryDate, med.projectedStockoutDays, and med.stockoutRisk.
 */
export function applyFefoStockAdjustment(
  med: MedicineItem,
  deltaQty: number,
  referenceDate: string = '2026-09-22'
): FefoAdjustmentResult {
  const refMs = parseDateUTC(referenceDate) ?? Date.UTC(2026, 8, 22);

  // Ensure batches array exists and mirrors med if not already populated
  if (!Array.isArray(med.batches) || med.batches.length === 0) {
    med.batches = [
      {
        batchNumber: med.batchNumber || 'BATCH-STD',
        expiryDate: med.expiryDate || '2027-06-30',
        quantity: Math.max(0, Math.floor(Number(med.currentStock ?? med.stock) || 0))
      }
    ];
  }

  let usableStockBefore = 0;
  let expiredBatchStock = 0;

  for (const b of med.batches) {
    b.quantity = Math.max(0, Math.floor(Number(b.quantity) || 0));
    const expMs = parseDateUTC(b.expiryDate);
    const isExpired = expMs !== null && expMs <= refMs;
    if (isExpired) {
      expiredBatchStock += b.quantity;
    } else {
      usableStockBefore += b.quantity;
    }
  }

  // Reconcile if med.currentStock was externally set out of sync before deltaQty
  const rawTotalBefore = usableStockBefore + expiredBatchStock;
  const currentTotalProp = Math.max(0, Math.floor(Number(med.currentStock ?? med.stock) || 0));
  if (deltaQty === 0 && currentTotalProp !== rawTotalBefore) {
    const targetUsable = Math.max(0, currentTotalProp - expiredBatchStock);
    const nonExpiredBatches = med.batches
      .filter((b) => {
        const expMs = parseDateUTC(b.expiryDate);
        return expMs === null || expMs > refMs;
      })
      .sort((a, b) => (parseDateUTC(a.expiryDate) ?? Infinity) - (parseDateUTC(b.expiryDate) ?? Infinity));

    if (nonExpiredBatches.length > 0) {
      const otherNonExpiredSum = nonExpiredBatches
        .slice(1)
        .reduce((s, b) => s + b.quantity, 0);
      nonExpiredBatches[0].quantity = Math.max(0, targetUsable - otherNonExpiredSum);
      usableStockBefore = nonExpiredBatches.reduce((s, b) => s + b.quantity, 0);
    }
  }

  const deductedBatches: Array<{ batchNumber: string; expiryDate: string; deducted: number; remaining: number }> = [];

  if (deltaQty < 0) {
    const needed = Math.abs(Math.floor(Number(deltaQty)));
    if (needed > usableStockBefore) {
      return {
        ok: false,
        error:
          expiredBatchStock > 0
            ? `Insufficient usable stock for ${med.name}: requested ${needed} ${med.unit}, but only ${usableStockBefore} ${med.unit} usable (${expiredBatchStock} ${med.unit} expired and excluded under FEFO).`
            : `Insufficient stock for ${med.name}: requested ${needed} ${med.unit}, but only ${usableStockBefore} ${med.unit} available.`,
        usableStockBefore,
        usableStockAfter: usableStockBefore,
        expiredBatchStock,
        deductedBatches
      };
    }

    // Sort non-expired batches by earliest expiry date first (FEFO)
    const nonExpiredBatches = med.batches
      .filter((b) => {
        const expMs = parseDateUTC(b.expiryDate);
        return expMs === null || expMs > refMs;
      })
      .sort((a, b) => (parseDateUTC(a.expiryDate) ?? Infinity) - (parseDateUTC(b.expiryDate) ?? Infinity));

    let remainingToDeduct = needed;
    for (const batch of nonExpiredBatches) {
      if (remainingToDeduct <= 0) break;
      if (batch.quantity <= 0) continue;
      const take = Math.min(batch.quantity, remainingToDeduct);
      batch.quantity = Math.max(0, batch.quantity - take);
      remainingToDeduct -= take;
      deductedBatches.push({
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        deducted: take,
        remaining: batch.quantity
      });
    }
  } else if (deltaQty > 0) {
    const credit = Math.floor(Number(deltaQty));
    const nonExpiredBatches = med.batches
      .filter((b) => {
        const expMs = parseDateUTC(b.expiryDate);
        return expMs === null || expMs > refMs;
      })
      .sort((a, b) => (parseDateUTC(a.expiryDate) ?? Infinity) - (parseDateUTC(b.expiryDate) ?? Infinity));

    if (nonExpiredBatches.length > 0) {
      // Credit the active non-expired batch (or latest non-expired batch)
      const targetBatch = nonExpiredBatches[nonExpiredBatches.length - 1];
      targetBatch.quantity += credit;
    } else {
      const newBatch = {
        batchNumber: `${med.batchNumber || 'BATCH'}-NEW`,
        expiryDate: '2027-09-30',
        quantity: credit
      };
      med.batches.unshift(newBatch);
    }
  }

  // Recompute usableStockAfter and total physical stock
  let usableStockAfter = 0;
  let totalExpiredAfter = 0;
  for (const b of med.batches) {
    const expMs = parseDateUTC(b.expiryDate);
    const isExpired = expMs !== null && expMs <= refMs;
    if (isExpired) {
      totalExpiredAfter += b.quantity;
    } else {
      usableStockAfter += b.quantity;
    }
  }

  // Keep med.batches sorted by expiryDate ascending so FEFO order is always clear
  med.batches.sort((a, b) => (parseDateUTC(a.expiryDate) ?? Infinity) - (parseDateUTC(b.expiryDate) ?? Infinity));

  // Set primary med.batchNumber & med.expiryDate to the earliest non-expired batch with quantity > 0 (front of FEFO queue)
  const activeFefoBatch =
    med.batches.find((b) => {
      const expMs = parseDateUTC(b.expiryDate);
      return (expMs === null || expMs > refMs) && b.quantity > 0;
    }) ||
    med.batches.find((b) => {
      const expMs = parseDateUTC(b.expiryDate);
      return expMs === null || expMs > refMs;
    }) ||
    med.batches[0];

  if (activeFefoBatch) {
    med.batchNumber = activeFefoBatch.batchNumber;
    med.expiryDate = activeFefoBatch.expiryDate;
    const expMs = parseDateUTC(activeFefoBatch.expiryDate);
    if (expMs !== null) {
      const daysToExpiry = Math.ceil((expMs - refMs) / 86_400_000);
      med.fefoPriority = daysToExpiry <= 45 ? 'URGENT' : daysToExpiry <= 90 ? 'EXPIRING_SOON' : 'NORMAL';
    }
  }

  med.currentStock = usableStockAfter + totalExpiredAfter;
  med.stock = med.currentStock;

  // Risk & days remaining must be driven by usableStockAfter (never counting expired stock as safe buffer)
  const minThresh = Math.max(1, Number(med.minThreshold ?? med.minStockLevel) || 1);
  const maxThresh = Math.max(minThresh + 1, Number(med.maxThreshold ?? med.maxStockLevel) || minThresh * 3);
  const daily = Number(med.dailyConsumption) || 0;

  med.projectedStockoutDays = daily > 0 ? Number((usableStockAfter / daily).toFixed(1)) : 99;

  const criticalFloor = Math.max(1, Math.round(minThresh * 0.5));
  const leadTimeDemand = Math.ceil(daily * 3.5);
  const safetyStock = Math.ceil(daily * 3.0);
  const dynamicRop = Math.max(minThresh, leadTimeDemand + safetyStock);

  if (usableStockAfter <= 0 || usableStockAfter <= criticalFloor || med.projectedStockoutDays <= 3.5) {
    med.stockoutRisk = 'CRITICAL';
  } else if (usableStockAfter <= minThresh || usableStockAfter <= dynamicRop || med.projectedStockoutDays <= 6.5) {
    med.stockoutRisk = 'WARNING';
  } else if (usableStockAfter >= maxThresh || usableStockAfter >= minThresh * 2.5 || med.projectedStockoutDays >= 45) {
    med.stockoutRisk = 'SURPLUS';
  } else {
    med.stockoutRisk = 'NORMAL';
  }

  return {
    ok: true,
    usableStockBefore,
    usableStockAfter,
    expiredBatchStock: totalExpiredAfter,
    deductedBatches
  };
}

export interface ThresholdAndReplenishmentEvaluation {
  medicineId: string;
  medicineName: string;
  unit: string;
  physicalStock: number;
  usableStock: number;
  expiredBatchStock: number;
  pendingOrders: number;
  effectivePipelineStock: number;
  dailyConsumption: number;
  usableDaysOfCover: number;
  pipelineDaysOfCover: number;
  minThreshold: number;
  criticalStockFloor: number;
  leadTimeDays: number;
  maxAllowedLeadTimeDays: number;
  isSupplierLeadTimeBreach: boolean;
  isStockCoverBelowLeadTime: boolean;
  safetyBufferDays: number;
  replenishmentCycleDays: number;
  leadTimeDemand: number;
  safetyStock: number;
  reorderPoint: number;
  targetCycleStock: number;
  packRoundingStep: number;
  netDeficitAfterPipeline: number;
  grossDeficitWithoutPipeline: number;
  suggestedOrderQty: number;
  supplementalOrderQty: number;
  recommendedOrderQty: number;
  isCoveredByPendingOrder: boolean;
  riskLevel: 'CRITICAL' | 'WARNING' | 'NORMAL' | 'SURPLUS';
  isThresholdBreached: boolean;
  breachSeverity: 'CRITICAL' | 'WARNING' | 'NONE';
  breachRuleCode:
    | 'ZERO_USABLE_STOCK'
    | 'CRITICAL_FLOOR_50PCT'
    | 'LEAD_TIME_RUNWAY_BREACH'
    | 'SUPPLIER_LEAD_TIME_BREACH'
    | 'MIN_SAFETY_THRESHOLD_BREACH'
    | 'DYNAMIC_ROP_BREACH'
    | 'HEALTHY';
  breachRuleTitle: string;
  breachRuleShortBadge: string;
  breachExplanation: string;
  replenishmentFormulaSummary: string;
  thresholdConfigLabel: string;
  recommendedPriority: 'EMERGENCY_REPLENISHMENT' | 'URGENT' | 'ROUTINE';
}

function safeNonNegativeNumber(val: unknown, fallback = 0): number {
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return num;
}

/**
 * Canonical shared evaluator for Stock Thresholds, Safety Stock, Reorder Point, Lead Time, and Replenishment.
 * Used consistently across AppContext, AlertCentre, TopBar, HomeOverview, WhyThisAlertModal, and MedicineIntelligence.
 * - Never triggers a Lead-Time Breach when leadTime <= maxAllowedLeadTime (e.g., 1.8d <= 3.5d is NOT a lead-time breach).
 * - Distinguishes Stock Cover (days of stock remaining) from Supplier Delivery Lead Time.
 * - Handles missing, invalid, and zero values safely.
 * - Labels all thresholds as Configurable Demo Thresholds.
 */
export function evaluateMedicineThresholdAndReplenishment(
  med: MedicineItem,
  options?: {
    leadTimeDays?: number;
    maxAllowedLeadTimeDays?: number;
    safetyBufferDays?: number;
    replenishmentCycleDays?: number;
    referenceDate?: string;
  }
): ThresholdAndReplenishmentEvaluation {
  const referenceDate = options?.referenceDate || '2026-09-22';
  const refMs = parseDateUTC(referenceDate) ?? Date.UTC(2026, 8, 22);

  // Configurable Demo Thresholds (never claimed as clinical standards)
  const maxAllowedLeadTimeDays = Math.max(0.5, safeNonNegativeNumber(options?.maxAllowedLeadTimeDays, 3.5));
  const leadTimeDays = Math.max(0.5, safeNonNegativeNumber(options?.leadTimeDays, 3.5));
  const safetyBufferDays = Math.max(0, safeNonNegativeNumber(options?.safetyBufferDays, 3.0));
  const replenishmentCycleDays = Math.max(1, Math.round(safeNonNegativeNumber(options?.replenishmentCycleDays, 14)));

  const physicalStock = Math.round(safeNonNegativeNumber(med?.currentStock ?? med?.stock, 0));
  let usableStock = 0;
  let expiredBatchStock = 0;

  if (Array.isArray(med?.batches) && med.batches.length > 0) {
    for (const b of med.batches) {
      const qty = Math.round(safeNonNegativeNumber(b?.quantity, 0));
      const expMs = parseDateUTC(b?.expiryDate);
      const isExp = b?.status === 'EXPIRED' || (expMs !== null && expMs <= refMs);
      if (isExp) {
        expiredBatchStock += qty;
      } else {
        usableStock += qty;
      }
    }
    const batchSum = usableStock + expiredBatchStock;
    if (batchSum !== physicalStock) {
      const diff = physicalStock - batchSum;
      usableStock = Math.max(0, usableStock + diff);
    }
  } else {
    const expMs = parseDateUTC(med?.expiryDate);
    const isExp = expMs !== null && expMs <= refMs;
    usableStock = isExp ? 0 : physicalStock;
    expiredBatchStock = isExp ? physicalStock : 0;
  }

  const dailyConsumption = safeNonNegativeNumber(med?.dailyConsumption, 0);
  const pendingOrders = Math.round(safeNonNegativeNumber(med?.pendingOrders, 0));
  const effectivePipelineStock = usableStock + pendingOrders;

  const usableDaysOfCover =
    dailyConsumption > 0 ? Number((usableStock / dailyConsumption).toFixed(1)) : usableStock > 0 ? 99 : 0;
  const pipelineDaysOfCover =
    dailyConsumption > 0
      ? Number((effectivePipelineStock / dailyConsumption).toFixed(1))
      : effectivePipelineStock > 0
      ? 99
      : 0;

  const rawMin = safeNonNegativeNumber(med?.minStockLevel ?? med?.minThreshold, 0);
  const minThreshold = rawMin > 0 ? Math.round(rawMin) : Math.max(10, Math.ceil(dailyConsumption * 7) || 50);
  const rawMax = safeNonNegativeNumber(med?.maxStockLevel ?? med?.maxThreshold, 0);
  const maxThreshold = Math.max(minThreshold * 2, rawMax > 0 ? Math.round(rawMax) : minThreshold * 4);
  const criticalStockFloor = Math.max(1, Math.round(minThreshold * 0.5));

  const leadTimeDemand = Math.ceil(dailyConsumption * leadTimeDays);
  const demandBasedSafety = Math.ceil(dailyConsumption * safetyBufferDays);
  const safetyStock =
    dailyConsumption > 0
      ? Math.max(demandBasedSafety, Math.min(minThreshold, Math.ceil(dailyConsumption * 7)))
      : minThreshold;

  // Configurable Demo Reorder Point (ROP) = max(Configurable Min Threshold, Lead-Time Demand + Demo Safety Stock)
  const reorderPoint = Math.max(minThreshold, leadTimeDemand + safetyStock);

  // Target Replenishment Stock = 14-day cycle demand + safety stock (at least 2x minThreshold, capped at maxThreshold)
  const cycleDemand = Math.ceil(dailyConsumption * replenishmentCycleDays);
  const rawTargetStock = Math.max(
    minThreshold * 2,
    reorderPoint + Math.ceil(dailyConsumption * 7),
    cycleDemand + safetyStock
  );
  const targetCycleStock = Math.min(maxThreshold, rawTargetStock);

  const packRoundingStep = minThreshold < 50 ? 5 : minThreshold < 250 ? 25 : 50;

  const grossDeficitWithoutPipeline = Math.max(0, targetCycleStock - usableStock);
  const netDeficitAfterPipeline = Math.max(0, targetCycleStock - effectivePipelineStock);

  const suggestedOrderQty =
    netDeficitAfterPipeline > 0
      ? Math.max(packRoundingStep, Math.ceil(netDeficitAfterPipeline / packRoundingStep) * packRoundingStep)
      : 0;

  const rawSupplemental = Math.max(
    packRoundingStep,
    grossDeficitWithoutPipeline > 0
      ? grossDeficitWithoutPipeline
      : Math.max(minThreshold - usableStock, Math.round(minThreshold * 0.5))
  );
  const supplementalOrderQty = Math.max(
    packRoundingStep,
    Math.ceil(rawSupplemental / packRoundingStep) * packRoundingStep
  );

  const recommendedOrderQty = suggestedOrderQty > 0 ? suggestedOrderQty : supplementalOrderQty;

  // 1. Supplier Lead-Time Breach: ONLY true if actual delivery leadTimeDays > maxAllowedLeadTimeDays.
  // If maxAllowedLeadTimeDays is 3.5d, then 1.8d (or 3.5d) is <= 3.5d and MUST NOT trigger a lead-time breach.
  const isSupplierLeadTimeBreach = leadTimeDays > maxAllowedLeadTimeDays;

  // 2. Stock Cover vs Delivery Lead Time: True when days of usable stock remaining is strictly less than delivery lead time
  const isStockCoverBelowLeadTime = dailyConsumption > 0 && usableDaysOfCover < leadTimeDays;

  // 3. Stock Threshold & Reorder Point checks (Configurable Demo Thresholds)
  const isZeroUsable = usableStock <= 0;
  const isCriticalFloorBreach = usableStock <= criticalStockFloor;
  const isMinBufferBreach = usableStock < minThreshold;
  const isDynamicRopBreach =
    usableStock < reorderPoint || (dailyConsumption > 0 && usableDaysOfCover < leadTimeDays + safetyBufferDays);

  const isCritical = isZeroUsable || isCriticalFloorBreach || isStockCoverBelowLeadTime;
  const isWarning = !isCritical && (isMinBufferBreach || isDynamicRopBreach || isSupplierLeadTimeBreach);
  const isSurplus =
    !isCritical &&
    !isWarning &&
    (usableStock >= maxThreshold || usableStock >= minThreshold * 2.5 || (dailyConsumption > 0 && usableDaysOfCover >= 45));

  const riskLevel: ThresholdAndReplenishmentEvaluation['riskLevel'] = isCritical
    ? 'CRITICAL'
    : isWarning
    ? 'WARNING'
    : isSurplus
    ? 'SURPLUS'
    : 'NORMAL';

  const isThresholdBreached = isCritical || isWarning;
  const breachSeverity: ThresholdAndReplenishmentEvaluation['breachSeverity'] = isCritical
    ? 'CRITICAL'
    : isWarning
    ? 'WARNING'
    : 'NONE';

  const isCoveredByPendingOrder =
    isThresholdBreached && pendingOrders > 0 && effectivePipelineStock >= reorderPoint;

  const unitLabel = med?.unit || 'Units';
  let breachRuleCode: ThresholdAndReplenishmentEvaluation['breachRuleCode'] = 'HEALTHY';
  let breachRuleTitle = 'Within Configurable Demo Threshold Buffer';
  let breachRuleShortBadge = 'Healthy Buffer';
  let breachExplanation = `Usable stock (${usableStock} ${unitLabel}, ${usableDaysOfCover}d cover) exceeds the configurable demo minimum threshold (${minThreshold} ${unitLabel}) and Reorder Point (${reorderPoint} ${unitLabel}). Delivery lead time (${leadTimeDays}d ≤ ${maxAllowedLeadTimeDays}d max allowed) is within normal limits.`;

  const expiredSuffix =
    expiredBatchStock > 0 ? ` (${expiredBatchStock} expired ${unitLabel} excluded)` : '';

  if (isZeroUsable) {
    breachRuleCode = 'ZERO_USABLE_STOCK';
    breachRuleTitle = 'Demo Rule 1A: Zero Usable Stock (Stock-Out)';
    breachRuleShortBadge = 'Zero Usable Stock (0)';
    breachExplanation = `0 usable ${unitLabel} available${expiredSuffix}. Immediate replenishment of +${recommendedOrderQty} ${unitLabel} recommended under configurable demo thresholds.`;
  } else if (isCriticalFloorBreach && isStockCoverBelowLeadTime) {
    breachRuleCode = 'CRITICAL_FLOOR_50PCT';
    breachRuleTitle = `Demo Rule 1B: Critical Demo Floor (≤${criticalStockFloor} ${unitLabel}) & Stock Cover Below Delivery Lead Time (Cover: ${usableDaysOfCover}d < Lead Time: ${leadTimeDays}d)`;
    breachRuleShortBadge = `Critical Floor (≤${criticalStockFloor}) & Cover ${usableDaysOfCover}d < ${leadTimeDays}d Transit`;
    breachExplanation = `Usable stock (${usableStock} ${unitLabel}${expiredSuffix}) is at or below the configurable 50% critical floor (${criticalStockFloor} ${unitLabel}), and stock cover (${usableDaysOfCover}d at ${dailyConsumption}/day) is shorter than the ${leadTimeDays}d delivery transit time (Note: supplier lead time ${leadTimeDays}d ≤ ${maxAllowedLeadTimeDays}d max allowed is NOT breached).`;
  } else if (isCriticalFloorBreach) {
    breachRuleCode = 'CRITICAL_FLOOR_50PCT';
    breachRuleTitle = `Demo Rule 1B: Critical Demo Floor Breached (≤${criticalStockFloor} ${unitLabel} / 50% of Configurable Min)`;
    breachRuleShortBadge = `Critical Floor ≤${criticalStockFloor} ${unitLabel}`;
    breachExplanation = `Usable stock (${usableStock} ${unitLabel}${expiredSuffix}) dropped at or below 50% of the configurable demo minimum threshold (${minThreshold} ${unitLabel}).`;
  } else if (isStockCoverBelowLeadTime) {
    breachRuleCode = 'LEAD_TIME_RUNWAY_BREACH';
    breachRuleTitle = `Demo Rule 1C: Stock Cover Below Delivery Lead Time (Stock Cover: ${usableDaysOfCover}d < Delivery Lead Time: ${leadTimeDays}d)`;
    breachRuleShortBadge = `Stock Cover ${usableDaysOfCover}d < ${leadTimeDays}d Transit`;
    breachExplanation = `Usable stock (${usableStock} ${unitLabel}${expiredSuffix}) covers ${usableDaysOfCover} days at ${dailyConsumption} ${unitLabel}/day, which is less than the ${leadTimeDays}-day delivery transit window (Lead-Time Demand: ${leadTimeDemand} ${unitLabel}). Supplier lead time itself (${leadTimeDays}d ≤ ${maxAllowedLeadTimeDays}d max) is within allowed limits.`;
  } else if (isMinBufferBreach) {
    breachRuleCode = 'MIN_SAFETY_THRESHOLD_BREACH';
    breachRuleTitle = `Demo Rule 2A: Below Configurable Minimum Threshold (<${minThreshold} ${unitLabel})`;
    breachRuleShortBadge = `Below Demo Min (<${minThreshold})`;
    breachExplanation = `Usable stock (${usableStock} ${unitLabel}${expiredSuffix}) is below the configurable demo facility threshold of ${minThreshold} ${unitLabel} (~${usableDaysOfCover} days cover remaining).`;
  } else if (isDynamicRopBreach) {
    breachRuleCode = 'DYNAMIC_ROP_BREACH';
    breachRuleTitle = `Demo Rule 2B: Below Configurable Reorder Point (<${reorderPoint} ${unitLabel} ROP)`;
    breachRuleShortBadge = `Below Demo ROP (<${reorderPoint})`;
    breachExplanation = `Usable stock (${usableStock} ${unitLabel}${expiredSuffix}, ~${usableDaysOfCover}d cover) is below the configurable Reorder Point of ${reorderPoint} ${unitLabel} (${leadTimeDemand} lead-time demand + ${safetyStock} demo safety buffer).`;
  } else if (isSupplierLeadTimeBreach) {
    breachRuleCode = 'SUPPLIER_LEAD_TIME_BREACH';
    breachRuleTitle = `Demo Rule 2C: Supplier Lead-Time Breach (Actual: ${leadTimeDays}d > Max Allowed: ${maxAllowedLeadTimeDays}d)`;
    breachRuleShortBadge = `Lead Time ${leadTimeDays}d > ${maxAllowedLeadTimeDays}d Max`;
    breachExplanation = `Configured delivery lead time (${leadTimeDays} days) exceeds the maximum allowed demo lead time (${maxAllowedLeadTimeDays} days).`;
  }

  const replenishmentFormulaSummary =
    pendingOrders > 0
      ? `Configurable ${replenishmentCycleDays}d Target (${targetCycleStock}) − [Usable (${usableStock}) + Pipeline (${pendingOrders})] = ${
          suggestedOrderQty > 0
            ? `+${suggestedOrderQty} ${unitLabel} Net Order`
            : `Covered by +${pendingOrders} ${unitLabel} in transit (Supplemental: +${supplementalOrderQty})`
        }`
      : `Configurable ${replenishmentCycleDays}d Target (${targetCycleStock}) − Usable (${usableStock}) = +${recommendedOrderQty} ${unitLabel} (rounded to ${packRoundingStep}s)`;

  const thresholdConfigLabel = `Configurable Demo Thresholds: Min=${minThreshold}, Floor=${criticalStockFloor}, ROP=${reorderPoint}, Max=${maxThreshold} ${unitLabel} | Delivery Lead Time=${leadTimeDays}d (Max Allowed=${maxAllowedLeadTimeDays}d)`;

  const recommendedPriority: ThresholdAndReplenishmentEvaluation['recommendedPriority'] = isCritical
    ? 'EMERGENCY_REPLENISHMENT'
    : isWarning
    ? 'URGENT'
    : 'ROUTINE';

  return {
    medicineId: med?.id || 'unknown-med',
    medicineName: med?.name || 'Unknown Medicine',
    unit: unitLabel,
    physicalStock,
    usableStock,
    expiredBatchStock,
    pendingOrders,
    effectivePipelineStock,
    dailyConsumption,
    usableDaysOfCover,
    pipelineDaysOfCover,
    minThreshold,
    criticalStockFloor,
    leadTimeDays,
    maxAllowedLeadTimeDays,
    isSupplierLeadTimeBreach,
    isStockCoverBelowLeadTime,
    safetyBufferDays,
    replenishmentCycleDays,
    leadTimeDemand,
    safetyStock,
    reorderPoint,
    targetCycleStock,
    packRoundingStep,
    netDeficitAfterPipeline,
    grossDeficitWithoutPipeline,
    suggestedOrderQty,
    supplementalOrderQty,
    recommendedOrderQty,
    isCoveredByPendingOrder,
    riskLevel,
    isThresholdBreached,
    breachSeverity,
    breachRuleCode,
    breachRuleTitle,
    breachRuleShortBadge,
    breachExplanation,
    replenishmentFormulaSummary,
    thresholdConfigLabel,
    recommendedPriority
  };
}

export function evaluateNetworkMapFacilities(
  networkFacilities: NetworkFacility[],
  inventoryByFacilityId: Record<string, MedicineItem[] | undefined>,
  optionsOrQuery?:
    | {
        assessedMedicineQuery?: string;
        leadTimeDays?: number;
        referenceDate?: string;
        isSimulatedData?: boolean;
      }
    | string,
  referenceDateArg?: string
): NetworkFacility[] {
  const options =
    typeof optionsOrQuery === 'string'
      ? { assessedMedicineQuery: optionsOrQuery, referenceDate: referenceDateArg }
      : optionsOrQuery;

  return networkFacilities.map((fac) => {
    const matchedInventory =
      inventoryByFacilityId[fac.id] ||
      inventoryByFacilityId[fac.id.toLowerCase()] ||
      inventoryByFacilityId[fac.code] ||
      undefined;

    return evaluateNetworkFacilityInventory({
      facility: fac,
      facilityInventory: matchedInventory,
      assessedMedicineQuery: options?.assessedMedicineQuery || 'ALL',
      leadTimeDays: options?.leadTimeDays,
      referenceDate: options?.referenceDate || referenceDateArg,
      isSimulatedData: options?.isSimulatedData
    });
  });
}


