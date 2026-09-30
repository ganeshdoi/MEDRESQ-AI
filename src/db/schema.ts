import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  officerId: text('officer_id'),
  officerName: text('officer_name'),
  designation: text('designation'),
  assignedPhcId: text('assigned_phc_id'),
  assignedPhcName: text('assigned_phc_name'),
  role: text('role').default('medical_officer'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const phcFacilities = pgTable('phc_facilities', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  block: text('block').notNull(),
  district: text('district').notNull(),
  state: text('state').notNull(),
  medicalOfficerInCharge: text('medical_officer_in_charge').notNull(),
  sanctionedBeds: integer('sanctioned_beds').notNull().default(20),
  occupiedBeds: integer('occupied_beds').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const supplyChainAuditLogs = pgTable('supply_chain_audit_logs', {
  id: serial('id').primaryKey(),
  eventId: text('event_id').notNull().unique(),
  phcId: text('phc_id').notNull(),
  userUid: text('user_uid'),
  actor: text('actor').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  medicineName: text('medicine_name').notNull(),
  quantity: integer('quantity').notNull().default(0),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const logisticsOrders = pgTable('logistics_orders', {
  id: text('id').primaryKey(),
  phcId: text('phc_id').notNull(),
  medicineName: text('medicine_name').notNull(),
  quantity: integer('quantity').notNull(),
  priority: text('priority').notNull(),
  status: text('status').notNull(),
  sourceWarehouse: text('source_warehouse').notNull(),
  estimatedDelivery: text('estimated_delivery').notNull(),
  requestedBy: text('requested_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  auditLogs: many(supplyChainAuditLogs),
}));

export const supplyChainAuditLogsRelations = relations(supplyChainAuditLogs, ({ one }) => ({
  user: one(users, {
    fields: [supplyChainAuditLogs.userUid],
    references: [users.uid],
  }),
}));
