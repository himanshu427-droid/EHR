import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles enum
export const UserRole = {
  PATIENT: "patient",
  DOCTOR: "doctor",
  LAB: "lab",
  HOSPITAL_ADMIN: "hospital_admin",
  INSURANCE: "insurance",
  RESEARCHER: "researcher",
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // patient, doctor, lab, hospital_admin, insurance, researcher
  fullName: text("full_name").notNull(),
  specialty: text("specialty"), // for doctors
  organization: text("organization"), // for labs, hospitals, insurance, researchers
  licenseNumber: text("license_number"), // for doctors, labs
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Health Records table
export const records = pgTable("records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull(),
  doctorId: varchar("doctor_id"),
  recordType: text("record_type").notNull(), // diagnosis, prescription, lab_report, vaccination, etc
  title: text("title").notNull(),
  description: text("description"),
  fileHash: text("file_hash"), // hash of uploaded file
  filePath: text("file_path"), // local path to file
  fileName: text("file_name"),
  blockchainTxId: text("blockchain_tx_id"), // Fabric transaction ID
  status: text("status").notNull().default("active"), // active, archived
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Prescriptions table
export const prescriptions = pgTable("prescriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull(),
  doctorId: varchar("doctor_id").notNull(),
  medications: jsonb("medications").notNull(), // array of {name, dosage, frequency, duration}
  diagnosis: text("diagnosis").notNull(),
  notes: text("notes"),
  blockchainTxId: text("blockchain_tx_id"),
  status: text("status").notNull().default("active"), // active, fulfilled, cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Lab Reports table
export const labReports = pgTable("lab_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull(),
  labId: varchar("lab_id").notNull(),
  testType: text("test_type").notNull(),
  results: jsonb("results"), // structured test results
  fileHash: text("file_hash"),
  filePath: text("file_path"),
  fileName: text("file_name"),
  blockchainTxId: text("blockchain_tx_id"),
  status: text("status").notNull().default("pending"), // pending, completed, verified
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insurance Claims table
export const insuranceClaims = pgTable("insurance_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull(),
  insuranceId: varchar("insurance_id").notNull(),
  recordIds: jsonb("record_ids").notNull(), // array of related record IDs
  claimAmount: text("claim_amount").notNull(),
  diagnosis: text("diagnosis").notNull(),
  treatment: text("treatment").notNull(),
  blockchainTxId: text("blockchain_tx_id"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  reviewNotes: text("review_notes"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Consent/Access Control table
export const accessControl = pgTable("access_control", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull(),
  entityId: varchar("entity_id").notNull(), // doctor, insurance, researcher ID
  entityType: text("entity_type").notNull(), // doctor, insurance, researcher
  permissions: jsonb("permissions").notNull(), // array of permissions: view_records, view_prescriptions, etc
  blockchainTxId: text("blockchain_tx_id"),
  status: text("status").notNull().default("active"), // active, revoked
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
});

// Blockchain Audit Log table
export const blockchainAudit = pgTable("blockchain_audit", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  txId: text("tx_id").notNull().unique(),
  operation: text("operation").notNull(), // addRecord, grantAccess, revokeAccess, etc
  entityId: varchar("entity_id").notNull(), // user or record ID
  entityType: text("entity_type").notNull(), // user, record, prescription, etc
  dataHash: text("data_hash").notNull(),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertRecordSchema = createInsertSchema(records).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLabReportSchema = createInsertSchema(labReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInsuranceClaimSchema = createInsertSchema(insuranceClaims).omit({
  id: true,
  createdAt: true,
});

export const insertAccessControlSchema = createInsertSchema(accessControl).omit({
  id: true,
  grantedAt: true,
});

export const insertBlockchainAuditSchema = createInsertSchema(blockchainAudit).omit({
  id: true,
  timestamp: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertRecord = z.infer<typeof insertRecordSchema>;
export type Record = typeof records.$inferSelect;

export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type Prescription = typeof prescriptions.$inferSelect;

export type InsertLabReport = z.infer<typeof insertLabReportSchema>;
export type LabReport = typeof labReports.$inferSelect;

export type InsertInsuranceClaim = z.infer<typeof insertInsuranceClaimSchema>;
export type InsuranceClaim = typeof insuranceClaims.$inferSelect;

export type InsertAccessControl = z.infer<typeof insertAccessControlSchema>;
export type AccessControl = typeof accessControl.$inferSelect;

export type InsertBlockchainAudit = z.infer<typeof insertBlockchainAuditSchema>;
export type BlockchainAudit = typeof blockchainAudit.$inferSelect;

// Additional validation schemas for API endpoints
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
