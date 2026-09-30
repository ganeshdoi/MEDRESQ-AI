import { db, isCloudSqlConfigured } from './index.ts';
import { users, supplyChainAuditLogs, logisticsOrders } from './schema.ts';
import { eq, desc } from 'drizzle-orm';

export interface SyncedUserRecord {
  id: number;
  uid: string;
  email: string;
  officerId: string | null;
  officerName: string | null;
  designation: string | null;
  assignedPhcId: string | null;
  assignedPhcName: string | null;
  role: string | null;
  createdAt: Date | null;
}

export interface SyncedAuditLogRecord {
  id: number;
  eventId: string;
  phcId: string;
  userUid: string | null;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  medicineName: string;
  quantity: number;
  fromStatus: string | null;
  toStatus: string;
  notes: string | null;
  createdAt: Date | null;
}

export interface SyncedOrderRecord {
  id: string;
  phcId: string;
  medicineName: string;
  quantity: number;
  priority: string;
  status: string;
  sourceWarehouse: string;
  estimatedDelivery: string;
  requestedBy: string;
  createdAt: Date | null;
}

const memoryUsersStore = new Map<string, SyncedUserRecord>();
const memoryAuditStore: SyncedAuditLogRecord[] = [];
const memoryOrdersStore = new Map<string, SyncedOrderRecord>();

export async function getOrCreateUser(
  uid: string,
  email: string,
  metadata?: {
    officerId?: string;
    officerName?: string;
    designation?: string;
    assignedPhcId?: string;
    assignedPhcName?: string;
    role?: string;
  }
): Promise<SyncedUserRecord> {
  if (db && isCloudSqlConfigured()) {
    try {
      const result = await db
        .insert(users)
        .values({
          uid,
          email,
          officerId: metadata?.officerId ?? null,
          officerName: metadata?.officerName ?? null,
          designation: metadata?.designation ?? null,
          assignedPhcId: metadata?.assignedPhcId ?? null,
          assignedPhcName: metadata?.assignedPhcName ?? null,
          role: metadata?.role ?? 'medical_officer',
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: {
            email,
            ...(metadata?.officerId ? { officerId: metadata.officerId } : {}),
            ...(metadata?.officerName ? { officerName: metadata.officerName } : {}),
            ...(metadata?.designation ? { designation: metadata.designation } : {}),
            ...(metadata?.assignedPhcId ? { assignedPhcId: metadata.assignedPhcId } : {}),
            ...(metadata?.assignedPhcName ? { assignedPhcName: metadata.assignedPhcName } : {}),
            ...(metadata?.role ? { role: metadata.role } : {}),
          },
        })
        .returning();

      if (result[0]) return result[0];
    } catch {
      // Fallback to Firebase-compatible in-memory store
    }
  }

  const existing = memoryUsersStore.get(uid);
  const record: SyncedUserRecord = {
    id: existing?.id ?? memoryUsersStore.size + 1,
    uid,
    email,
    officerId: metadata?.officerId ?? existing?.officerId ?? null,
    officerName: metadata?.officerName ?? existing?.officerName ?? null,
    designation: metadata?.designation ?? existing?.designation ?? null,
    assignedPhcId: metadata?.assignedPhcId ?? existing?.assignedPhcId ?? null,
    assignedPhcName: metadata?.assignedPhcName ?? existing?.assignedPhcName ?? null,
    role: metadata?.role ?? existing?.role ?? 'medical_officer',
    createdAt: existing?.createdAt ?? new Date()
  };
  memoryUsersStore.set(uid, record);
  return record;
}

export async function getUsers(): Promise<SyncedUserRecord[]> {
  if (db && isCloudSqlConfigured()) {
    try {
      return await db.select().from(users);
    } catch {
      // Fallback to in-memory store
    }
  }
  return Array.from(memoryUsersStore.values());
}

export async function recordAuditLogToCloudSql(entry: {
  eventId: string;
  phcId: string;
  userUid?: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  medicineName: string;
  quantity: number;
  fromStatus?: string;
  toStatus: string;
  notes?: string;
}): Promise<SyncedAuditLogRecord | null> {
  if (db && isCloudSqlConfigured()) {
    try {
      const result = await db
        .insert(supplyChainAuditLogs)
        .values({
          eventId: entry.eventId,
          phcId: entry.phcId,
          userUid: entry.userUid ?? null,
          actor: entry.actor,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          medicineName: entry.medicineName,
          quantity: entry.quantity,
          fromStatus: entry.fromStatus ?? null,
          toStatus: entry.toStatus,
          notes: entry.notes ?? null,
        })
        .onConflictDoNothing({ target: supplyChainAuditLogs.eventId })
        .returning();
      return result[0] ?? null;
    } catch {
      // Fallback to in-memory store
    }
  }

  const existing = memoryAuditStore.find((a) => a.eventId === entry.eventId);
  if (existing) return existing;

  const record: SyncedAuditLogRecord = {
    id: memoryAuditStore.length + 1,
    eventId: entry.eventId,
    phcId: entry.phcId,
    userUid: entry.userUid ?? null,
    actor: entry.actor,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    medicineName: entry.medicineName,
    quantity: entry.quantity,
    fromStatus: entry.fromStatus ?? null,
    toStatus: entry.toStatus,
    notes: entry.notes ?? null,
    createdAt: new Date()
  };
  memoryAuditStore.unshift(record);
  return record;
}

export async function getAuditLogsByPhcFromCloudSql(phcId: string): Promise<SyncedAuditLogRecord[]> {
  if (db && isCloudSqlConfigured()) {
    try {
      return await db
        .select()
        .from(supplyChainAuditLogs)
        .where(eq(supplyChainAuditLogs.phcId, phcId))
        .orderBy(desc(supplyChainAuditLogs.createdAt))
        .limit(100);
    } catch {
      // Fallback to in-memory store
    }
  }
  return memoryAuditStore.filter((a) => a.phcId === phcId).slice(0, 100);
}

export async function upsertLogisticsOrderToCloudSql(order: {
  id: string;
  phcId: string;
  medicineName: string;
  quantity: number;
  priority: string;
  status: string;
  sourceWarehouse: string;
  estimatedDelivery: string;
  requestedBy: string;
}): Promise<SyncedOrderRecord> {
  if (db && isCloudSqlConfigured()) {
    try {
      const result = await db
        .insert(logisticsOrders)
        .values({
          id: order.id,
          phcId: order.phcId,
          medicineName: order.medicineName,
          quantity: order.quantity,
          priority: order.priority,
          status: order.status,
          sourceWarehouse: order.sourceWarehouse,
          estimatedDelivery: order.estimatedDelivery,
          requestedBy: order.requestedBy,
        })
        .onConflictDoUpdate({
          target: logisticsOrders.id,
          set: {
            status: order.status,
            quantity: order.quantity,
            priority: order.priority,
            estimatedDelivery: order.estimatedDelivery,
          },
        })
        .returning();
      if (result[0]) return result[0];
    } catch {
      // Fallback to in-memory store
    }
  }

  const existing = memoryOrdersStore.get(order.id);
  const record: SyncedOrderRecord = {
    id: order.id,
    phcId: order.phcId,
    medicineName: order.medicineName,
    quantity: order.quantity,
    priority: order.priority,
    status: order.status,
    sourceWarehouse: order.sourceWarehouse,
    estimatedDelivery: order.estimatedDelivery,
    requestedBy: order.requestedBy,
    createdAt: existing?.createdAt ?? new Date()
  };
  memoryOrdersStore.set(order.id, record);
  return record;
}
