import type { MedicineItem, OfflineQueueItem, SupplyChainAuditEntry } from '../types.ts';
import { resolveMedicineMatch } from './medicineMatcher.ts';

export const MEDICINE_BOUND_OFFLINE_ACTIONS = new Set([
  'EMERGENCY_DISPENSE',
  'DISPENSE_CONSUMPTION',
  'OCR_REGISTER_VERIFY',
  'CREATE_REPLENISHMENT_ORDER'
]);

export type OfflineSyncValidationErrorCode =
  | 'EMPTY_INVENTORY_DATASET'
  | 'MISSING_MEDICINE_ID'
  | 'MEDICINE_ID_NOT_IN_INVENTORY'
  | 'INVALID_QUANTITY';

export interface OfflineSyncValidationDiscrepancy {
  queueItemId: string;
  action: string;
  entityName: string;
  medicineId?: string;
  facilityId: string;
  facilityName: string;
  code: OfflineSyncValidationErrorCode;
  errorMessage: string;
  userNotificationMessage: string;
  manualResolutionGuidance: string;
  detectedAt: string;
}

export type OfflineSyncValidationResult =
  | {
      valid: true;
      requiresMedicineValidation: false;
    }
  | {
      valid: true;
      requiresMedicineValidation: true;
      medicine: MedicineItem;
      resolvedMedicineId: string;
      resolvedMedicineName: string;
    }
  | {
      valid: false;
      requiresMedicineValidation: true;
      discrepancy: OfflineSyncValidationDiscrepancy;
    };

export class OfflineSyncValidationError extends Error {
  readonly statusCode = 400;
  readonly isTransient = false;
  readonly isValidationError = true;
  readonly discrepancy: OfflineSyncValidationDiscrepancy;

  constructor(discrepancy: OfflineSyncValidationDiscrepancy) {
    super(discrepancy.errorMessage);
    this.name = 'OfflineSyncValidationError';
    this.discrepancy = discrepancy;
  }
}

export function isMedicineBoundOfflineAction(action?: string): boolean {
  if (!action) return false;
  return MEDICINE_BOUND_OFFLINE_ACTIONS.has(action.trim().toUpperCase());
}

/**
 * Validates an offline queue item against the facility's inventory dataset before attempting synchronization.
 * Specifically checks that the medicine ID exists in the target facility's inventory dataset for actions
 * such as EMERGENCY_DISPENSE, DISPENSE_CONSUMPTION, OCR_REGISTER_VERIFY, and CREATE_REPLENISHMENT_ORDER.
 */
