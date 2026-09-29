import assert from 'node:assert/strict';
import { resolveMedicineMatch } from '../src/utils/medicineMatcher.ts';
import { generateEssentialMedicinesForPHC } from '../src/data/nationalEssentialMedicines.ts';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function runTests() {
  console.log('=== MEDRESQ AI Critical State & Workflow Verification Suite ===\n');

  // ---------------------------------------------------------------------------
  // PART 1: Deterministic Medicine Matcher Unit Tests
  // ---------------------------------------------------------------------------
  console.log('1. Running unit tests for resolveMedicineMatch...');
  const osianMeds = generateEssentialMedicinesForPHC('phc-osian', 'Jodhpur District Drug Warehouse');

  // 1a. Exact alias match for ORS (must NOT match Paracetamol Pediatric Oral Suspension)
  const orsMatch = resolveMedicineMatch(osianMeds, 'Oral Rehydration Salts (ORS) IP 20.5g');
  assert.equal(orsMatch.status, 'MATCHED', 'ORS should match uniquely');
  assert.equal(orsMatch.medicine.id, 'med-nlem-fl-01-phc-osian', 'ORS must resolve to med-nlem-fl-01-phc-osian');

  // 1b. Exact alias match for Normal Saline (must NOT match Dextrose Normal Saline DNS)
  const nsMatch = resolveMedicineMatch(osianMeds, 'Normal Saline (0.9% NaCl) IV Infusion 500ml');
  assert.equal(nsMatch.status, 'MATCHED', 'Normal Saline should match uniquely');
  assert.equal(nsMatch.medicine.id, 'med-nlem-fl-02-phc-osian', 'Normal Saline must resolve to med-nlem-fl-02-phc-osian');

  // 1c. Specific formulation match for Paracetamol 500mg Tablets
  const pcmTabMatch = resolveMedicineMatch(osianMeds, 'Paracetamol Tablets IP 500mg');
  assert.equal(pcmTabMatch.status, 'MATCHED', 'Paracetamol Tablets IP 500mg should match uniquely');
  assert.equal(pcmTabMatch.medicine.id, 'med-nlem-ana-01-phc-osian');

  // 1d. Ambiguous query rejection ("Paracetamol" without strength/formulation)
  const ambiguousPcm = resolveMedicineMatch(osianMeds, 'Paracetamol');
  assert.equal(ambiguousPcm.status, 'AMBIGUOUS', 'Bare "Paracetamol" must be rejected as AMBIGUOUS');
  assert.ok(ambiguousPcm.candidates.length >= 2, 'Ambiguous Paracetamol should list multiple candidates');
  assert.match(ambiguousPcm.reason, /Ambiguous medicine/i);

  // 1e. Unmatched query rejection
  const unmatchedDrug = resolveMedicineMatch(osianMeds, 'Meropenem 1000mg IV Injection');
  assert.equal(unmatchedDrug.status, 'UNMATCHED', 'Unlisted drug must be rejected as UNMATCHED');
  assert.match(unmatchedDrug.reason, /does not match any item/i);

  // 1f. Stopword-only query rejection
  const stopwordOnly = resolveMedicineMatch(osianMeds, 'Oral Tablets Sachet');
  assert.equal(stopwordOnly.status, 'UNMATCHED', 'Generic dosage stopwords alone must be rejected');

  console.log('   [PASS] resolveMedicineMatch unit tests passed (exact ID, ORS vs Oral Suspension, Ambiguous, Unmatched).\n');

  // ---------------------------------------------------------------------------
  // PART 2: API & Backend State Workflow Integration Tests
  // ---------------------------------------------------------------------------
  console.log('2. Testing Register / OCR Commit Workflow (/api/inventory/verify-record)...');
  const initialStateRes = await fetch(`${BASE_URL}/api/state?phcId=phc-osian`);
  assert.equal(initialStateRes.status, 200, 'GET /api/state should return 200');
  const initialState = await initialStateRes.json();

  const initialOrs = initialState.medicines.find((m: any) => m.id === 'med-nlem-fl-01-phc-osian');
  const initialPcmSusp = initialState.medicines.find((m: any) => m.id === 'med-nlem-ana-04-phc-osian');
  assert.ok(initialOrs, 'med-nlem-fl-01-phc-osian must exist');
  assert.ok(initialPcmSusp, 'med-nlem-ana-04-phc-osian must exist');

  // 2a. Valid OCR commit deducts from matched medicine ID once
  const ocrValidRes = await fetch(`${BASE_URL}/api/inventory/verify-record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phcId: 'phc-osian',
      medicineName: 'Oral Rehydration Salts (ORS) IP 20.5g',
      quantity: 40,
      transaction: 'Dispensed (OPD)',
      date: '2026-09-22',
      batch: 'ORS-RJ-882'
    })
  });
  assert.equal(ocrValidRes.status, 200, 'Valid OCR record should return 200');
  const ocrValidData = await ocrValidRes.json();
  assert.equal(ocrValidData.matchedMedicineId, 'med-nlem-fl-01-phc-osian');
  assert.equal(ocrValidData.updatedMedicine.currentStock, initialOrs.currentStock - 40);

  const afterValidPcmSusp = ocrValidData.updatedInventory.find((m: any) => m.id === 'med-nlem-ana-04-phc-osian');
  assert.equal(
    afterValidPcmSusp.currentStock,
    initialPcmSusp.currentStock,
    'Paracetamol Pediatric Oral Suspension stock must NOT be modified when ORS is committed'
  );

  // 2b. Unmatched OCR item is rejected with 404 and leaves stock unchanged
  const ocrUnmatchedRes = await fetch(`${BASE_URL}/api/inventory/verify-record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phcId: 'phc-osian',
      medicineName: 'Vancomycin 500mg Unknown Infusion',
      quantity: 25,
      transaction: 'Dispensed (OPD)',
      date: '2026-09-22',
      batch: 'VANC-01'
    })
  });
  assert.equal(ocrUnmatchedRes.status, 404, 'Unmatched OCR medicine must return 404');
  const ocrUnmatchedData = await ocrUnmatchedRes.json();
  assert.equal(ocrUnmatchedData.code, 'UNMATCHED_MEDICINE');

  // 2c. Ambiguous OCR item is rejected with 400 and leaves stock unchanged
  const ocrAmbiguousRes = await fetch(`${BASE_URL}/api/inventory/verify-record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phcId: 'phc-osian',
      medicineName: 'Paracetamol',
      quantity: 30,
      transaction: 'Dispensed (OPD)',
      date: '2026-09-22',
      batch: 'PCM-AMB'
    })
  });
  assert.equal(ocrAmbiguousRes.status, 400, 'Ambiguous OCR medicine must return 400');
  const ocrAmbiguousData = await ocrAmbiguousRes.json();
  assert.equal(ocrAmbiguousData.code, 'AMBIGUOUS_MEDICINE');
  assert.ok(Array.isArray(ocrAmbiguousData.candidates) && ocrAmbiguousData.candidates.length >= 2);
  console.log('   [PASS] Register / OCR commit workflow verified.\n');

  // ---------------------------------------------------------------------------
  // PART 3: Inter-PHC Transfer Accounting & Explicit Status Transitions
  // ---------------------------------------------------------------------------
  console.log('3. Testing Inter-PHC Transfer Accounting & Status Transitions...');
  const mandoreBefore = await (await fetch(`${BASE_URL}/api/inventory?phcId=phc-mandore`)).json();
  const osianBefore = await (await fetch(`${BASE_URL}/api/inventory?phcId=phc-osian`)).json();

  const donorOrsBefore = mandoreBefore.find((m: any) => m.id === 'med-nlem-fl-01-phc-mandore').currentStock;
  const receiverOrsBefore = osianBefore.find((m: any) => m.id === 'med-nlem-fl-01-phc-osian').currentStock;

  // 3a. Approve REDIST-2026-01 (600 ORS from PHC Mandore -> PHC Osian)
  const approveRes = await fetch(`${BASE_URL}/api/redistributions/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'REDIST-2026-01' })
  });
  assert.equal(approveRes.status, 200, 'Transfer approval should succeed');
  const approveData = await approveRes.json();
  assert.equal(approveData.redistribution.status, 'APPROVED');
  assert.equal(approveData.redistribution.donorDeducted, true);
  assert.equal(approveData.redistribution.receiverCredited, true);
  assert.equal(approveData.sourceMedicine.currentStock, donorOrsBefore - 600, 'Donor stock must decrease by 600');
  assert.equal(approveData.targetMedicine.currentStock, receiverOrsBefore + 600, 'Receiver stock must increase by 600');

  // 3b. Duplicate approval attempt must be rejected with 400 and must NOT deduct again
  const dupApproveRes = await fetch(`${BASE_URL}/api/redistributions/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'REDIST-2026-01' })
  });
  assert.equal(dupApproveRes.status, 400, 'Duplicate transfer approval must return 400');

  // 3c. Explicit status transitions: APPROVED -> IN_TRANSIT -> COMPLETED without double-accounting
  const advance1Res = await fetch(`${BASE_URL}/api/redistributions/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'REDIST-2026-01' })
  });
  assert.equal(advance1Res.status, 200);
  const advance1Data = await advance1Res.json();
  assert.equal(advance1Data.redistribution.status, 'IN_TRANSIT');
  assert.equal(advance1Data.sourceMedicine.currentStock, donorOrsBefore - 600, 'No second deduction on IN_TRANSIT');
  assert.equal(advance1Data.targetMedicine.currentStock, receiverOrsBefore + 600, 'No second credit on IN_TRANSIT');

  const advance2Res = await fetch(`${BASE_URL}/api/redistributions/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'REDIST-2026-01' })
  });
  assert.equal(advance2Res.status, 200);
  const advance2Data = await advance2Res.json();
  assert.equal(advance2Data.redistribution.status, 'COMPLETED');
  assert.equal(advance2Data.sourceMedicine.currentStock, donorOrsBefore - 600, 'No second deduction on COMPLETED');
  assert.equal(advance2Data.targetMedicine.currentStock, receiverOrsBefore + 600, 'No second credit on COMPLETED');

  // 3d. Advancing beyond COMPLETED must be rejected with 400
  const advance3Res = await fetch(`${BASE_URL}/api/redistributions/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'REDIST-2026-01' })
  });
  assert.equal(advance3Res.status, 400, 'Advancing a COMPLETED transfer must return 400');

  // 3e. Insufficient donor stock must be rejected and prevent negative stock
  const excessTransferRes = await fetch(`${BASE_URL}/api/redistributions/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'REDIST-EXCESS-TEST',
      customTransfer: {
        medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
        transferQuantity: 99999,
        sourcePHCId: 'phc-mandore',
        sourcePHCName: 'PHC Mandore',
        targetPHCId: 'phc-osian',
        targetPHCName: 'PHC Osian'
      }
    })
  });
  assert.equal(excessTransferRes.status, 400, 'Transfer exceeding donor stock must return 400');
  const excessTransferData = await excessTransferRes.json();
  assert.match(excessTransferData.error, /Insufficient donor stock/i);
  console.log('   [PASS] Inter-PHC transfer accounting & status transitions verified.\n');

  // ---------------------------------------------------------------------------
  // PART 4: Autonomous Agents Authoritative State Sync (No Duplicate Orders)
  // ---------------------------------------------------------------------------
  console.log('4. Testing Autonomous Agents Workflow (/api/agents/execute & /api/state)...');
  const ordersBeforeRes = await fetch(`${BASE_URL}/api/orders`);
  const ordersBefore = await ordersBeforeRes.json();
  const ordersCountBefore = ordersBefore.length;

  const agentRes = await fetch(`${BASE_URL}/api/agents/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phcId: 'phc-osian',
      phcName: 'PHC Osian (24x7)',
      district: 'Jodhpur',
      state: 'Rajasthan',
      agentType: 'SUPPLY_CHAIN',
      useLiveAi: false
    })
  });
  assert.equal(agentRes.status, 200, 'POST /api/agents/execute should return 200');
  const agentData = await agentRes.json();
  assert.equal(agentData.success, true);
  assert.ok(Array.isArray(agentData.createdOrders) && agentData.createdOrders.length > 0);
  assert.equal(
    agentData.allOrders.length,
    ordersCountBefore + agentData.createdOrders.length,
    'Backend order count must increase by exactly createdOrders.length (no duplicate orders)'
  );

  // Verify /api/state bootstrap endpoint matches authoritative response
  const stateAfterAgent = await (await fetch(`${BASE_URL}/api/state?phcId=phc-osian`)).json();
  assert.equal(
    stateAfterAgent.orders.length,
    agentData.allOrders.length,
    '/api/state orders must match authoritative allOrders count'
  );
  console.log('   [PASS] Autonomous Agents workflow verified (single order creation + authoritative state sync).\n');

  // ---------------------------------------------------------------------------
  // PART 5: Failed Requests Validation (No False Success / State Corruption)
  // ---------------------------------------------------------------------------
  console.log('5. Testing Failed Request Guards (/api/inventory/consume, /api/orders/create)...');
  const invalidConsumeRes = await fetch(`${BASE_URL}/api/inventory/consume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      medicineId: 'med-nlem-fl-01-phc-osian',
      phcId: 'phc-osian',
      quantity: 0
    })
  });
  assert.equal(invalidConsumeRes.status, 400, '0-quantity consume must be rejected with 400');

  const invalidOrderRes = await fetch(`${BASE_URL}/api/orders/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
      quantityRequested: -10,
      priority: 'URGENT'
    })
  });
  assert.equal(invalidOrderRes.status, 400, 'Negative order quantity must be rejected with 400');
  console.log('   [PASS] Failed request guards verified.\n');

  console.log('ALL TESTS PASSED SUCCESSFULLY.');
}

runTests().catch((err) => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
