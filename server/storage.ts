import { db } from './db/db';
import {
  users,
  records,
  prescriptions,
  labReports,
  insuranceClaims,
  accessControl,
  blockchainAudit,
} from './db/schema'; // <-- Import all table schemas
import { eq } from 'drizzle-orm';
import type {
  User,
  InsertUser,
  Record,
  InsertRecord,
  Prescription,
  InsertPrescription,
  LabReport,
  InsertLabReport,
  InsuranceClaim,
  InsertInsuranceClaim,
  AccessControl,
  InsertAccessControl,
  BlockchainAudit,
  InsertBlockchainAudit,
} from '@shared/schema';

// This interface is great, no changes needed
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Record operations
  getRecord(id: string): Promise<Record | undefined>;
  getRecordsByPatient(patientId: string): Promise<Record[]>;
  getRecordsByDoctor(doctorId: string): Promise<Record[]>;
  createRecord(record: InsertRecord): Promise<Record>;
  updateRecord(id: string, record: Partial<Record>): Promise<Record>;

  // Prescription operations
  getPrescription(id: string): Promise<Prescription | undefined>;
  getPrescriptionsByPatient(patientId: string): Promise<Prescription[]>;
  getPrescriptionsByDoctor(doctorId: string): Promise<Prescription[]>;
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  updatePrescription(id: string, prescription: Partial<Prescription>): Promise<Prescription>;

  // Lab Report operations
  getLabReport(id: string): Promise<LabReport | undefined>;
  getLabReportsByPatient(patientId: string): Promise<LabReport[]>;
  getLabReportsByLab(labId: string): Promise<LabReport[]>;
  createLabReport(report: InsertLabReport): Promise<LabReport>;
  updateLabReport(id: string, report: Partial<LabReport>): Promise<LabReport>;

  // Insurance Claim operations
  getInsuranceClaim(id: string): Promise<InsuranceClaim | undefined>;
  getClaimsByPatient(patientId: string): Promise<InsuranceClaim[]>;
  getClaimsByInsurance(insuranceId: string): Promise<InsuranceClaim[]>;
  createClaim(claim: InsertInsuranceClaim): Promise<InsuranceClaim>;
  updateClaim(id: string, claim: Partial<InsuranceClaim>): Promise<InsuranceClaim>;

  // Access Control operations
  getAccessControl(id: string): Promise<AccessControl | undefined>;
  getAccessByPatient(patientId: string): Promise<AccessControl[]>;
  getAccessByEntity(entityId: string): Promise<AccessControl[]>;
  createAccessControl(access: InsertAccessControl): Promise<AccessControl>;
  updateAccessControl(id: string, access: Partial<AccessControl>): Promise<AccessControl>;

  // Blockchain Audit operations
  getBlockchainAudit(id: string): Promise<BlockchainAudit | undefined>;
  getAllAuditLogs(): Promise<BlockchainAudit[]>;
  getAuditLogsByEntity(entityId: string): Promise<BlockchainAudit[]>;
  createAuditLog(log: InsertBlockchainAudit): Promise<BlockchainAudit>;
}

// Corrected PostgresStorage implementation
export class PostgresStorage implements IStorage {
  // User operations (These were already correct)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  // Record operations
  async getRecord(id: string): Promise<Record | undefined> {
    const [record] = await db.select().from(records).where(eq(records.id, id));
    return record;
  }

  async getRecordsByPatient(patientId: string): Promise<Record[]> {
    return db.select().from(records).where(eq(records.patientId, patientId));
  }

  async getRecordsByDoctor(doctorId: string): Promise<Record[]> {
    return db.select().from(records).where(eq(records.doctorId, doctorId));
  }

  async createRecord(insertRecord: InsertRecord): Promise<Record> {
    const [record] = await db.insert(records).values(insertRecord).returning();
    return record;
  }

  async updateRecord(id: string, updates: Partial<Record>): Promise<Record> {
    const [record] = await db.update(records).set(updates).where(eq(records.id, id)).returning();
    return record;
  }

  // Prescription operations
  async getPrescription(id: string): Promise<Prescription | undefined> {
    const [prescription] = await db.select().from(prescriptions).where(eq(prescriptions.id, id));
    return prescription;
  }

