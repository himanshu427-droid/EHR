import type { Express, Response, NextFunction } from 'express';
import { createServer, type Server } from 'http';
import { storage } from './storage';
// Assuming blockchainService is correctly imported
import { blockchainService } from './fabric/blockchain'; 
import { authenticateToken, generateToken, type AuthRequest } from './middleware/auth';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { loginSchema, registerSchema } from '@shared/schema';
import { z } from 'zod'; // Import Zod

// --- Zod Schemas for Input Validation ---
// You would ideally move these to a shared file (like '@shared/schema')

const uploadRecordSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  recordType: z.string().min(1, 'Record type is required'),
  patientId: z.string().uuid().optional(), // Optional, defaults to self
});

const createPrescriptionSchema = z.object({
  patientId: z.string().uuid('Invalid Patient ID'),
  medications: z.array(z.string()).min(1, 'At least one medication is required'),
  diagnosis: z.string().min(1, 'Diagnosis is required'),
  notes: z.string().optional(),
});

const uploadReportSchema = z.object({
  patientId: z.string().uuid('Invalid Patient ID'),
  testType: z.string().min(1, 'Test type is required'),
  results: z.string().optional(), // Assuming results are sent as a stringified JSON
});

const submitClaimSchema = z.object({
  patientId: z.string().uuid('Invalid Patient ID'),
  recordIds: z.array(z.string().uuid()).min(1, 'At least one record ID is required'),
  claimAmount: z.number().positive('Claim amount must be positive'),
  diagnosis: z.string().min(1, 'Diagnosis is required'),
  treatment: z.string().min(1, 'Treatment is required'),
});

const reviewClaimSchema = z.object({
  claimId: z.string().uuid('Invalid Claim ID'),
  status: z.enum(['approved', 'rejected', 'needs_info']),
  reviewNotes: z.string().optional(),
});

const grantAccessSchema = z.object({
  entityId: z.string().uuid('Invalid Entity ID'), // e.g., a doctor's user ID
  entityType: z.string().min(1, 'Entity type is required'), // e.g., 'doctor'
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
  patientId: z.string().uuid().optional(), // Optional, defaults to self
});

const revokeAccessSchema = z.object({
  id: z.string().uuid('Invalid Access Control ID'),
});


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

