import type {
  LogisticsOrder,
  MedicineItem,
  OrderStatus,
  RedistributionOpportunity,
  RedistributionStatus,
  StatusTransitionRecord,
  SupplyChainAuditEntry
} from '../types.ts';
import { resolveMedicineMatch } from './medicineMatcher.ts';
import { evaluateMedicineThresholdAndReplenishment } from './inventoryForecast.ts';

/**
 * Returns the current application date in YYYY-MM-DD format.
 */
export function getCurrentAppDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Adds a number of days to a YYYY-MM-DD date string and returns YYYY-MM-DD.
 */
export function addDaysToDateString(baseDateStr: string, daysToAdd: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(baseDateStr.trim());
  const baseMs = match
    ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : Date.now();
  const targetMs = baseMs + Math.round(daysToAdd) * 86_400_000;
  return new Date(targetMs).toISOString().split('T')[0];
}

/**
 * Computes the estimated delivery date (YYYY-MM-DD) for a new order based on priority and current app date.
 */
export function computeEstimatedDeliveryDate(
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY_REPLENISHMENT',
  baseDate: string = getCurrentAppDate()
): string {
  const daysOffset =
    priority === 'EMERGENCY_REPLENISHMENT' ? 1 : priority === 'URGENT' ? 2 : 4;
  return addDaysToDateString(baseDate, daysOffset);
}

/**
 * Computes human-friendly delivery window label using the current application date.
 */
export function formatEstimatedDeliveryWindow(
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY_REPLENISHMENT',
  baseDate: string = getCurrentAppDate()
): { etaDate: string; label: string } {
  const etaDate = computeEstimatedDeliveryDate(priority, baseDate);
  const label =
    priority === 'EMERGENCY_REPLENISHMENT'
      ? `Within 24 Hours (Simulated Emergency Dispatch — Est. ${etaDate})`
      : priority === 'URGENT'
      ? `Within 48 Hours (Simulated Urgent Dispatch — Est. ${etaDate})`
      : `3–4 Days Standard Transit (Simulated Routine — Est. ${etaDate})`;
  return { etaDate, label };
}

/**
 * Determines whether an order is in a closed or cancelled terminal state.
 * Closed/cancelled orders MUST NOT block new valid orders for the same medicine.
 */
export function isOrderClosedOrCancelled(status?: string): boolean {
  if (!status) return false;
  const norm = status.trim().toUpperCase();
  return norm === 'DELIVERED' || norm === 'RECEIVED' || norm === 'CANCELLED';
}

/**
 * Determines whether an order is currently active in the warehouse pipeline.
 */
export function isOrderActive(status?: string): boolean {
  if (!status) return false;
  return !isOrderClosedOrCancelled(status);
}

/**
 * Evaluates whether an order's estimated delivery date (ETA) is in the past while still pending or in transit.
 * Never mutates historical timestamps.
 */
export function evaluateOrderEtaStatus(
  order: Pick<LogisticsOrder, 'status' | 'estimatedDelivery' | 'requestDate' | 'isHistoricalDemo'>,
  currentAppDate: string = getCurrentAppDate()
): {
  isOverdue: boolean;
  daysOverdue: number;
  isHistoricalRecord: boolean;
  badgeText: string | null;
} {
  const isHistoricalRecord =
    order.isHistoricalDemo === true ||
    Boolean(order.requestDate && order.requestDate < '2026-09-25');

  if (!isOrderActive(order.status)) {
    return {
      isOverdue: false,
      daysOverdue: 0,
      isHistoricalRecord,
      badgeText: null
    };
  }

  const etaMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec((order.estimatedDelivery || '').trim());
  const curMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(currentAppDate.trim());
  if (!etaMatch || !curMatch) {
    return {
      isOverdue: false,
      daysOverdue: 0,
      isHistoricalRecord,
      badgeText: null
    };
  }

  const etaMs = Date.UTC(Number(etaMatch[1]), Number(etaMatch[2]) - 1, Number(etaMatch[3]));
  const curMs = Date.UTC(Number(curMatch[1]), Number(curMatch[2]) - 1, Number(curMatch[3]));

  if (etaMs < curMs) {
    const daysOverdue = Math.max(1, Math.round((curMs - etaMs) / 86_400_000));
    return {
      isOverdue: true,
      daysOverdue,
      isHistoricalRecord,
      badgeText: `PAST ETA (${daysOverdue}d overdue · Est. ${order.estimatedDelivery})`
    };
  }

  return {
    isOverdue: false,
    daysOverdue: 0,
    isHistoricalRecord,
    badgeText: null
  };
}

/**
 * Finds an existing active order for the same medicine, destination PHC, and overlapping requirement.
 * Closed ('DELIVERED', 'RECEIVED') or 'CANCELLED' orders are ignored so valid new orders are never blocked.
 */
