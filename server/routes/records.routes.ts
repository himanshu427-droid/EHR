import { z } from 'zod';
import { storage } from '../storage'; 
import { blockchainService } from '../fabric/blockchain'; 
import { authenticateToken, type AuthRequest } from '../middleware/auth'; // Adjust path
import {  UserRole} from '../../shared/schema';

import { type Response, type NextFunction, Router } from 'express';
import multer from 'multer';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

// --- Zod Schemas for Input Validation ---

const uploadRecordSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  recordType: z.string().min(1, 'Record type is required'),
  patientId: z.string().uuid().optional(), // Optional, defaults to self
});

// Configure multer for file uploads
const uploadDir = join(process.cwd(), 'uploads');
mkdir(uploadDir, { recursive: true }).catch(console.error);

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
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
      return res
        .status(403)
        .json({ message: 'Access denied: Insufficient permissions' });
    }
    next();
  };
};

// ------------------------------- //
const router = Router();

router.get(
    '/my-records',
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const records = await storage.getRecordsByPatient(req.user!.userId);
        res.json(records);
      } catch (error: any) {
        console.error('Get my-records error:', error);
        res.status(500).json({ message: 'Failed to fetch records' });
      }
    },
  );

  router.get(
    '/created-by-me',
    authenticateToken,
    requireRole(UserRole.DOCTOR), // Use UserRole enum
    async (req: AuthRequest, res) => {
      try {
        const records = await storage.getRecordsByDoctor(req.user!.userId);
        res.json(records);
      } catch (error: any) {
        console.error('Get created-by-me error:', error);
        res.status(500).json({ message: 'Failed to fetch records' });
      }
    },
  );

// Inside registerRoutes in routes.ts

router.post(
  '/upload',
  authenticateToken,
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = uploadRecordSchema.parse(req.body);
      const { title, description, recordType, patientId } = validatedData;
      const file = req.file;

      const recordData = {
        title,
        description,
        recordType,
        patientId: patientId || req.user!.userId,
        doctorId: req.user!.role === UserRole.DOCTOR ? req.user!.userId : null,
        fileHash: file
          ? blockchainService.hashData({
              filename: file.filename,
              size: file.size,
            })
          : null,
        filePath: file ? file.path : null,
        fileName: file ? file.originalname : null,
        status: 'active',
      };

      // --- CORRECTED BLOCKCHAIN CALL ---
      // Calculate the hash to send
      const dataHashForBlockchain = recordData.fileHash || blockchainService.hashData(recordData);

      console.log('Calling blockchainService.addRecord with:', recordData.patientId, dataHashForBlockchain, recordData.doctorId);

      // Call the dedicated function in blockchainService
      // This function will generate the recordId and call submitTransaction correctly
      const blockchainResultPayload = await blockchainService.addRecord(
          recordData.patientId,
          dataHashForBlockchain,
          recordData.doctorId // Pass null if not a doctor, the function handles it
      );
      console.log('Blockchain addRecord successful. Result:', blockchainResultPayload);
      // NOTE: blockchainResultPayload is the *result* from chaincode, usually a JSON string.
      // It is NOT the Fabric Transaction ID needed for the audit log txId.

      // Generate a UUID for the audit log's txId column
      const auditLogTxId = randomUUID(); // Make sure crypto.randomUUID is imported

      const record = await storage.createRecord({
        ...recordData,
        // Decide what to store here. Usually, it should be the actual Fabric Tx ID
        // if you could retrieve it. Storing the result payload might be less useful.
        // For now, let's store the audit log's ID as a reference, or leave it null.
        blockchainTxId: auditLogTxId, // Or null
      });

      await storage.createAuditLog({
        txId: auditLogTxId, // Use the generated UUID for the audit log txId
        operation: 'addRecord',
        entityId: record.id,
        entityType: 'record',
        dataHash: dataHashForBlockchain, // Use the same hash sent to blockchain
        metadata: {
             recordType,
             patientId: recordData.patientId,
             // Optionally add blockchain result payload if needed for auditing
             // blockchainResult: blockchainResultPayload
        },
      });

      res.status(201).json(record);
    } catch (error: any) {
      console.error('Upload error:', error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: 'Invalid record data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to upload record' });
    }
  },
);

export default router;