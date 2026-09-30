import { db } from './index.ts';
import { users, supplyChainAuditLogs, logisticsOrders } from './schema.ts';
import { eq, desc } from 'drizzle-orm';

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
) {
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

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error('Database query failed in getUsers:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
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
}) {
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
  } catch (error) {
    console.error('Database query failed in recordAuditLogToCloudSql:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getAuditLogsByPhcFromCloudSql(phcId: string) {
  try {
    return await db
      .select()
      .from(supplyChainAuditLogs)
      .where(eq(supplyChainAuditLogs.phcId, phcId))
      .orderBy(desc(supplyChainAuditLogs.createdAt))
      .limit(100);
  } catch (error) {
    console.error('Database query failed in getAuditLogsByPhcFromCloudSql:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
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
}) {
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
    return result[0];
  } catch (error) {
    console.error('Database query failed in upsertLogisticsOrderToCloudSql:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