export function findActiveDuplicateOrder(
  orders: LogisticsOrder[],
  medicineName: string,
  targetPhcId: string,
  targetPhcName: string,
  facilityMedicines?: MedicineItem[],
  medicineId?: string
): LogisticsOrder | undefined {
  const cleanQuery = (medicineName || '').trim();
  if (!cleanQuery && !medicineId) return undefined;

  let canonicalId = medicineId;
  let canonicalName = cleanQuery.toLowerCase();

  if (Array.isArray(facilityMedicines) && facilityMedicines.length > 0) {
    const match = resolveMedicineMatch(facilityMedicines, cleanQuery, medicineId);
    if (match.status === 'MATCHED') {
      canonicalId = match.medicine.id;
      canonicalName = match.medicine.name.toLowerCase();
    }
  }

  const targetPhcLower = (targetPhcName || '').trim().toLowerCase();

  return orders.find((o) => {
    if (!isOrderActive(o.status)) return false;

    const sameDestination =
      (targetPhcId && o.phcId === targetPhcId) ||
      (targetPhcLower &&
        ((o.phcName || '').toLowerCase().includes(targetPhcLower) ||
          (o.destination || '').toLowerCase().includes(targetPhcLower)));

    if (!sameDestination) return false;

    if (canonicalId && o.medicineId && o.medicineId === canonicalId) {
      return true;
    }

    if (Array.isArray(facilityMedicines) && facilityMedicines.length > 0) {
      const ordMatch = resolveMedicineMatch(facilityMedicines, o.medicineName, o.medicineId);
      if (ordMatch.status === 'MATCHED' && canonicalId && ordMatch.medicine.id === canonicalId) {
        return true;
      }
    }

    const ordMedLower = (o.medicineName || '').trim().toLowerCase();
    if (!ordMedLower || !canonicalName) return false;

    return (
      ordMedLower === canonicalName ||
      ordMedLower.includes(canonicalName) ||
      canonicalName.includes(ordMedLower)
    );
  });
}

/**
 * Canonical Warehouse Indent Lifecycle:
 * DRAFT -> SUBMITTED -> APPROVED -> DISPATCHED -> IN TRANSIT -> DELIVERED
 * Legacy statuses ('REQUESTED', 'APPROVAL PENDING', 'PROCESSING') are normalized cleanly into this pipeline.
 */
export const WAREHOUSE_INDENT_STEPS: OrderStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'DISPATCHED',
  'IN TRANSIT',
  'DELIVERED'
];

export function normalizeOrderStage(status: OrderStatus): OrderStatus {
  if (status === 'REQUESTED' || status === 'APPROVAL PENDING') return 'SUBMITTED';
  if (status === 'PROCESSING') return 'APPROVED';
  if (status === 'RECEIVED') return 'DELIVERED';
  return status;
}

export function getNextWarehouseOrderStatus(currentStatus: OrderStatus): OrderStatus | null {
  switch (currentStatus) {
    case 'DRAFT':
      return 'SUBMITTED';
    case 'SUBMITTED':
    case 'REQUESTED':
    case 'APPROVAL PENDING':
      return 'APPROVED';
    case 'APPROVED':
    case 'PROCESSING':
      return 'DISPATCHED';
    case 'DISPATCHED':
      return 'IN TRANSIT';
    case 'IN TRANSIT':
      return 'DELIVERED';
    case 'DELIVERED':
    case 'RECEIVED':
    case 'CANCELLED':
    default:
      return null;
  }
}

export function validateWarehouseOrderTransition(
  currentStatus: OrderStatus,
  requestedTargetStatus?: OrderStatus
): { ok: boolean; nextStatus?: OrderStatus; error?: string } {
  if (currentStatus === 'DELIVERED' || currentStatus === 'RECEIVED') {
    return {
      ok: false,
      error: `Order is already ${currentStatus} and closed. Completed orders cannot be advanced or modified.`
    };
  }
  if (currentStatus === 'CANCELLED') {
    return {
      ok: false,
      error: 'Order has been CANCELLED and cannot be advanced.'
    };
  }

  if (requestedTargetStatus === 'CANCELLED') {
    if (currentStatus === 'DISPATCHED' || currentStatus === 'IN TRANSIT') {
      return {
        ok: false,
        error: `Cannot cancel an order that is already ${currentStatus}.`
      };
    }
    return { ok: true, nextStatus: 'CANCELLED' };
  }

  const expectedNext = getNextWarehouseOrderStatus(currentStatus);
  if (!expectedNext) {
    return {
      ok: false,
      error: `No valid transition from status "${currentStatus}".`
    };
  }

  if (requestedTargetStatus && requestedTargetStatus !== expectedNext) {
    // Allow legacy RECEIVED alias ONLY when currently DELIVERED and not yet credited (handled separately),
    // otherwise strictly forbid skipping required lifecycle steps.
    return {
      ok: false,
      error: `Invalid status transition from "${currentStatus}" to "${requestedTargetStatus}". Warehouse indents must follow Draft → Submitted → Approved → Dispatched → In Transit → Delivered without skipping required approval or dispatch steps (expected next: "${expectedNext}").`
    };
  }

  return { ok: true, nextStatus: expectedNext };
}

