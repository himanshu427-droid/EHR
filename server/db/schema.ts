// root/server/db/schema.ts
import { sql } from "drizzle-orm";
import { foreignKey } from "drizzle-orm/mysql-core";
import { pgTable, text, varchar, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";

// User roles enum (can live here or in shared, but here is fine)
export const UserRole = {
  PATIENT: "patient",
  DOCTOR: "doctor",
  LAB: "lab",
  HOSPITAL_ADMIN: "hospital_admin",
  INSURANCE: "insurance",
  RESEARCHER: "researcher",
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// === ALL YOUR TABLE DEFINITIONS ===

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), 
  fullName: text("full_name").notNull(),
  specialty: text("specialty"),
  organization: text("organization"),
  licenseNumber: text("license_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Health Records table
export const records = pgTable("records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull(),
  doctorId: varchar("doctor_id"),
  recordType: text("record_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  fileHash: text("file_hash"),
  filePath: text("file_path"),
  fileName: text("file_name"),
  blockchainTxId: text("blockchain_tx_id"),
  status: text("status").notNull().default("active"),
  medications: jsonb("medications"), // array of {name, dosage, frequency, duration} - Nullable
  diagnosis: text("diagnosis"),   // Nullable
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),

});

// // Prescriptions table
// export const prescriptions = pgTable("prescriptions", {
//   id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
//   patientId: varchar("patient_id").notNull(),
//   doctorId: varchar("doctor_id").notNull(),
//   medications: jsonb("medications").notNull(),
//   diagnosis: text("diagnosis").notNull(),
//   notes: text("notes"),
//   blockchainTxId: text("blockchain_tx_id"),
//   status: text("status").notNull().default("active"),
//   createdAt: timestamp("created_at").defaultNow().notNull(),
//   updatedAt: timestamp("updated_at").defaultNow().notNull(),
// });

// Lab Reports table
export const labReports = pgTable("lab_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull(),
  labId: varchar("lab_id").notNull(),
  testType: text("test_type").notNull(),
  results: jsonb("results"),
  fileHash: text("file_hash"),
  filePath: text("file_path"),
  fileName: text("file_name"),
  blockchainTxId: text("blockchain_tx_id"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insurance Claims table
export const insuranceClaims = pgTable("insurance_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull(),
  insuranceId: varchar("insurance_id").notNull(),
  recordIds: jsonb("record_ids").notNull(),
  claimAmount: text("claim_amount").notNull(),
  diagnosis: text("diagnosis").notNull(),
  treatment: text("treatment").notNull(),
  blockchainTxId: text("blockchain_tx_id"),
  status: text("status").notNull().default("pending"),
  reviewNotes: text("review_notes"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Consent/Access Control table
export const accessControl = pgTable("access_control", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull(),
  entityId: varchar("entity_id").notNull(),
  entityType: text("entity_type").notNull(),
  permissions: jsonb("permissions").notNull(),
  blockchainTxId: text("blockchain_tx_id"),
  status: text("status").notNull().default("active"),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
});

// Blockchain Audit Log table
export const blockchainAudit = pgTable("blockchain_audit", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  txId: text("tx_id").notNull().unique(),
  operation: text("operation").notNull(),
  entityId: varchar("entity_id").notNull(),
  entityType: text("entity_type").notNull(),
  dataHash: text("data_hash").notNull(),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});