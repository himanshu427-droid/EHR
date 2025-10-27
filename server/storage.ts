import { db } from './db/db';
import {
  users,
  records,
  labReports,
  insuranceClaims,
  accessControl, // Ensure accessControl is imported
  blockchainAudit,
  UserRole,
} from './db/schema';
import { eq, and, or, ilike } from 'drizzle-orm'; // <-- Import 'and' operator
import type {
  User,
  InsertUser,
  Record,
  InsertRecord,
  LabReport,
  InsertLabReport,
  InsuranceClaim,
  InsertInsuranceClaim,
  AccessControl,
  InsertAccessControl,
  BlockchainAudit,
  InsertBlockchainAudit,
} from '@shared/schema';

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  findPatientsByNameOrUsername(term: string): Promise<User[]>;

  // Record operations
  getRecord(id: string): Promise<Record | undefined>;
  getRecordsByPatient(patientId: string): Promise<Record[]>;
  getRecordsByDoctor(doctorId: string): Promise<Record[]>;
  createRecord(record: InsertRecord): Promise<Record>;
  updateRecord(id: string, record: Partial<Record>): Promise<Record>;

  // Prescription operations

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
  // ADDED: Method signature for specific lookup
  getAccessByPatientAndEntity(
    patientId: string,
    entityId: string,
  ): Promise<AccessControl | undefined>;
  createAccessControl(access: InsertAccessControl): Promise<AccessControl>;
  updateAccessControl(
    id: string,
    access: Partial<AccessControl>,
  ): Promise<AccessControl>;

  // Blockchain Audit operations
  getBlockchainAudit(id: string): Promise<BlockchainAudit | undefined>;
  getAllAuditLogs(): Promise<BlockchainAudit[]>;
  getAuditLogsByEntity(entityId: string): Promise<BlockchainAudit[]>;
  createAuditLog(log: InsertBlockchainAudit): Promise<BlockchainAudit>;
}

