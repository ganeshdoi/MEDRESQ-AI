import assert from 'node:assert/strict';
import {
  calculateMedicineForecast,
  simulateSupplyDisruption,
  evaluateNetworkFacilityInventory,
  evaluateNetworkMapFacilities,
  applyFefoStockAdjustment
} from '../src/utils/inventoryForecast.ts';
import { generateEssentialMedicinesForPHC } from '../src/data/nationalEssentialMedicines.ts';
import { RAW_NETWORK_FACILITIES, buildDefaultFacilityInventoryMap } from '../src/data/networkData.ts';
import { FACILITIES, INITIAL_ORDERS, INITIAL_REDISTRIBUTION } from '../src/data/mockData.ts';

function runForecastTests() {
  console.log('=== MEDRESQ AI Deterministic Medicine Demand & Stock-Out Forecast Tests ===\n');

  const osianMeds = generateEssentialMedicinesForPHC('phc-osian', 'District Drug Warehouse Mandore (RMSCL)');
  const mandoreMeds = generateEssentialMedicinesForPHC('phc-mandore', 'District Drug Warehouse Mandore (RMSCL)');

  // ---------------------------------------------------------------------------
  // TEST 1: Low-Stock Example (Normal Saline 0.9% IV at PHC Osian - 64 bottles, 16/day burn, 0 pending)
  // and ORS at PHC Osian (210 sachets, 58/day burn)
  // ---------------------------------------------------------------------------
  console.log('1. Testing Low-Stock Examples (PHC Osian — Normal Saline & ORS)...');
  const osianNS = osianMeds.find((m) => m.id === 'med-nlem-fl-02-phc-osian')!;
  assert.ok(osianNS, 'Normal Saline at PHC Osian should exist');

  const nsForecast = calculateMedicineForecast({
    medicine: osianNS,
    phcName: 'PHC Osian (24x7)',
    leadTimeDays: 3.5,
    safetyBufferDays: 3.0,
    replenishmentCycleDays: 14,
    consumptionPeriodDays: 30,
    referenceDate: '2026-09-22',
    isSyntheticData: true
  });

  // Arithmetic verification for Normal Saline (Low Stock):
  // Usable Stock = 64 - 0 = 64 bottles
  // Recent Avg Daily Consumption = 16 bottles/day (Last 30 days)
  // Days Remaining = 64 / 16 = 4.0 days -> Stock-out Date = 2026-09-22 + 4d = 2026-09-26
  // Lead-Time Demand = ceil(16 * 3.5) = 56 bottles
  // Safety Stock = max(ceil(16 * 3), min(100, ceil(16 * 7))) = max(48, 100) = 100 bottles
  // Reorder Point (ROP) = 56 + 100 = 156 bottles
  // Target Stock (14d cycle) = ceil(16 * 14) + 100 = 224 + 100 = 324 bottles
  // Suggested Replenishment = roundUpTo50(324 - 64) = roundUpTo50(260) = 300 bottles
  assert.equal(nsForecast.usableStock, 64);
  assert.equal(nsForecast.expiredBatchStock, 0);
  assert.equal(nsForecast.recentAvgDailyConsumption, 16);
  assert.equal(nsForecast.estimatedDaysRemaining, 4.0);
  assert.equal(nsForecast.estimatedStockoutDate, '2026-09-26');
  assert.equal(nsForecast.leadTimeDays, 3.5);
  assert.equal(nsForecast.leadTimeDemand, 56);
  assert.equal(nsForecast.safetyStock, 100);
  assert.equal(nsForecast.reorderPoint, 156);
  assert.equal(nsForecast.suggestedReplenishmentQty, 300);
  assert.equal(nsForecast.riskLevel, 'WARNING');
  assert.equal(nsForecast.isSimulatedEstimate, true);
  assert.match(nsForecast.primaryRiskReason, /Reorder Point/i);

  // Critical Lead-Time Deficit Example: Polyvalent Anti-Snake Venom (ASV) at PHC Osian (9 vials, 5/day burn)
  const osianASV = osianMeds.find((m) => m.id === 'med-nlem-ant-01-phc-osian')!;
  const asvForecast = calculateMedicineForecast({
    medicine: { ...osianASV, pendingOrders: 0 },
    phcName: 'PHC Osian (24x7)',
    leadTimeDays: 3.5,
    safetyBufferDays: 3.0,
    replenishmentCycleDays: 14,
    referenceDate: '2026-09-22'
  });
  // Usable Stock = 9 vials, Daily Burn = 5/day -> 1.8 days remaining (< 3.5d lead time -> CRITICAL)
  // Est Stock-Out Date = 2026-09-22 + floor(1.8) = 2026-09-23
  assert.equal(asvForecast.usableStock, 9);
  assert.equal(asvForecast.estimatedDaysRemaining, 1.8);
  assert.equal(asvForecast.estimatedStockoutDate, '2026-09-23');
  assert.equal(asvForecast.riskLevel, 'CRITICAL');
  assert.equal(asvForecast.primaryRiskFactor, 'LEAD_TIME_DEFICIT');
  console.log('   [PASS] Low-stock & critical lead-time deficit examples verified.\n');

  // ---------------------------------------------------------------------------
  // TEST 2: Normal-Stock Example (Amoxicillin / Ciprofloxacin or Mandore Normal Saline)
  // ---------------------------------------------------------------------------
  console.log('2. Testing Normal-Stock Example (PHC Mandore — Normal Saline & PHC Osian — Normal Coverage Item)...');
  // Let's test a normal-stock medicine (e.g. 400 bottles of Normal Saline with 16/day burn = 25.0 days remaining)
  const normalStockMed = {
    ...osianNS,
    id: 'med-nlem-fl-02-phc-mandore',
    phcId: 'phc-mandore',
    currentStock: 400,
    dailyConsumption: 16,
    minStockLevel: 100,
    maxStockLevel: 600,
    pendingOrders: 0,
    batches: [
      {
        batchNumber: 'FL-RJ-2605',
        quantity: 400,
        expiryDate: '2027-06-28',
        status: 'ACTIVE' as const
      }
    ]
  };

  const normalForecast = calculateMedicineForecast({
    medicine: normalStockMed,
    phcName: 'PHC Mandore',
    leadTimeDays: 3.5,
    safetyBufferDays: 3.0,
    replenishmentCycleDays: 14,
    referenceDate: '2026-09-22',
    isSyntheticData: true
  });

  // Arithmetic verification for Normal Stock:
  // Usable Stock = 400 bottles (0 expired)
  // Daily Burn = 16 bottles/day -> Days Remaining = 400 / 16 = 25.0 days
  // Est Stock-Out Date = 2026-09-22 + 25 days = 2026-10-17
  // Lead-Time Demand = 56, Safety Stock = 100, Reorder Point (ROP) = 156 bottles
  // Target Stock (14d cycle) = 224 + 100 = 324 bottles
  // Since Usable Stock (400) > ROP (156) and >= Target Stock (324), Suggested Replenishment = 0
  assert.equal(normalForecast.usableStock, 400);
  assert.equal(normalForecast.expiredBatchStock, 0);
  assert.equal(normalForecast.recentAvgDailyConsumption, 16);
  assert.equal(normalForecast.estimatedDaysRemaining, 25.0);
  assert.equal(normalForecast.estimatedStockoutDate, '2026-10-17');
  assert.equal(normalForecast.reorderPoint, 156);
  assert.equal(normalForecast.suggestedReplenishmentQty, 0);
  assert.equal(normalForecast.riskLevel, 'NORMAL');
  assert.match(normalForecast.primaryRiskReason, /Adequate buffer/i);
  console.log('   [PASS] Normal-stock example verified.\n');

  // ---------------------------------------------------------------------------
  // TEST 3: Batch Expiry Deduction Example (Ibuprofen 400mg at PHC Osian)
  // ---------------------------------------------------------------------------
  console.log('3. Testing Batch Expiry Exclusion (Ibuprofen 400mg with expired sub-batch)...');
  const osianIbuprofen = osianMeds.find((m) => m.id === 'med-nlem-ana-02-phc-osian')!;
  assert.ok(osianIbuprofen, 'Ibuprofen 400mg should exist at PHC Osian');

  const ibuForecast = calculateMedicineForecast({
    medicine: osianIbuprofen,
    phcName: 'PHC Osian (24x7)',
    leadTimeDays: 3.5,
    safetyBufferDays: 3.0,
    replenishmentCycleDays: 14,
    referenceDate: '2026-09-22'
  });

  // Total physical stock = 900, Expired sub-batch = 120 (exp 2026-08-15), Usable stock = 780
  // Daily burn = 65/day -> Days remaining = 780 / 65 = 12.0 days (instead of 900 / 65 = 13.8 days)
  assert.equal(ibuForecast.totalPhysicalStock, 900);
  assert.equal(ibuForecast.expiredBatchStock, 120);
  assert.equal(ibuForecast.usableStock, 780);
  assert.equal(ibuForecast.estimatedDaysRemaining, 12.0);
  assert.equal(ibuForecast.estimatedStockoutDate, '2026-10-04');
  assert.match(ibuForecast.primaryRiskReason, /120 Tablets of expired batch stock were excluded/i);
  console.log('   [PASS] Expired batch stock exclusion verified.\n');

  // ---------------------------------------------------------------------------
  // TEST 4: Missing & Zero Consumption Safe Handling
  // ---------------------------------------------------------------------------
  console.log('4. Testing Missing / Zero Consumption Safe Edge-Case Handling...');
  const zeroBurnForecast = calculateMedicineForecast({
    medicine: {
      id: 'med-zero-test',
      name: 'Test Zero Burn Drug',
      unit: 'Tablets',
      currentStock: 250,
      dailyConsumption: 0,
      minStockLevel: 100
    },
    phcName: 'PHC Osian (24x7)',
    referenceDate: '2026-09-22'
  });

  assert.equal(zeroBurnForecast.isDepletionCalculable, false);
  assert.equal(zeroBurnForecast.estimatedDaysRemaining, null);
  assert.equal(zeroBurnForecast.estimatedStockoutDate, null);
  assert.equal(zeroBurnForecast.estimatedStockoutDateFormatted, 'Not calculable');

  const missingDataForecast = calculateMedicineForecast({
    medicine: {
      id: 'med-missing-test',
      name: 'Test Missing Data Drug',
      unit: 'Vials',
      currentStock: undefined,
      dailyConsumption: undefined
    },
    phcName: 'PHC Osian (24x7)',
    referenceDate: '2026-09-22'
  });

  assert.equal(missingDataForecast.usableStock, 0);
  assert.equal(missingDataForecast.isDepletionCalculable, false);
  assert.equal(missingDataForecast.estimatedDaysRemaining, null);
  assert.equal(missingDataForecast.estimatedStockoutDate, null);
  console.log('   [PASS] Missing and zero consumption edge cases handled safely.\n');

  // ---------------------------------------------------------------------------
  // TEST 5: What-If Supply Disruption Simulation (Current vs. Delayed Scenario & Donor Safety Floor)
  // ---------------------------------------------------------------------------
  console.log('5. Testing What-If Supply Disruption Simulation (PHC Osian — Normal Saline +3d Delay)...');
  const balesarMeds = generateEssentialMedicinesForPHC(FACILITIES[2].id, 'District Drug Warehouse Mandore (RMSCL)');
  const fourthPhcMeds = generateEssentialMedicinesForPHC(FACILITIES[3].id, 'District Drug Warehouse Mandore (RMSCL)');

  // Snapshot inventory, orders, and redistributions BEFORE running simulation
  const osianSnapshotBefore = JSON.stringify(osianMeds);
  const mandoreSnapshotBefore = JSON.stringify(mandoreMeds);
  const balesarSnapshotBefore = JSON.stringify(balesarMeds);
  const ordersSnapshotBefore = JSON.stringify(INITIAL_ORDERS);
  const redistSnapshotBefore = JSON.stringify(INITIAL_REDISTRIBUTION);

  const simResult = simulateSupplyDisruption({
    recipientPHC: FACILITIES[0], // PHC Osian
    recipientMedicine: osianNS, // 64 Bottles usable, 16/day consumption -> 4.0 days remaining
    baseLeadTimeDays: 3.5,
    deliveryDelayDays: 3.0, // Delayed lead time = 6.5 days
    demandSurgeMultiplier: 1.0,
    candidateDonors: [
      { phc: FACILITIES[1], medicines: mandoreMeds }, // PHC Mandore (520 Bottles usable, 10/day burn)
      { phc: FACILITIES[2], medicines: balesarMeds }, // PHC Balesar (108 Bottles usable, 15/day burn)
      { phc: FACILITIES[3], medicines: fourthPhcMeds }
    ],
    referenceDate: '2026-09-22'
  });

  assert.equal(simResult.isSimulationOnly, true);
  assert.equal(simResult.usableStock, 64);
  assert.equal(simResult.effectiveDailyDemand, 16);

  // Current Scenario (3.5d lead time): on-hand stock (4.0d) outlasts 3.5d delivery arrival (2026-09-26),
  // so scheduled delivery (300 Bottles) extends stock-out date to 2026-10-14 (22.8 days total) with 0d gap!
  assert.equal(simResult.currentScenario.leadTimeDays, 3.5);
  assert.equal(simResult.currentScenario.onHandDaysRemaining, 4.0);
  assert.equal(simResult.currentScenario.onHandStockoutDate, '2026-09-26');
  assert.equal(simResult.currentScenario.unprotectedGapDaysBeforeDelivery, 0);
  assert.equal(simResult.currentScenario.effectiveStockoutDate, '2026-10-14');

  // Delayed Scenario (3.5d + 3.0d = 6.5d total lead time, arriving 2026-09-29):
  // On-hand stock (4.0d) exhausts on 2026-09-26 BEFORE delayed truck arrives on 2026-09-29!
  // Unprotected stock-out gap = 6.5 - 4.0 = 2.5 days (40 Bottles deficit).
  assert.equal(simResult.delayedScenario.delayDays, 3.0);
  assert.equal(simResult.delayedScenario.totalLeadTimeDays, 6.5);
  assert.equal(simResult.delayedScenario.stocksOutBeforeDeliveryArrives, true);
  assert.equal(simResult.delayedScenario.effectiveStockoutDate, '2026-09-26');
  assert.equal(simResult.delayedScenario.unprotectedGapDaysBeforeDelivery, 2.5);
  assert.equal(simResult.delayedScenario.unprotectedDeficitUnits, 40);

  // Verify Donor Assessments:
  // 1) PHC Mandore: Usable = 520, NLEM min = 100, SS = 70, ROP = 10*3.5 + 70 = 105 -> Defined Safety Floor = 105
  //    Max Safe Surplus = 520 - 105 = 415 Bottles.
  //    Recipient delayed ROP = ceil(16*6.5) + 70 = 174 -> Bridge Need = 174 - 64 = 110 Bottles.
  //    Possible Transfer = min(415, 110) = 110 Bottles.
  //    Donor Stock After Transfer = 520 - 110 = 410 Bottles >= 105 Bottles (never drops below safety stock).
  const mandoreDonor = simResult.donorAssessments.find((d) => d.phcId === 'phc-mandore')!;
  assert.ok(mandoreDonor, 'PHC Mandore assessment should exist');
  assert.equal(mandoreDonor.isEligible, true);
  assert.equal(mandoreDonor.usableStock, 520);
  assert.equal(mandoreDonor.definedSafetyStock, 105);
  assert.equal(mandoreDonor.maxSafeTransferQty, 415);
  assert.equal(mandoreDonor.possibleTransferQty, 140);
  assert.equal(mandoreDonor.donorStockAfterTransfer, 380);
  assert.ok(
    mandoreDonor.donorStockAfterTransfer >= mandoreDonor.definedSafetyStock,
    'Donor stock after transfer must never fall below its defined safety stock'
  );

  // 2) PHC Balesar (FACILITIES[2]): Usable = 60, NLEM min = 100, ROP = 133 -> Defined Safety Floor = 133
  //    Since 60 <= 133, PHC Balesar is INELIGIBLE and possibleTransferQty = 0.
  const balesarDonor = simResult.donorAssessments.find((d) => d.phcId === FACILITIES[2].id)!;
  assert.ok(balesarDonor, 'PHC Balesar assessment should exist');
  assert.equal(balesarDonor.isEligible, false);
  assert.equal(balesarDonor.usableStock, 60);
  assert.equal(balesarDonor.definedSafetyStock, 156);
  assert.equal(balesarDonor.maxSafeTransferQty, 0);
  assert.equal(balesarDonor.possibleTransferQty, 0);
  assert.match(balesarDonor.eligibilityExplanation, /INELIGIBLE/i);

  console.log('   Current Scenario Stock-Out Date:', simResult.currentScenario.effectiveStockoutDate);
  console.log('   Delayed Scenario Stock-Out Date:', simResult.delayedScenario.effectiveStockoutDate);
  console.log('   Eligible Donor (PHC Mandore):', {
    usableStock: mandoreDonor.usableStock,
    definedSafetyStock: mandoreDonor.definedSafetyStock,
    maxSafeTransferQty: mandoreDonor.maxSafeTransferQty,
    possibleTransferQty: mandoreDonor.possibleTransferQty,
    donorStockAfterTransfer: mandoreDonor.donorStockAfterTransfer
  });
  console.log('   Ineligible Donor (PHC Balesar):', {
    usableStock: balesarDonor.usableStock,
    definedSafetyStock: balesarDonor.definedSafetyStock,
    possibleTransferQty: balesarDonor.possibleTransferQty
  });
  console.log('   [PASS] What-If Supply Disruption Simulation verified.\n');

  // ---------------------------------------------------------------------------
  // TEST 6: Non-Mutation Verification (Inventory, Orders, and Transfers Unchanged)
  // ---------------------------------------------------------------------------
  console.log('6. Testing Non-Mutation Guarantee (Inventory, Orders & Transfers Unchanged)...');
  assert.equal(JSON.stringify(osianMeds), osianSnapshotBefore, 'Recipient PHC inventory must remain unchanged');
  assert.equal(JSON.stringify(mandoreMeds), mandoreSnapshotBefore, 'Donor PHC inventory must remain unchanged');
  assert.equal(JSON.stringify(balesarMeds), balesarSnapshotBefore, 'Ineligible PHC inventory must remain unchanged');
  assert.equal(JSON.stringify(INITIAL_ORDERS), ordersSnapshotBefore, 'Orders list must remain unchanged');
  assert.equal(JSON.stringify(INITIAL_REDISTRIBUTION), redistSnapshotBefore, 'Redistributions list must remain unchanged');
  console.log('   [PASS] Running simulation leaves all inventory, orders, and transfers 100% unchanged.\n');

  // ---------------------------------------------------------------------------
  // TEST 7: Network Map Facility-to-Inventory Evaluation & Threshold Calculation
  // ---------------------------------------------------------------------------
  console.log('7. Testing Network Map Facility-to-Inventory Status Calculation...');
  const baseInventoryMap = buildDefaultFacilityInventoryMap();
  const targetMed = 'Oral Rehydration Salts (ORS) Sachets IP 20.5g';

  const evaluatedMap = evaluateNetworkMapFacilities(
    RAW_NETWORK_FACILITIES,
    baseInventoryMap,
    targetMed,
    '2026-09-22'
  );

  const osianMapNode = evaluatedMap.find((f) => f.id === 'phc-osian')!;
  const mandoreMapNode = evaluatedMap.find((f) => f.id === 'phc-mandore')!;
  const balesarMapNode = evaluatedMap.find((f) => f.id === 'phc-balesar')!;

  // PHC Osian has 210 ORS sachets, 58/day consumption (3.6d left), minThreshold = 500 (<=50% of 500 is 250), maxThreshold = 2500 -> CRITICAL / CRITICAL_DEFICIT
  assert.equal(osianMapNode.isInventoryMatched, true);
  assert.equal(osianMapNode.isSimulatedData, true);
  assert.equal(osianMapNode.assessedMedicineName, targetMed);
  assert.equal(osianMapNode.assessedUsableStock, 210);
  assert.equal(osianMapNode.assessedMinThreshold, 500);
  assert.equal(osianMapNode.assessedMaxThreshold, 3000);
  assert.equal(osianMapNode.assessedDaysRemaining, 3.6);
  assert.equal(osianMapNode.assessedRiskCategory, 'CRITICAL');
  assert.equal(osianMapNode.medicineRisk, 'CRITICAL_DEFICIT');

  // PHC Mandore has 2150 ORS sachets, 25/day consumption (86.0d left), minThreshold = 500, maxThreshold = 2500 -> SURPLUS / SURPLUS_AVAILABLE
  assert.equal(mandoreMapNode.isInventoryMatched, true);
  assert.equal(mandoreMapNode.isSimulatedData, true);
  assert.equal(mandoreMapNode.assessedMedicineName, targetMed);
  assert.equal(mandoreMapNode.assessedUsableStock, 2150);
  assert.equal(mandoreMapNode.assessedRiskCategory, 'SURPLUS');
  assert.equal(mandoreMapNode.medicineRisk, 'SURPLUS_AVAILABLE');
  console.log('   [PASS] Network map facility status calculated accurately from inventory & thresholds.\n');

  // ---------------------------------------------------------------------------
  // TEST 8: Unmatched Facility & Unmatched Medicine -> Unknown / Unavailable Status
  // ---------------------------------------------------------------------------
  console.log('8. Testing Unmatched Facility & Unmatched Medicine (No Invented Shortage/Surplus)...');
  const khetasarNode = evaluatedMap.find((f) => f.id === 'hwc-khetasar')!;
  assert.ok(khetasarNode, 'Unmapped Sub-Centre Khetasar node should exist on map');
  assert.equal(khetasarNode.isInventoryMatched, false);
  assert.equal(khetasarNode.assessedRiskCategory, 'UNKNOWN');
  assert.equal(khetasarNode.medicineRisk, 'UNKNOWN');
  assert.equal(khetasarNode.keyShortages.length, 0, 'Unmatched facility must not invent shortages');
  assert.equal(khetasarNode.keySurpluses.length, 0, 'Unmatched facility must not invent surpluses');

  // Also test a mapped PHC when assessing an unmatched medicine
  const unmatchedMedNode = evaluateNetworkFacilityInventory(
    RAW_NETWORK_FACILITIES.find((f) => f.id === 'phc-osian')!,
    baseInventoryMap['phc-osian'],
    'NonExistent Vaccine XYZ-999',
    '2026-09-22'
  );
  assert.equal(unmatchedMedNode.isInventoryMatched, true);
  assert.equal(unmatchedMedNode.assessedRiskCategory, 'UNKNOWN');
  assert.equal(unmatchedMedNode.medicineRisk, 'UNKNOWN');
  assert.equal(unmatchedMedNode.assessedUsableStock, null);
  console.log('   [PASS] Unmatched facilities and medicines return UNKNOWN status without inventing data.\n');

  // ---------------------------------------------------------------------------
  // TEST 9: Changing Stock Changes Corresponding Facility Status While Unrelated Facilities Remain Unchanged
  // ---------------------------------------------------------------------------
  console.log('9. Testing Isolated Stock Change on Network Map (Target Facility Changes, Unrelated Facilities Unchanged)...');
  const beforeMandoreSnapshot = JSON.stringify(mandoreMapNode);
  const beforeBalesarSnapshot = JSON.stringify(balesarMapNode);
  const beforeKhetasarSnapshot = JSON.stringify(khetasarNode);

  // 9a. Raise PHC Osian ORS stock from 210 (CRITICAL) to 350 sachets (WARNING: >250 and <minThreshold 500, 6.0d cover)
  const updatedInventoryWarning = {
    ...baseInventoryMap,
    'phc-osian': baseInventoryMap['phc-osian'].map((m) =>
      m.name === targetMed
        ? {
            ...m,
            stock: 350,
            currentStock: 350,
            batches: m.batches?.map((b, i) => (i === 0 ? { ...b, quantity: 350 } : { ...b, quantity: 0 }))
          }
        : m
    )
  };
  const evaluatedAfterWarning = evaluateNetworkMapFacilities(
    RAW_NETWORK_FACILITIES,
    updatedInventoryWarning,
    targetMed,
    '2026-09-22'
  );
  const osianAfterWarning = evaluatedAfterWarning.find((f) => f.id === 'phc-osian')!;
  assert.equal(osianAfterWarning.assessedUsableStock, 350);
  assert.equal(osianAfterWarning.assessedRiskCategory, 'WARNING');
  assert.equal(osianAfterWarning.medicineRisk, 'BUFFER_DEPLETING');

  // 9b. Raise PHC Osian ORS stock to 750 sachets (NORMAL: between minThreshold 500 and maxThreshold 2500, 12.9d cover)
  const updatedInventoryNormal = {
    ...baseInventoryMap,
    'phc-osian': baseInventoryMap['phc-osian'].map((m) =>
      m.name === targetMed
        ? {
            ...m,
            stock: 750,
            currentStock: 750,
            batches: m.batches?.map((b, i) => (i === 0 ? { ...b, quantity: 750 } : { ...b, quantity: 0 }))
          }
        : m
    )
  };
  const evaluatedAfterNormal = evaluateNetworkMapFacilities(
    RAW_NETWORK_FACILITIES,
    updatedInventoryNormal,
    targetMed,
    '2026-09-22'
  );
  const osianAfterNormal = evaluatedAfterNormal.find((f) => f.id === 'phc-osian')!;
  assert.equal(osianAfterNormal.assessedUsableStock, 750);
  assert.equal(osianAfterNormal.assessedRiskCategory, 'NORMAL');
  assert.equal(osianAfterNormal.medicineRisk, 'ADEQUATE');

  // 9c. Raise PHC Osian ORS stock to 2800 sachets (SURPLUS: > maxThreshold 2500 and 48.3d cover)
  const updatedInventorySurplus = {
    ...baseInventoryMap,
    'phc-osian': baseInventoryMap['phc-osian'].map((m) =>
      m.name === targetMed
        ? {
            ...m,
            stock: 2800,
            currentStock: 2800,
            batches: m.batches?.map((b, i) => (i === 0 ? { ...b, quantity: 2800 } : { ...b, quantity: 0 }))
          }
        : m
    )
  };
  const evaluatedAfterSurplus = evaluateNetworkMapFacilities(
    RAW_NETWORK_FACILITIES,
    updatedInventorySurplus,
    targetMed,
    '2026-09-22'
  );
  const osianAfterSurplus = evaluatedAfterSurplus.find((f) => f.id === 'phc-osian')!;
  assert.equal(osianAfterSurplus.assessedUsableStock, 2800);
  assert.equal(osianAfterSurplus.assessedRiskCategory, 'SURPLUS');
  assert.equal(osianAfterSurplus.medicineRisk, 'SURPLUS_AVAILABLE');

  // Verify unrelated facilities (PHC Mandore, PHC Balesar, HWC Khetasar) remained 100% unchanged across all PHC Osian stock mutations
  const mandoreAfter = evaluatedAfterSurplus.find((f) => f.id === 'phc-mandore')!;
  const balesarAfter = evaluatedAfterSurplus.find((f) => f.id === 'phc-balesar')!;
  const khetasarAfter = evaluatedAfterSurplus.find((f) => f.id === 'hwc-khetasar')!;

  assert.equal(JSON.stringify(mandoreAfter), beforeMandoreSnapshot, 'Unrelated facility PHC Mandore must remain unchanged');
  assert.equal(JSON.stringify(balesarAfter), beforeBalesarSnapshot, 'Unrelated facility PHC Balesar must remain unchanged');
  assert.equal(JSON.stringify(khetasarAfter), beforeKhetasarSnapshot, 'Unrelated unmapped facility HWC Khetasar must remain unchanged');
  console.log('   [PASS] Changing stock updates target facility status (WARNING -> CRITICAL -> NORMAL -> SURPLUS) while unrelated facilities remain unchanged.\n');

  // =========================================================================
  // TEST 10: Batch-Level FEFO Deduction & Expiry Exclusion
  // =========================================================================
  console.log('10. Batch-Level FEFO Deduction & Expiry Handling:');
  const multiBatchMed = {
    ...osianMeds[0],
    id: 'med-fefo-test',
    name: 'Amoxicillin Dispersible 250mg',
    currentStock: 190,
    stock: 190,
    minStockLevel: 100,
    maxStockLevel: 600,
    dailyConsumption: 20,
    batches: [
      { batchNumber: 'AMX-EXP-01', expiryDate: '2026-08-01', quantity: 40 }, // EXPIRED
      { batchNumber: 'AMX-LATE-03', expiryDate: '2027-06-30', quantity: 90 }, // Usable (later expiry)
      { batchNumber: 'AMX-SOON-02', expiryDate: '2026-11-15', quantity: 60 }  // Usable (earliest expiry -> FEFO first)
    ]
  };

  // 10a. Rejects deduction exceeding usableStock (150 usable, 40 expired) even if <= physical currentStock (190)
  const overDispenseRes = applyFefoStockAdjustment(multiBatchMed, -160, '2026-09-22');
  assert.equal(overDispenseRes.ok, false, 'Must reject deduction exceeding non-expired usable stock');
  assert.equal(overDispenseRes.usableStockBefore, 150);
  assert.equal(overDispenseRes.expiredBatchStock, 40);

  // 10b. Deducting 80 units takes all 60 from earliest non-expired batch (AMX-SOON-02) and 20 from next batch (AMX-LATE-03), leaving expired batch untouched
  const validFefoRes = applyFefoStockAdjustment(multiBatchMed, -80, '2026-09-22');
  assert.equal(validFefoRes.ok, true);
  assert.equal(validFefoRes.usableStockBefore, 150);
  assert.equal(validFefoRes.usableStockAfter, 70);
  assert.equal(validFefoRes.expiredBatchStock, 40);
  assert.equal(multiBatchMed.currentStock, 110); // 70 usable + 40 expired
  assert.equal(validFefoRes.deductedBatches.length, 2);
  assert.equal(validFefoRes.deductedBatches[0].batchNumber, 'AMX-SOON-02');
  assert.equal(validFefoRes.deductedBatches[0].deducted, 60);
  assert.equal(validFefoRes.deductedBatches[0].remaining, 0);
  assert.equal(validFefoRes.deductedBatches[1].batchNumber, 'AMX-LATE-03');
  assert.equal(validFefoRes.deductedBatches[1].deducted, 20);
  assert.equal(validFefoRes.deductedBatches[1].remaining, 70);
  // Active front-of-queue FEFO batch is now AMX-LATE-03 since AMX-SOON-02 is depleted
  assert.equal(multiBatchMed.batchNumber, 'AMX-LATE-03');
  assert.equal(multiBatchMed.projectedStockoutDays, 3.5); // 70 usable / 20 daily
  console.log('   [PASS] Batch-level FEFO deducts earliest non-expired batch first, excludes expired stock, and prevents negative stock.\n');

  console.log('=== ALL FORECAST, SIMULATION & NETWORK MAP INVENTORY TESTS PASSED ===');
}

runForecastTests();
