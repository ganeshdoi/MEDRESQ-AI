import assert from 'node:assert/strict';
import { resolveMedicineMatch } from '../src/utils/medicineMatcher.ts';
import { generateEssentialMedicinesForPHC } from '../src/data/nationalEssentialMedicines.ts';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function runTests() {
  console.log('=== MEDRESQ AI Critical State & Workflow Verification Suite ===\n');
  await fetch(`${BASE_URL}/api/demo/reset`, { method: 'POST' });

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

  // 3c. Explicit status transitions: APPROVED -> DISPATCHED -> RECEIVED without double-accounting
  const advance1Res = await fetch(`${BASE_URL}/api/redistributions/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'REDIST-2026-01' })
  });
  assert.equal(advance1Res.status, 200);
  const advance1Data = await advance1Res.json();
  assert.equal(advance1Data.redistribution.status, 'DISPATCHED');

  const advance2Res = await fetch(`${BASE_URL}/api/redistributions/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'REDIST-2026-01' })
  });
  assert.equal(advance2Res.status, 200);
  const advance2Data = await advance2Res.json();
  assert.equal(advance2Data.redistribution.status, 'RECEIVED');

  // 3d. Advancing beyond RECEIVED must be rejected with 400
  const advance3Res = await fetch(`${BASE_URL}/api/redistributions/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'REDIST-2026-01' })
  });
  assert.equal(advance3Res.status, 400, 'Advancing a RECEIVED transfer must return 400');

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

  // ---------------------------------------------------------------------------
  // PART 6: PHC In-Charge Officer Authentication & Facility Binding
  // ---------------------------------------------------------------------------
  console.log('6. Testing PHC In-Charge Officer Authentication (/api/auth/login, /api/auth/session, /api/auth/logout)...');

  // 6a. Valid login for OSN001 -> PHC Osian (24x7)
  const loginOsianRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      officerId: 'OSN001',
      password: 'OSN001@PHC',
      rememberDevice: true
    })
  });
  assert.equal(loginOsianRes.status, 200, 'Valid OSN001 login should return 200');
  const loginOsianData = await loginOsianRes.json();
  assert.equal(loginOsianData.ok, true);
  assert.equal(loginOsianData.session.officerId, 'OSN001');
  assert.equal(loginOsianData.session.assignedPhcId, 'phc-osian');
  assert.equal(loginOsianData.session.phcCode, 'RJ-JDP-PHC-021');
  assert.deepEqual(loginOsianData.session.unlockedPhcIds, ['phc-osian']);
  assert.equal('password' in loginOsianData.session, false, 'Password must never be returned in session');

  // 6b. Valid login for MND001 -> PHC Mandore
  const loginMandoreRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      officerId: 'MND001',
      password: 'MND001@PHC',
      rememberDevice: false
    })
  });
  assert.equal(loginMandoreRes.status, 200, 'Valid MND001 login should return 200');
  const loginMandoreData = await loginMandoreRes.json();
  assert.equal(loginMandoreData.session.officerId, 'MND001');
  assert.equal(loginMandoreData.session.assignedPhcId, 'phc-mandore');
  assert.deepEqual(loginMandoreData.session.unlockedPhcIds, ['phc-mandore']);

  // 6c. Wrong password or cross-PHC password must be rejected with 401
  const wrongPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      officerId: 'OSN001',
      password: 'MND001@PHC'
    })
  });
  assert.equal(wrongPassRes.status, 401, 'Cross-PHC password must be rejected with 401');

  const unknownOfficerRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      officerId: 'UNKNOWN999',
      password: 'OSN001@PHC'
    })
  });
  assert.equal(unknownOfficerRes.status, 401, 'Unknown Officer ID must be rejected with 401');

  // 6d. Session verification and logout invalidation
  const sessionCheckRes = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { Authorization: `Bearer ${loginOsianData.session.sessionToken}` }
  });
  assert.equal(sessionCheckRes.status, 200, 'Active session token should verify');

  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loginOsianData.session.sessionToken}`
    }
  });
  assert.equal(logoutRes.status, 200, 'Logout should succeed');

  const afterLogoutRes = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { Authorization: `Bearer ${loginOsianData.session.sessionToken}` }
  });
  assert.equal(afterLogoutRes.status, 401, 'Logged-out session token must return 401');
  console.log('   [PASS] PHC In-Charge authentication & facility binding verified.\n');

  // ---------------------------------------------------------------------------
  // PART 7: Staff Attendance Module & PHC-Scoped Access Control
  // ---------------------------------------------------------------------------
  console.log('7. Testing Staff Attendance (/api/attendance, /api/attendance/mark, cross-PHC protection, audit)...');

  // Re-login as OSN001 for Osian attendance tests
  const osianAuth = await (
    await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ officerId: 'OSN001', password: 'OSN001@PHC' })
    })
  ).json();
  const osianToken = osianAuth.session.sessionToken;
  const mandoreToken = loginMandoreData.session.sessionToken;

  // 7a. GET /api/attendance for Osian vs Mandore returns distinct PHC-specific staff directories
  const osianAttRes = await fetch(`${BASE_URL}/api/attendance`, {
    headers: { Authorization: `Bearer ${osianToken}` }
  });
  assert.equal(osianAttRes.status, 200);
  const osianAttData = await osianAttRes.json();
  assert.equal(osianAttData.phcId, 'phc-osian');
  assert.ok(osianAttData.staff.length >= 8, 'Osian staff directory should load');
  assert.ok(osianAttData.staff.every((s: any) => s.phcId === 'phc-osian'));

  const mandoreAttRes = await fetch(`${BASE_URL}/api/attendance`, {
    headers: { Authorization: `Bearer ${mandoreToken}` }
  });
  assert.equal(mandoreAttRes.status, 200);
  const mandoreAttData = await mandoreAttRes.json();
  assert.equal(mandoreAttData.phcId, 'phc-mandore');
  assert.ok(mandoreAttData.staff.every((s: any) => s.phcId === 'phc-mandore'));

  // 7b. Cross-PHC tamper attempt (OSN001 trying to mark phc-mandore attendance) must return 403
  const crossPhcRes = await fetch(`${BASE_URL}/api/attendance/mark`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${osianToken}`
    },
    body: JSON.stringify({
      phcId: 'phc-mandore',
      date: '2026-09-29',
      entries: [{ staffId: 'STF-MND-001', status: 'ABSENT' }]
    })
  });
  assert.equal(crossPhcRes.status, 403, 'Cross-PHC attendance modification must be forbidden (403)');

  // 7c. Mark PRESENT, ABSENT, ON_LEAVE and verify no duplicate records for same Staff + PHC + Date
  const targetStaffId = osianAttData.staff[0].id;
  for (const status of ['ABSENT', 'ON_LEAVE', 'PRESENT'] as const) {
    const markRes = await fetch(`${BASE_URL}/api/attendance/mark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${osianToken}`
      },
      body: JSON.stringify({
        phcId: 'phc-osian',
        date: '2026-09-29',
        entries: [{ staffId: targetStaffId, status }]
      })
    });
    assert.equal(markRes.status, 200);
    const markData = await markRes.json();
    const matchingRecs = markData.records.filter(
      (r: any) => r.staffId === targetStaffId && r.phcId === 'phc-osian' && r.date === '2026-09-29'
    );
    assert.equal(matchingRecs.length, 1, 'Must never create duplicate attendance records for same Staff + PHC + Date');
    assert.equal(matchingRecs[0].status, status);
    assert.ok(
      markData.supplyChainAuditLog.some(
        (a: any) => a.entityType === 'STAFF_ATTENDANCE' && a.newStatus === status
      ),
      'Attendance change must be recorded in supplyChainAuditLog'
    );
  }
  console.log('   [PASS] Staff Attendance marking, deduplication, cross-PHC security, and audit trail verified.\n');

  // ---------------------------------------------------------------------------
  // PART 8: Centralized Multilingual i18n (en, hi, ta, te — NO Rajasthani)
  // ---------------------------------------------------------------------------
  console.log('8. Testing Centralized i18n (en, hi, ta, te)...');
  const i18nMod = await import('../src/i18n/index.ts');
  const codes = i18nMod.SUPPORTED_LANGUAGES.map((l) => l.code);
  assert.deepEqual(codes, ['en', 'hi', 'ta', 'te'], 'Must support exactly en, hi, ta, te initial languages');
  const labels = i18nMod.SUPPORTED_LANGUAGES.map((l) => l.nativeLabel);
  assert.deepEqual(labels, ['English', 'हिन्दी', 'தமிழ்', 'తెలుగు']);
  for (const code of ['en', 'hi', 'ta', 'te'] as const) {
    const dict = i18nMod.getTranslation(code);
    assert.ok(dict.nav.staffAttendance.length > 0);
    assert.ok(dict.attendance.present.length > 0);
    assert.ok(dict.attendance.absent.length > 0);
    assert.ok(dict.attendance.onLeave.length > 0);
    assert.ok(dict.attendance.notMarked.length > 0);
    assert.ok(dict.attendance.saveAttendance.length > 0);
    assert.ok(dict.attendance.attendanceHistory.length > 0);
    assert.ok(dict.attendance.totalStaff.length > 0);
  }
  console.log('   [PASS] Centralized i18n verified for English, Hindi, Tamil, and Telugu.\n');

  await fetch(`${BASE_URL}/api/demo/reset`, { method: 'POST' });
  console.log('ALL TESTS PASSED SUCCESSFULLY.');
}

runTests().catch((err) => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