  async getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
    return db.select().from(prescriptions).where(eq(prescriptions.patientId, patientId));
  }

  async getPrescriptionsByDoctor(doctorId: string): Promise<Prescription[]> {
    return db.select().from(prescriptions).where(eq(prescriptions.doctorId, doctorId));
  }

  async createPrescription(insertPrescription: InsertPrescription): Promise<Prescription> {
    const [prescription] = await db.insert(prescriptions).values(insertPrescription).returning();
    return prescription;
  }

  async updatePrescription(id: string, updates: Partial<Prescription>): Promise<Prescription> {
    const [prescription] = await db.update(prescriptions).set(updates).where(eq(prescriptions.id, id)).returning();
    return prescription;
  }

  // Lab Report operations
  async getLabReport(id: string): Promise<LabReport | undefined> {
    const [report] = await db.select().from(labReports).where(eq(labReports.id, id));
    return report;
  }

  async getLabReportsByPatient(patientId: string): Promise<LabReport[]> {
    return db.select().from(labReports).where(eq(labReports.patientId, patientId));
  }

  async getLabReportsByLab(labId: string): Promise<LabReport[]> {
    return db.select().from(labReports).where(eq(labReports.labId, labId));
  }

  async createLabReport(insertReport: InsertLabReport): Promise<LabReport> {
    const [report] = await db.insert(labReports).values(insertReport).returning();
    return report;
  }

  async updateLabReport(id: string, updates: Partial<LabReport>): Promise<LabReport> {
    const [report] = await db.update(labReports).set(updates).where(eq(labReports.id, id)).returning();
    return report;
  }

  // Insurance Claim operations
  async getInsuranceClaim(id: string): Promise<InsuranceClaim | undefined> {
    const [claim] = await db.select().from(insuranceClaims).where(eq(insuranceClaims.id, id));
    return claim;
  }

  async getClaimsByPatient(patientId: string): Promise<InsuranceClaim[]> {
    return db.select().from(insuranceClaims).where(eq(insuranceClaims.patientId, patientId));
  }

  async getClaimsByInsurance(insuranceId: string): Promise<InsuranceClaim[]> {
    return db.select().from(insuranceClaims).where(eq(insuranceClaims.insuranceId, insuranceId));
  }

  async createClaim(insertClaim: InsertInsuranceClaim): Promise<InsuranceClaim> {
    const [claim] = await db.insert(insuranceClaims).values(insertClaim).returning();
    return claim;
  }

  async updateClaim(id: string, updates: Partial<InsuranceClaim>): Promise<InsuranceClaim> {
    const [claim] = await db.update(insuranceClaims).set(updates).where(eq(insuranceClaims.id, id)).returning();
    return claim;
  }

  // Access Control operations
  async getAccessControl(id: string): Promise<AccessControl | undefined> {
    const [access] = await db.select().from(accessControl).where(eq(accessControl.id, id));
    return access;
  }

  async getAccessByPatient(patientId: string): Promise<AccessControl[]> {
    return db.select().from(accessControl).where(eq(accessControl.patientId, patientId));
  }

  async getAccessByEntity(entityId: string): Promise<AccessControl[]> {
    return db.select().from(accessControl).where(eq(accessControl.entityId, entityId));
  }

  async createAccessControl(insertAccess: InsertAccessControl): Promise<AccessControl> {
    const [access] = await db.insert(accessControl).values(insertAccess).returning();
    return access;
  }

  async updateAccessControl(id: string, updates: Partial<AccessControl>): Promise<AccessControl> {
    const [access] = await db.update(accessControl).set(updates).where(eq(accessControl.id, id)).returning();
    return access;
  }

  // Blockchain Audit operations
  async getBlockchainAudit(id: string): Promise<BlockchainAudit | undefined> {
    const [log] = await db.select().from(blockchainAudit).where(eq(blockchainAudit.id, id));
    return log;
  }

  async getAllAuditLogs(): Promise<BlockchainAudit[]> {
    return db.select().from(blockchainAudit); // You can add ordering here if needed
  }

  async getAuditLogsByEntity(entityId: string): Promise<BlockchainAudit[]> {
    return db.select().from(blockchainAudit).where(eq(blockchainAudit.entityId, entityId));
  }

  async createAuditLog(insertLog: InsertBlockchainAudit): Promise<BlockchainAudit> {
    const [log] = await db.insert(blockchainAudit).values(insertLog).returning();
    return log;
  }
}

export const storage = new PostgresStorage();