// Corrected PostgresStorage implementation
export class PostgresStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
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

  async findPatientsByNameOrUsername(term: string): Promise<User[]> {
        if (!term || term.length < 2) { // Basic validation
            return [];
        }
        const searchTerm = `%${term}%`; // Add wildcards for partial matching
        const foundUsers = await db.select()
            .from(users)
            .where(
                and(
                    eq(users.role, UserRole.PATIENT), // Only find users who are patients
                    or( // Match username OR fullName (case-insensitive)
                        ilike(users.username, searchTerm),
                        ilike(users.fullName, searchTerm)
                    )
                )
            )
            .limit(10); // Limit results for performance/UI
        return foundUsers;
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
    const [record] = await db
      .update(records)
      .set(updates)
      .where(eq(records.id, id))
      .returning();
    if (!record) throw new Error(`Record with id ${id} not found`);
    return record;
  }


  // Lab Report operations
  async getLabReport(id: string): Promise<LabReport | undefined> {
    const [report] = await db
      .select()
      .from(labReports)
      .where(eq(labReports.id, id));
    return report;
  }

  async getLabReportsByPatient(patientId: string): Promise<LabReport[]> {
    return db
      .select()
      .from(labReports)
      .where(eq(labReports.patientId, patientId));
  }

  async getLabReportsByLab(labId: string): Promise<LabReport[]> {
    return db.select().from(labReports).where(eq(labReports.labId, labId));
  }

  async createLabReport(insertReport: InsertLabReport): Promise<LabReport> {
    const [report] = await db
      .insert(labReports)
      .values(insertReport)
      .returning();
    return report;
  }

  async updateLabReport(
    id: string,
    updates: Partial<LabReport>,
  ): Promise<LabReport> {
    const [report] = await db
      .update(labReports)
      .set(updates)
      .where(eq(labReports.id, id))
      .returning();
    if (!report) throw new Error(`Lab report with id ${id} not found`);
    return report;
  }

  // Insurance Claim operations
  async getInsuranceClaim(id: string): Promise<InsuranceClaim | undefined> {
    const [claim] = await db
      .select()
      .from(insuranceClaims)
      .where(eq(insuranceClaims.id, id));
    return claim;
  }

  async getClaimsByPatient(patientId: string): Promise<InsuranceClaim[]> {
    return db
      .select()
      .from(insuranceClaims)
      .where(eq(insuranceClaims.patientId, patientId));
  }

  async getClaimsByInsurance(insuranceId: string): Promise<InsuranceClaim[]> {
    return db
      .select()
      .from(insuranceClaims)
      .where(eq(insuranceClaims.insuranceId, insuranceId));
  }

  async createClaim(
    insertClaim: InsertInsuranceClaim,
  ): Promise<InsuranceClaim> {
    const [claim] = await db
      .insert(insuranceClaims)
      .values(insertClaim)
      .returning();
    return claim;
  }

  async updateClaim(
    id: string,
    updates: Partial<InsuranceClaim>,
  ): Promise<InsuranceClaim> {
    const [claim] = await db
      .update(insuranceClaims)
      .set(updates)
      .where(eq(insuranceClaims.id, id))
      .returning();
    if (!claim) throw new Error(`Insurance claim with id ${id} not found`);
    return claim;
  }

  // Access Control operations
  async getAccessControl(id: string): Promise<AccessControl | undefined> {
    const [access] = await db
      .select()
      .from(accessControl)
      .where(eq(accessControl.id, id));
    return access;
  }

  async getAccessByPatient(patientId: string): Promise<AccessControl[]> {
    return db
      .select()
      .from(accessControl)
      .where(eq(accessControl.patientId, patientId));
  }

  async getAccessByEntity(entityId: string): Promise<AccessControl[]> {
    console.log('Storage: Querying accessControl table for entityId:', entityId);
    return db
      .select()
      .from(accessControl)
      .where(eq(accessControl.entityId, entityId));
  }

  
  async getAccessByPatientAndEntity(
    patientId: string,
    entityId: string,
  ): Promise<AccessControl | undefined> {
    const [access] = await db
      .select()
      .from(accessControl)
      .where(
        and(
          eq(accessControl.patientId, patientId),
          eq(accessControl.entityId, entityId),
        ),
      );
    return access; // Returns the first match or undefined if none
  }

  async createAccessControl(
    insertAccess: InsertAccessControl,
  ): Promise<AccessControl> {
    const [access] = await db
      .insert(accessControl)
      .values(insertAccess)
      .returning();
    return access;
  }

  async updateAccessControl(
    id: string,
    updates: Partial<AccessControl>,
  ): Promise<AccessControl> {
    const [access] = await db
      .update(accessControl)
      .set(updates)
      .where(eq(accessControl.id, id))
      .returning();
    // Added error handling
    if (!access)
      throw new Error(`Access control record with id ${id} not found`);
    return access;
  }

  // Blockchain Audit operations
  async getBlockchainAudit(id: string): Promise<BlockchainAudit | undefined> {
    const [log] = await db
      .select()
      .from(blockchainAudit)
      .where(eq(blockchainAudit.id, id));
    return log;
  }

  async getAllAuditLogs(): Promise<BlockchainAudit[]> {
    // Optionally add .orderBy(desc(blockchainAudit.timestamp))
    return db.select().from(blockchainAudit);
  }

  async getAuditLogsByEntity(entityId: string): Promise<BlockchainAudit[]> {
    return db
      .select()
      .from(blockchainAudit)
      .where(eq(blockchainAudit.entityId, entityId));
    // Optionally add .orderBy(desc(blockchainAudit.timestamp))
  }

  async createAuditLog(
    insertLog: InsertBlockchainAudit,
  ): Promise<BlockchainAudit> {
    const [log] = await db
      .insert(blockchainAudit)
      .values(insertLog)
      .returning();
    return log;
  }
}

export const storage = new PostgresStorage();