/**
 * Inter-PHC Transfer Donor Stock & Minimum Buffer Validator.
 * Never allows a transfer to reduce donor usable stock (after existing reservations) below its configured minimum buffer.
 */
export interface DonorTransferValidationResult {
  ok: boolean;
  error?: string;
  usableStock: number;
  reservedStock: number;
  availableUsableStock: number;
  minBuffer: number;
  maxSafeTransferable: number;
  remainingUsableAfterTransfer: number;
}

export function validateDonorStockForTransfer(
  donorMed: MedicineItem,
  requestedQty: number,
  donorPhcName: string,
  ignoreExistingReservationQty: number = 0
): DonorTransferValidationResult {
  const evalRes = evaluateMedicineThresholdAndReplenishment(donorMed);
  const usableStock = evalRes.usableStock;
  const rawReserved = Math.max(0, Math.floor(Number(donorMed.reservedStock) || 0));
  const reservedStock = Math.max(0, rawReserved - Math.max(0, Math.floor(ignoreExistingReservationQty)));
  const availableUsableStock = Math.max(0, usableStock - reservedStock);
  const minBuffer = Math.max(0, Math.round(Number(donorMed.minThreshold ?? donorMed.minStockLevel) || 0));
  const maxSafeTransferable = Math.max(0, availableUsableStock - minBuffer);
  const qty = Math.floor(Number(requestedQty) || 0);
  const remainingUsableAfterTransfer = availableUsableStock - qty;

  if (!Number.isFinite(qty) || qty <= 0) {
    return {
      ok: false,
      error: 'Invalid transfer quantity: requested quantity must be greater than 0.',
      usableStock,
      reservedStock,
      availableUsableStock,
      minBuffer,
      maxSafeTransferable,
      remainingUsableAfterTransfer
    };
  }

  if (qty > availableUsableStock) {
    return {
      ok: false,
      error: `Insufficient donor stock at ${donorPhcName}: requested ${qty} ${donorMed.unit}, but only ${availableUsableStock} ${donorMed.unit} usable stock is available${
        reservedStock > 0 ? ` (${reservedStock} ${donorMed.unit} already reserved for active transfers)` : ''
      }.`,
      usableStock,
      reservedStock,
      availableUsableStock,
      minBuffer,
      maxSafeTransferable,
      remainingUsableAfterTransfer
    };
  }

  if (remainingUsableAfterTransfer < minBuffer) {
    return {
      ok: false,
      error: `Insufficient donor stock above minimum buffer at ${donorPhcName}: transferring ${qty} ${donorMed.unit} of ${donorMed.name} would leave ${remainingUsableAfterTransfer} ${donorMed.unit}, breaching the configured minimum buffer of ${minBuffer} ${donorMed.unit} (Usable: ${availableUsableStock} ${donorMed.unit}, Max Safe Transfer: ${maxSafeTransferable} ${donorMed.unit}).`,
      usableStock,
      reservedStock,
      availableUsableStock,
      minBuffer,
      maxSafeTransferable,
      remainingUsableAfterTransfer
    };
  }

  return {
    ok: true,
    usableStock,
    reservedStock,
    availableUsableStock,
    minBuffer,
    maxSafeTransferable,
    remainingUsableAfterTransfer
  };
}

/**
 * Inter-PHC Transfer Lifecycle Validator:
 * Supports Pending Review (PENDING_REVIEW / PROPOSED) -> Approved (APPROVED) -> Dispatched (DISPATCHED / IN_TRANSIT) -> Received (RECEIVED / COMPLETED),
 * plus Rejected (REJECTED) and Cancelled (CANCELLED) states.
 */
