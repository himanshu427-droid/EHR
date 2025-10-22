import type { Express } from 'express';
import { createServer, type Server } from 'http';
import { storage } from './storage';
import { blockchainService } from './fabric/blockchain';
import { authenticateToken, generateToken, type AuthRequest } from './middleware/auth';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { loginSchema, registerSchema } from '@shared/schema';

// Configure multer for file uploads
const uploadDir = join(process.cwd(), 'uploads');
mkdir(uploadDir, { recursive: true }).catch(console.error);

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // ========== Authentication Routes ==========
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Create user
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      // Log to blockchain
      const txId = await blockchainService.submitTransaction('userRegistered', {
        userId: user.id,
        role: user.role,
      });

      await storage.createAuditLog({
        txId,
        operation: 'userRegistered',
        entityId: user.id,
        entityType: 'user',
        dataHash: blockchainService.hashData({ userId: user.id, role: user.role }),
        metadata: { role: user.role },
      });

      res.status(201).json({ message: 'User created successfully', userId: user.id });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(400).json({ message: error.message || 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(validatedData.username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = generateToken(user);
      res.json({ token });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(400).json({ message: error.message || 'Login failed' });
    }
  });

  // ========== Records Routes ==========
  app.get('/api/records/my-records', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const records = await storage.getRecordsByPatient(req.user!.userId);
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/records/created-by-me', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const records = await storage.getRecordsByDoctor(req.user!.userId);
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/records/upload', authenticateToken, upload.single('file'), async (req: AuthRequest, res) => {
    try {
      const { title, description, recordType, patientId } = req.body;
      const file = req.file;

      const recordData = {
        title,
        description,
        recordType,
        patientId: patientId || req.user!.userId,
        doctorId: req.user!.role === 'doctor' ? req.user!.userId : null,
        fileHash: file ? blockchainService.hashData({ filename: file.filename, size: file.size }) : null,
        filePath: file ? file.path : null,
        fileName: file ? file.originalname : null,
        status: 'active',
      };

      // Submit to blockchain
      const txId = await blockchainService.addRecord(
        recordData.patientId,
        recordData.fileHash || blockchainService.hashData(recordData),
        recordData.doctorId || undefined
      );

      // Create record in database
      const record = await storage.createRecord({
        ...recordData,
        blockchainTxId: txId,
      });

      // Create audit log
      await storage.createAuditLog({
        txId,
        operation: 'addRecord',
        entityId: record.id,
        entityType: 'record',
        dataHash: recordData.fileHash || blockchainService.hashData(recordData),
        metadata: { recordType, patientId: recordData.patientId },
      });

      res.status(201).json(record);
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // ========== Prescription Routes ==========
  app.get('/api/prescriptions/my-prescriptions', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const prescriptions = await storage.getPrescriptionsByDoctor(req.user!.userId);
      res.json(prescriptions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/prescriptions/create', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { patientId, medications, diagnosis, notes } = req.body;

      const prescriptionData = {
        patientId,
        doctorId: req.user!.userId,
        medications,
        diagnosis,
        notes,
        status: 'active',
      };

      // Submit to blockchain
      const txId = await blockchainService.submitTransaction('addPrescription', prescriptionData);

      const prescription = await storage.createPrescription({
        ...prescriptionData,
        blockchainTxId: txId,
      });

      await storage.createAuditLog({
        txId,
        operation: 'addPrescription',
        entityId: prescription.id,
        entityType: 'prescription',
        dataHash: blockchainService.hashData(prescriptionData),
        metadata: { patientId, doctorId: req.user!.userId },
      });

      res.status(201).json(prescription);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ========== Lab Reports Routes ==========
  app.get('/api/lab/my-reports', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const reports = await storage.getLabReportsByLab(req.user!.userId);
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/lab/upload-report', authenticateToken, upload.single('file'), async (req: AuthRequest, res) => {
    try {
      const { patientId, testType, results } = req.body;
      const file = req.file;

      const reportData = {
        patientId,
        labId: req.user!.userId,
        testType,
        results: results ? JSON.parse(results) : null,
        fileHash: file ? blockchainService.hashData({ filename: file.filename, size: file.size }) : null,
        filePath: file ? file.path : null,
        fileName: file ? file.originalname : null,
        status: file ? 'completed' : 'pending',
      };

      const txId = await blockchainService.submitTransaction('addLabReport', reportData);

      const report = await storage.createLabReport({
        ...reportData,
        blockchainTxId: txId,
      });

      await storage.createAuditLog({
        txId,
        operation: 'addLabReport',
        entityId: report.id,
        entityType: 'lab_report',
        dataHash: reportData.fileHash || blockchainService.hashData(reportData),
        metadata: { patientId, labId: req.user!.userId, testType },
      });

      res.status(201).json(report);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ========== Insurance Claims Routes ==========
  app.get('/api/insurance/claims', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const claims = await storage.getClaimsByInsurance(req.user!.userId);
      res.json(claims);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/insurance/submit-claim', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { patientId, recordIds, claimAmount, diagnosis, treatment } = req.body;

      const claimData = {
        patientId,
        insuranceId: req.user!.userId,
        recordIds,
        claimAmount,
        diagnosis,
        treatment,
        status: 'pending',
        reviewNotes: null,
        reviewedAt: null,
      };

      const txId = await blockchainService.submitTransaction('submitClaim', claimData);

      const claim = await storage.createClaim({
        ...claimData,
        blockchainTxId: txId,
      });

      await storage.createAuditLog({
        txId,
        operation: 'submitClaim',
        entityId: claim.id,
        entityType: 'insurance_claim',
        dataHash: blockchainService.hashData(claimData),
        metadata: { patientId, insuranceId: req.user!.userId, claimAmount },
      });

      res.status(201).json(claim);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/insurance/review-claim', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { claimId, status, reviewNotes } = req.body;

      const claim = await storage.updateClaim(claimId, {
        status,
        reviewNotes,
        reviewedAt: new Date(),
      });

      const txId = await blockchainService.submitTransaction('reviewClaim', {
        claimId,
        status,
        reviewedBy: req.user!.userId,
      });

      await storage.createAuditLog({
        txId,
        operation: 'reviewClaim',
        entityId: claimId,
        entityType: 'insurance_claim',
        dataHash: blockchainService.hashData({ claimId, status }),
        metadata: { status, reviewedBy: req.user!.userId },
      });

      res.json(claim);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ========== Access Control Routes ==========
  app.get('/api/access-control/granted', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const accessControls = await storage.getAccessByPatient(req.user!.userId);
      res.json(accessControls);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/access-control/grant', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { entityId, entityType, permissions, patientId } = req.body;

      const accessData = {
        patientId: patientId || req.user!.userId,
        entityId,
        entityType,
        permissions,
        status: 'active',
      };

      const txId = await blockchainService.grantAccess(
        accessData.patientId,
        entityId,
        permissions
      );

      const access = await storage.createAccessControl({
        ...accessData,
        blockchainTxId: txId,
      });

      await storage.createAuditLog({
        txId,
        operation: 'grantAccess',
        entityId: access.id,
        entityType: 'access_control',
        dataHash: blockchainService.hashData(accessData),
        metadata: { patientId: accessData.patientId, entityId, entityType },
      });

      res.status(201).json(access);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/access-control/revoke', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.body;

      const access = await storage.updateAccessControl(id, {
        status: 'revoked',
        revokedAt: new Date(),
      });

      const txId = await blockchainService.revokeAccess(access.patientId, access.entityId);

      await storage.createAuditLog({
        txId,
        operation: 'revokeAccess',
        entityId: id,
        entityType: 'access_control',
        dataHash: blockchainService.hashData({ id, status: 'revoked' }),
        metadata: { patientId: access.patientId, entityId: access.entityId },
      });

      res.json(access);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ========== Admin Routes ==========
  app.get('/api/admin/users', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user!.role !== 'hospital_admin') {
        return res.status(403).json({ message: 'Access denied' });
      }

      const users = await storage.getAllUsers();
      // Remove passwords
      const sanitizedUsers = users.map(({ password, ...user }) => user);
      res.json(sanitizedUsers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ========== Blockchain Audit Routes ==========
  app.get('/api/blockchain/audit', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const auditLogs = await storage.getAllAuditLogs();
      res.json(auditLogs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ========== Researcher Routes ==========
  app.get('/api/researcher/datasets', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user!.role !== 'researcher') {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Return anonymized data (simplified for MVP)
      const records = await storage.getAllUsers().then(() => []);
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