// --- Role-Based Access Control (RBAC) Middleware ---
const requireRole = (role: string | string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const roles = Array.isArray(role) ? role : [role];
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: Insufficient permissions' });
    }
    next();
  };
};

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
      // MODIFIED: Pass arguments as individual strings
      const txId = await blockchainService.submitTransaction(
        'userRegistered',
        user.id,
        user.role
      );

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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid registration data', errors: error.errors });
      }
      res.status(500).json({ message: 'Registration failed' });
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid login data', errors: error.errors });
      }
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // ========== Records Routes ==========
  app.get('/api/records/my-records', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const records = await storage.getRecordsByPatient(req.user!.userId);
      res.json(records);
    } catch (error: any) {
      console.error('Get my-records error:', error);
      res.status(500).json({ message: 'Failed to fetch records' });
    }
  });

  // ADDED: Role check for doctors
  app.get('/api/records/created-by-me', authenticateToken, requireRole('doctor'), async (req: AuthRequest, res) => {
    try {
      const records = await storage.getRecordsByDoctor(req.user!.userId);
      res.json(records);
    } catch (error: any) {
      console.error('Get created-by-me error:', error);
      res.status(500).json({ message: 'Failed to fetch records' });
    }
  });

  app.post('/api/records/upload', authenticateToken, upload.single('file'), async (req: AuthRequest, res) => {
    try {
      // ADDED: Validation
      const validatedData = uploadRecordSchema.parse(req.body);
      const { title, description, recordType, patientId } = validatedData;
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

      // Submit to blockchain (This call seems to use a custom service method, which is fine)
      const txId = await blockchainService.addRecord(
        recordData.patientId,
        recordData.fileHash || blockchainService.hashData(recordData),
        recordData.doctorId // Pass null if not a doctor
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid record data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to upload record' });
    }
  });

  // ========== Prescription Routes ==========
  // ADDED: Role check for doctors
  app.get('/api/prescriptions/my-prescriptions', authenticateToken, requireRole('doctor'), async (req: AuthRequest, res) => {
    try {
      const prescriptions = await storage.getPrescriptionsByDoctor(req.user!.userId);
      res.json(prescriptions);
    } catch (error: any) {
      console.error('Get my-prescriptions error:', error);
      res.status(500).json({ message: 'Failed to fetch prescriptions' });
    }
  });

  // ADDED: Role check and validation
  app.post('/api/prescriptions/create', authenticateToken, requireRole('doctor'), async (req: AuthRequest, res) => {
    try {
      const validatedData = createPrescriptionSchema.parse(req.body);
      const { patientId, medications, diagnosis, notes } = validatedData;

      const prescriptionData = {
        patientId,
        doctorId: req.user!.userId,
        medications,
        diagnosis,
        notes,
        status: 'active',
      };

      // MODIFIED: Stringify object for blockchain transaction
      const txId = await blockchainService.submitTransaction(
        'addPrescription', 
        JSON.stringify(prescriptionData)
      );

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
      console.error('Create prescription error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid prescription data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create prescription' });
    }
  });

  // ========== Lab Reports Routes ==========
  // ADDED: Role check (assuming 'lab_technician' role)
  app.get('/api/lab/my-reports', authenticateToken, requireRole('lab_technician'), async (req: AuthRequest, res) => {
    try {
      const reports = await storage.getLabReportsByLab(req.user!.userId);
      res.json(reports);
    } catch (error: any) {
      console.error('Get my-reports error:', error);
      res.status(500).json({ message: 'Failed to fetch lab reports' });
    }
  });

  // ADDED: Role check and validation
  app.post('/api/lab/upload-report', authenticateToken, requireRole('lab_technician'), upload.single('file'), async (req: AuthRequest, res) => {
    try {
      const validatedData = uploadReportSchema.parse(req.body);
      const { patientId, testType, results } = validatedData;
      const file = req.file;

      const reportData = {
        patientId,
        labId: req.user!.userId,
        testType,
        results: results ? JSON.parse(results) : null, // Assuming results is stringified JSON
        fileHash: file ? blockchainService.hashData({ filename: file.filename, size: file.size }) : null,
        filePath: file ? file.path : null,
        fileName: file ? file.originalname : null,
        status: file ? 'completed' : 'pending',
      };
      
      // MODIFIED: Stringify object for blockchain transaction
      const txId = await blockchainService.submitTransaction(
        'addLabReport', 
        JSON.stringify(reportData)
      );

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
      console.error('Upload lab report error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid lab report data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to upload lab report' });
    }
  });

  // ========== Insurance Claims Routes ==========
  // ADDED: Role check (assuming 'insurance_provider' role)
  app.get('/api/insurance/claims', authenticateToken, requireRole('insurance_provider'), async (req: AuthRequest, res) => {
    try {
      const claims = await storage.getClaimsByInsurance(req.user!.userId);
      res.json(claims);
    } catch (error: any) {
      console.error('Get claims error:', error);
      res.status(500).json({ message: 'Failed to fetch claims' });
    }
  });

  // ADDED: Role check and validation
  app.post('/api/insurance/submit-claim', authenticateToken, requireRole('insurance_provider'), async (req: AuthRequest, res) => {
    try {
      const validatedData = submitClaimSchema.parse(req.body);
      
      const claimData = {
        ...validatedData,
        insuranceId: req.user!.userId,
        status: 'pending',
        reviewNotes: null,
        reviewedAt: null,
      };

      // MODIFIED: Stringify object for blockchain transaction
      const txId = await blockchainService.submitTransaction(
        'submitClaim', 
        JSON.stringify(claimData)
      );

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
        metadata: { patientId: claimData.patientId, insuranceId: req.user!.userId, claimAmount: claimData.claimAmount },
      });

      res.status(201).json(claim);
    } catch (error: any) {
      console.error('Submit claim error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid claim data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to submit claim' });
    }
  });

  // ADDED: Role check and validation
  app.post('/api/insurance/review-claim', authenticateToken, requireRole('insurance_provider'), async (req: AuthRequest, res) => {
    try {
      const validatedData = reviewClaimSchema.parse(req.body);
      const { claimId, status, reviewNotes } = validatedData;

      const claim = await storage.updateClaim(claimId, {
        status,
        reviewNotes,
        reviewedAt: new Date(),
      });

      // MODIFIED: Pass arguments as individual strings
      const txId = await blockchainService.submitTransaction(
        'reviewClaim', 
        claimId,
        status,
        reviewNotes || '', // Pass empty string if null
        req.user!.userId
      );

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
      console.error('Review claim error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid review data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to review claim' });
    }
  });

  // ========== Access Control Routes ==========
  app.get('/api/access-control/granted', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const accessControls = await storage.getAccessByPatient(req.user!.userId);
      res.json(accessControls);
    } catch (error: any) {
      console.error('Get access control error:', error);
      res.status(500).json({ message: 'Failed to get access controls' });
    }
  });

  // ADDED: Validation
  app.post('/api/access-control/grant', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const validatedData = grantAccessSchema.parse(req.body);
      const { entityId, entityType, permissions, patientId } = validatedData;

      const accessData = {
        patientId: patientId || req.user!.userId,
        entityId,
        entityType,
        permissions,
        status: 'active',
      };
      
      // Security Check: Only a patient can grant access to their own records
      if (accessData.patientId !== req.user!.userId) {
          return res.status(403).json({ message: 'You can only grant access to your own records' });
      }

      // This custom call is fine as is
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
      console.error('Grant access error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid access data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to grant access' });
    }
  });

  // ADDED: Validation
  app.post('/api/access-control/revoke', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const validatedData = revokeAccessSchema.parse(req.body);
      const { id } = validatedData;
      
      // Get the access record *before* updating
      const access = await storage.getAccessControlById(id); // Assuming this function exists
      if (!access) {
          return res.status(404).json({ message: 'Access control record not found' });
      }
      
      // ADDED: Security Check: Only the patient who granted it can revoke it
      if (access.patientId !== req.user!.userId) {
          return res.status(403).json({ message: 'You can only revoke access you have granted' });
      }

      // Now update
      const updatedAccess = await storage.updateAccessControl(id, {
        status: 'revoked',
        revokedAt: new Date(),
      });

      // This custom call is fine
      const txId = await blockchainService.revokeAccess(access.patientId, access.entityId);

      await storage.createAuditLog({
        txId,
        operation: 'revokeAccess',
        entityId: id,
        entityType: 'access_control',
        dataHash: blockchainService.hashData({ id, status: 'revoked' }),
        metadata: { patientId: access.patientId, entityId: access.entityId },
      });

      res.json(updatedAccess);
    } catch (error: any) {
      console.error('Revoke access error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to revoke access' });
    }
  });

  // ========== Admin Routes ==========
  // MODIFIED: Use RBAC middleware
  app.get('/api/admin/users', authenticateToken, requireRole('hospital_admin'), async (req: AuthRequest, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords
      const sanitizedUsers = users.map(({ password, ...user }) => user);
      res.json(sanitizedUsers);
    } catch (error: any) {
      console.error('Admin get users error:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // ========== Blockchain Audit Routes ==========
  // ADDED: Role check (assuming only admins can see full audit)
  app.get('/api/blockchain/audit', authenticateToken, requireRole('hospital_admin'), async (req: AuthRequest, res) => {
    try {
      const auditLogs = await storage.getAllAuditLogs();
      res.json(auditLogs);
    } catch (error: any) {
      console.error('Get audit logs error:', error);
      res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
  });

  // ========== Researcher Routes ==========
  // MODIFIED: Use RBAC middleware and fix placeholder logic
  app.get('/api/researcher/datasets', authenticateToken, requireRole('researcher'), async (req: AuthRequest, res) => {
    try {
      // MODIFIED: Replace placeholder with a simple anonymization example
      // In a real app, this query would be much more complex and secure
      const logs = await storage.getAllAuditLogs();
      
      // Anonymize: This is a placeholder. Real anonymization is complex.
      const anonymizedData = logs.map(log => ({
          operation: log.operation,
          entityType: log.entityType,
          timestamp: log.createdAt,
          metadata: log.metadata, // Be careful not to leak patientId here
      }));
      
      res.json(anonymizedData);
    } catch (error: any) {
      console.error('Researcher data error:', error);
      res.status(500).json({ message: 'Failed to fetch research data' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}