export function normalizeTransferStatusLabel(status: RedistributionStatus): string {
  switch (status) {
    case 'PENDING_REVIEW':
    case 'PROPOSED':
      return 'Pending Review';
    case 'APPROVED':
      return 'Approved (Reserved)';
    case 'DISPATCHED':
    case 'IN_TRANSIT':
      return 'Dispatched';
    case 'RECEIVED':
    case 'COMPLETED':
      return 'Received';
    case 'REJECTED':
      return 'Rejected';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

export function validateTransferTransition(
  currentStatus: RedistributionStatus,
  targetStatus?: RedistributionStatus
): { ok: boolean; nextStatus?: RedistributionStatus; error?: string } {
  const isPending = currentStatus === 'PENDING_REVIEW' || currentStatus === 'PROPOSED';
  const isApproved = currentStatus === 'APPROVED';
  const isDispatched = currentStatus === 'DISPATCHED' || currentStatus === 'IN_TRANSIT';
  const isReceived = currentStatus === 'RECEIVED' || currentStatus === 'COMPLETED';
  const isTerminalOther = currentStatus === 'REJECTED' || currentStatus === 'CANCELLED';

  if (isReceived) {
    return {
      ok: false,
      error: `Transfer is already ${currentStatus} (Received) and committed to inventory. No further transitions are allowed.`
    };
  }

  if (isTerminalOther) {
    return {
      ok: false,
      error: `Transfer is already ${currentStatus} and cannot proceed.`
    };
  }

  if (!targetStatus) {
    if (isPending) return { ok: true, nextStatus: 'APPROVED' };
    if (isApproved) return { ok: true, nextStatus: 'DISPATCHED' };
    if (isDispatched) return { ok: true, nextStatus: 'RECEIVED' };
    return { ok: false, error: `Cannot advance transfer from status "${currentStatus}".` };
  }

  // Explicit target status validation
  if (targetStatus === 'APPROVED') {
    if (!isPending) {
      return {
        ok: false,
        error: `Cannot approve transfer in status "${currentStatus}". Only Pending Review transfers can be approved.`
      };
    }
    return { ok: true, nextStatus: 'APPROVED' };
  }

  if (targetStatus === 'DISPATCHED' || targetStatus === 'IN_TRANSIT') {
    if (!isApproved) {
      return {
        ok: false,
        error: `Invalid transfer transition from "${currentStatus}" to "${targetStatus}". Transfer must be Approved (stock reserved) before it can be Dispatched.`
      };
    }
    return { ok: true, nextStatus: 'DISPATCHED' };
  }

  if (targetStatus === 'RECEIVED' || targetStatus === 'COMPLETED') {
    if (!isDispatched) {
      return {
        ok: false,
        error: `Invalid transfer transition from "${currentStatus}" to "${targetStatus}". Transfer must be Dispatched (donor stock deducted) before it can be marked Received.`
      };
    }
    return { ok: true, nextStatus: 'RECEIVED' };
  }

  if (targetStatus === 'REJECTED') {
    if (!isPending) {
      return {
        ok: false,
        error: `Cannot reject transfer in status "${currentStatus}". Only Pending Review transfers can be rejected.`
      };
    }
    return { ok: true, nextStatus: 'REJECTED' };
  }

  if (targetStatus === 'CANCELLED') {
    if (!isPending && !isApproved) {
      return {
        ok: false,
        error: `Cannot cancel transfer in status "${currentStatus}". Dispatched or Received transfers cannot be cancelled.`
      };
    }
    return { ok: true, nextStatus: 'CANCELLED' };
  }

  return {
    ok: false,
    error: `Unsupported transfer transition from "${currentStatus}" to "${targetStatus}".`
  };
}

/**
 * Helper to create a standardized SupplyChainAuditEntry and StatusTransitionRecord.
 */
export function buildAuditAndHistoryEntry(params: {
  entityId: string;
  entityType: SupplyChainAuditEntry['entityType'];
  medicineName: string;
  medicineId?: string;
  quantity: number;
  unit?: string;
  source: string;
  destination: string;
  previousStatus: string;
  newStatus: string;
  stockImpactSummary?: string;
  actor?: string;
  notes?: string;
  timestamp?: string;
}): {
  auditEntry: SupplyChainAuditEntry;
  historyEntry: StatusTransitionRecord;
} {
  const ts = params.timestamp || new Date().toISOString();
  const txId = `TXN-${params.entityType === 'WAREHOUSE_INDENT' ? 'ORD' : 'TRF'}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  const auditEntry: SupplyChainAuditEntry = {
    transactionId: txId,
    entityId: params.entityId,
    entityType: params.entityType,
    medicineName: params.medicineName,
    medicineId: params.medicineId,
    quantity: params.quantity,
    unit: params.unit || 'Units',
    source: params.source,
    destination: params.destination,
    timestamp: ts,
    previousStatus: params.previousStatus,
    newStatus: params.newStatus,
    stockImpactSummary: params.stockImpactSummary,
    isHistoricalDemo: false,
    notes: params.notes
  };

  const historyEntry: StatusTransitionRecord = {
    transactionId: txId,
    previousStatus: params.previousStatus,
    newStatus: params.newStatus,
    timestamp: ts,
    actor: params.actor || 'PHC Medical Officer (Demo Session)',
    note: params.stockImpactSummary || params.notes
  };

  return { auditEntry, historyEntry };
}
