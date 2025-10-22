import {
  type User,
  type InsertUser,
  type Record,
  type InsertRecord,
  type Prescription,
  type InsertPrescription,
  type LabReport,
  type InsertLabReport,
  type InsuranceClaim,
  type InsertInsuranceClaim,
  type AccessControl,
  type InsertAccessControl,
  type BlockchainAudit,
  type InsertBlockchainAudit,
} from '@shared/schema';
import { randomUUID } from 'crypto';

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

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private records: Map<string, Record>;
  private prescriptions: Map<string, Prescription>;
  private labReports: Map<string, LabReport>;
  private insuranceClaims: Map<string, InsuranceClaim>;
  private accessControls: Map<string, AccessControl>;
  private auditLogs: Map<string, BlockchainAudit>;

  constructor() {
    this.users = new Map();
    this.records = new Map();
    this.prescriptions = new Map();
    this.labReports = new Map();
    this.insuranceClaims = new Map();
    this.accessControls = new Map();
    this.auditLogs = new Map();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Record operations
  async getRecord(id: string): Promise<Record | undefined> {
    return this.records.get(id);
  }

  async getRecordsByPatient(patientId: string): Promise<Record[]> {
    return Array.from(this.records.values()).filter((r) => r.patientId === patientId);
  }

  async getRecordsByDoctor(doctorId: string): Promise<Record[]> {
    return Array.from(this.records.values()).filter((r) => r.doctorId === doctorId);
  }

  async createRecord(insertRecord: InsertRecord): Promise<Record> {
    const id = randomUUID();
    const now = new Date();
    const record: Record = { ...insertRecord, id, createdAt: now, updatedAt: now };
    this.records.set(id, record);
    return record;
  }

  async updateRecord(id: string, updates: Partial<Record>): Promise<Record> {
    const record = this.records.get(id);
    if (!record) throw new Error('Record not found');
    const updated = { ...record, ...updates, updatedAt: new Date() };
    this.records.set(id, updated);
    return updated;
  }

  // Prescription operations
  async getPrescription(id: string): Promise<Prescription | undefined> {
    return this.prescriptions.get(id);
  }

  async getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
    return Array.from(this.prescriptions.values()).filter((p) => p.patientId === patientId);
  }

  async getPrescriptionsByDoctor(doctorId: string): Promise<Prescription[]> {
    return Array.from(this.prescriptions.values()).filter((p) => p.doctorId === doctorId);
  }

  async createPrescription(insertPrescription: InsertPrescription): Promise<Prescription> {
    const id = randomUUID();
    const now = new Date();
    const prescription: Prescription = { ...insertPrescription, id, createdAt: now, updatedAt: now };
    this.prescriptions.set(id, prescription);
    return prescription;
  }

  async updatePrescription(id: string, updates: Partial<Prescription>): Promise<Prescription> {
    const prescription = this.prescriptions.get(id);
    if (!prescription) throw new Error('Prescription not found');
    const updated = { ...prescription, ...updates, updatedAt: new Date() };
    this.prescriptions.set(id, updated);
    return updated;
  }

  // Lab Report operations
  async getLabReport(id: string): Promise<LabReport | undefined> {
    return this.labReports.get(id);
  }

  async getLabReportsByPatient(patientId: string): Promise<LabReport[]> {
    return Array.from(this.labReports.values()).filter((r) => r.patientId === patientId);
  }

  async getLabReportsByLab(labId: string): Promise<LabReport[]> {
    return Array.from(this.labReports.values()).filter((r) => r.labId === labId);
  }

  async createLabReport(insertReport: InsertLabReport): Promise<LabReport> {
    const id = randomUUID();
    const now = new Date();
    const report: LabReport = { ...insertReport, id, createdAt: now, updatedAt: now };
    this.labReports.set(id, report);
    return report;
  }

  async updateLabReport(id: string, updates: Partial<LabReport>): Promise<LabReport> {
    const report = this.labReports.get(id);
    if (!report) throw new Error('Lab report not found');
    const updated = { ...report, ...updates, updatedAt: new Date() };
    this.labReports.set(id, updated);
    return updated;
  }

  // Insurance Claim operations
  async getInsuranceClaim(id: string): Promise<InsuranceClaim | undefined> {
    return this.insuranceClaims.get(id);
  }

  async getClaimsByPatient(patientId: string): Promise<InsuranceClaim[]> {
    return Array.from(this.insuranceClaims.values()).filter((c) => c.patientId === patientId);
  }

  async getClaimsByInsurance(insuranceId: string): Promise<InsuranceClaim[]> {
    return Array.from(this.insuranceClaims.values()).filter((c) => c.insuranceId === insuranceId);
  }

  async createClaim(insertClaim: InsertInsuranceClaim): Promise<InsuranceClaim> {
    const id = randomUUID();
    const now = new Date();
    const claim: InsuranceClaim = { ...insertClaim, id, createdAt: now };
    this.insuranceClaims.set(id, claim);
    return claim;
  }

  async updateClaim(id: string, updates: Partial<InsuranceClaim>): Promise<InsuranceClaim> {
    const claim = this.insuranceClaims.get(id);
    if (!claim) throw new Error('Insurance claim not found');
    const updated = { ...claim, ...updates };
    this.insuranceClaims.set(id, updated);
    return updated;
  }

  // Access Control operations
  async getAccessControl(id: string): Promise<AccessControl | undefined> {
    return this.accessControls.get(id);
  }

  async getAccessByPatient(patientId: string): Promise<AccessControl[]> {
    return Array.from(this.accessControls.values()).filter((a) => a.patientId === patientId);
  }

  async getAccessByEntity(entityId: string): Promise<AccessControl[]> {
    return Array.from(this.accessControls.values()).filter((a) => a.entityId === entityId);
  }

  async createAccessControl(insertAccess: InsertAccessControl): Promise<AccessControl> {
    const id = randomUUID();
    const access: AccessControl = { ...insertAccess, id, grantedAt: new Date(), revokedAt: null };
    this.accessControls.set(id, access);
    return access;
  }

  async updateAccessControl(id: string, updates: Partial<AccessControl>): Promise<AccessControl> {
    const access = this.accessControls.get(id);
    if (!access) throw new Error('Access control not found');
    const updated = { ...access, ...updates };
    this.accessControls.set(id, updated);
    return updated;
  }

  // Blockchain Audit operations
  async getBlockchainAudit(id: string): Promise<BlockchainAudit | undefined> {
    return this.auditLogs.get(id);
  }

  async getAllAuditLogs(): Promise<BlockchainAudit[]> {
    return Array.from(this.auditLogs.values()).sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  async getAuditLogsByEntity(entityId: string): Promise<BlockchainAudit[]> {
    return Array.from(this.auditLogs.values())
      .filter((log) => log.entityId === entityId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async createAuditLog(insertLog: InsertBlockchainAudit): Promise<BlockchainAudit> {
    const id = randomUUID();
    const log: BlockchainAudit = { ...insertLog, id, timestamp: new Date() };
    this.auditLogs.set(id, log);
    return log;
  }
}

export const storage = new MemStorage();