export function validateOfflineQueueItemBeforeSync(
  item: OfflineQueueItem,
  facilityInventory: MedicineItem[],
  fallbackPhcId = 'phc-osian',
  fallbackPhcName = 'PHC Osian'
): OfflineSyncValidationResult {
  if (!isMedicineBoundOfflineAction(item.action)) {
    return {
      valid: true,
      requiresMedicineValidation: false
    };
  }

  const facilityId = item.facilityId || fallbackPhcId;
  const facilityName = item.facilityName || fallbackPhcName;
  const detectedAt = new Date().toISOString();
  const explicitMedId =
    typeof item.payload?.medicineId === 'string' ? item.payload.medicineId.trim() : '';

  if (!Array.isArray(facilityInventory) || facilityInventory.length === 0) {
    const errorMessage = `Validation Error [${item.id} · ${item.action}]: Inventory dataset for ${facilityName} (${facilityId}) is empty or unavailable. Cannot verify medicine ID "${explicitMedId || 'N/A'}" for "${item.entityName}". Please resolve the discrepancy manually.`;
    return {
      valid: false,
      requiresMedicineValidation: true,
      discrepancy: {
        queueItemId: item.id,
        action: item.action,
        entityName: item.entityName,
        medicineId: explicitMedId || undefined,
        facilityId,
        facilityName,
        code: 'EMPTY_INVENTORY_DATASET',
        errorMessage,
        userNotificationMessage: `Sync prevented for #${item.id} (${item.action}): Inventory dataset for ${facilityName} is unavailable. Please resolve the discrepancy manually.`,
        manualResolutionGuidance:
          'Verify that the target PHC inventory is loaded or bind this record to a valid NLEM medicine item before retrying sync.',
        detectedAt
      }
    };
  }

  // 1. Check if medicineId is missing from the offline action payload
  if (!explicitMedId) {
    const errorMessage = `Validation Error [${item.id} · ${item.action}]: Medicine ID is missing in payload for "${item.entityName}" at ${facilityName} (${facilityId}). Sync prevented — please resolve the discrepancy manually by selecting the canonical inventory medicine.`;
    return {
      valid: false,
      requiresMedicineValidation: true,
      discrepancy: {
        queueItemId: item.id,
        action: item.action,
        entityName: item.entityName,
        medicineId: undefined,
        facilityId,
        facilityName,
        code: 'MISSING_MEDICINE_ID',
        errorMessage,
        userNotificationMessage: `Sync prevented for #${item.id} (${item.action}): Missing medicine ID for "${item.entityName}". Please resolve the discrepancy manually in the Offline Queue.`,
        manualResolutionGuidance:
          'Select the matching NLEM medicine from the facility inventory dataset to assign a valid canonical medicineId, or remove the invalid queue entry.',
        detectedAt
      }
    };
  }

  // 2. Check if the medicineId exists in the facility's inventory dataset
  const directMatch = facilityInventory.find((m) => m.id === explicitMedId);
  const resolvedMatch = directMatch
    ? { status: 'MATCHED' as const, medicine: directMatch }
    : resolveMedicineMatch(facilityInventory, item.entityName, explicitMedId);

  // If explicitMedId is neither a direct ID in facilityInventory nor a recognized canonical/legacy ID for this medicine
  const isRecognizedLegacyOrCrossPhcId =
    resolvedMatch.status === 'MATCHED' &&
    (/^(med-nlem-[a-z0-9]+-\d+-)/i.test(explicitMedId) || /^med-[1-6]$/i.test(explicitMedId));

  if (!directMatch && !isRecognizedLegacyOrCrossPhcId) {
    const errorMessage = `Validation Error [${item.id} · ${item.action}]: Medicine ID "${explicitMedId}" (Target: "${item.entityName}") does not exist in the ${facilityName} (${facilityId}) inventory dataset. Sync prevented — please resolve the discrepancy manually.`;
    return {
      valid: false,
      requiresMedicineValidation: true,
      discrepancy: {
        queueItemId: item.id,
        action: item.action,
        entityName: item.entityName,
        medicineId: explicitMedId,
        facilityId,
        facilityName,
        code: 'MEDICINE_ID_NOT_IN_INVENTORY',
        errorMessage,
        userNotificationMessage: `Sync prevented for #${item.id} (${item.action}): Medicine ID "${explicitMedId}" ("${item.entityName}") was not found in ${facilityName} inventory. Please resolve the discrepancy manually.`,
        manualResolutionGuidance: `Medicine ID "${explicitMedId}" is not present in the ${facilityName} inventory ledger. Reassign this action to a valid inventory medicine ID or discard the record manually.`,
        detectedAt
      }
    };
  }

  if (resolvedMatch.status !== 'MATCHED') {
    const errorMessage = `Validation Error [${item.id} · ${item.action}]: Medicine ID "${explicitMedId}" ("${item.entityName}") could not be verified in ${facilityName} inventory (${resolvedMatch.reason}). Sync prevented — please resolve the discrepancy manually.`;
    return {
      valid: false,
      requiresMedicineValidation: true,
      discrepancy: {
        queueItemId: item.id,
        action: item.action,
        entityName: item.entityName,
        medicineId: explicitMedId,
        facilityId,
        facilityName,
        code: 'MEDICINE_ID_NOT_IN_INVENTORY',
        errorMessage,
        userNotificationMessage: `Sync prevented for #${item.id} (${item.action}): Medicine ID "${explicitMedId}" ("${item.entityName}") was not found in ${facilityName} inventory. Please resolve the discrepancy manually.`,
        manualResolutionGuidance:
          'Select the canonical medicine from the PHC inventory ledger to resolve the medicine ID discrepancy manually.',
        detectedAt
      }
    };
  }

  const qty = Number(item.quantity ?? item.payload?.quantity ?? item.payload?.quantityRequested ?? 0);
  if (!Number.isFinite(qty) || qty <= 0) {
    const errorMessage = `Validation Error [${item.id} · ${item.action}]: Invalid quantity (${qty}) for "${resolvedMatch.medicine.name}" (${resolvedMatch.medicine.id}). Sync prevented — please resolve the discrepancy manually.`;
    return {
      valid: false,
      requiresMedicineValidation: true,
      discrepancy: {
        queueItemId: item.id,
        action: item.action,
        entityName: item.entityName,
        medicineId: resolvedMatch.medicine.id,
        facilityId,
        facilityName,
        code: 'INVALID_QUANTITY',
        errorMessage,
        userNotificationMessage: `Sync prevented for #${item.id} (${item.action}): Invalid quantity (${qty}) for "${resolvedMatch.medicine.name}". Please resolve the discrepancy manually.`,
        manualResolutionGuidance: 'Quantity must be a positive number greater than 0.',
        detectedAt
      }
    };
  }

  return {
    valid: true,
    requiresMedicineValidation: true,
    medicine: resolvedMatch.medicine,
    resolvedMedicineId: resolvedMatch.medicine.id,
    resolvedMedicineName: resolvedMatch.medicine.name
  };
}

/**
 * Logs a structured offline sync validation error to the console and constructs an audit trail entry.
 */
export function logOfflineSyncValidationError(
  discrepancy: OfflineSyncValidationDiscrepancy,
  actor = 'Offline Sync Validation Layer'
): SupplyChainAuditEntry {
  console.error('[OfflineSyncValidation] Sync prevented due to inventory discrepancy:', {
    queueItemId: discrepancy.queueItemId,
    action: discrepancy.action,
    entityName: discrepancy.entityName,
    medicineId: discrepancy.medicineId || 'MISSING',
    facilityId: discrepancy.facilityId,
    facilityName: discrepancy.facilityName,
    code: discrepancy.code,
    errorMessage: discrepancy.errorMessage,
    manualResolutionGuidance: discrepancy.manualResolutionGuidance,
    detectedAt: discrepancy.detectedAt
  });

  return {
    transactionId: `AUD-VAL-ERR-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`,
    entityId: discrepancy.queueItemId,
    entityType: 'WAREHOUSE_INDENT',
    medicineName: discrepancy.entityName,
    medicineId: discrepancy.medicineId,
    quantity: 0,
    unit: 'Units',
    source: `${discrepancy.facilityName} Offline Queue`,
    destination: `${discrepancy.facilityName} Inventory Ledger`,
    timestamp: discrepancy.detectedAt,
    previousStatus: 'PENDING_SYNC',
    newStatus: 'VALIDATION_FAILED',
    actor,
    stockImpactSummary: `Sync prevented: Medicine ID "${discrepancy.medicineId || 'MISSING'}" not found in ${discrepancy.facilityName} inventory (No stock change — manual resolution required)`,
    notes: discrepancy.errorMessage
  };
}
