import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage'; // Adjust path as needed
import { blockchainService } from '../fabric/blockchain'; // Adjust path
import { authenticateToken, type AuthRequest } from '../middleware/auth'; // Adjust path
import { UserRole} from '../../shared/schema';
import type { Response, NextFunction } from 'express';
import multer from 'multer';
import { mkdir } from 'fs/promises';
import { join } from 'path';

// --- Zod Schemas for Input Validation ---




const uploadReportSchema = z.object({
  patientId: z.string().uuid('Invalid Patient ID'),
  testType: z.string().min(1, 'Test type is required'),
  // CORRECTED: Allow any JSON structure for results
  results: z.any().optional(),
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

// -------------------------- //

const router = Router();

 router.get(
    '/my-reports',
    authenticateToken,
    requireRole(UserRole.LAB), // CORRECTED: Use UserRole enum
    async (req: AuthRequest, res) => {
      try {
        const reports = await storage.getLabReportsByLab(req.user!.userId);
        res.json(reports);
      } catch (error: any) {
        console.error('Get my-reports error:', error);
        res.status(500).json({ message: 'Failed to fetch lab reports' });
      }
    },
  );

  router.post(
    '/upload-report',
    authenticateToken,
    requireRole(UserRole.LAB), // CORRECTED: Use UserRole enum
    upload.single('file'),
    async (req: AuthRequest, res) => {
      try {
        const validatedData = uploadReportSchema.parse(req.body);
        const { patientId, testType, results } = validatedData;
        const file = req.file;

        // Ensure patient exists
        const patientUser = await storage.getUser(patientId);
        if (!patientUser || patientUser.role !== UserRole.PATIENT) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        let parsedResults = null;
        if (results) {
            try {
                parsedResults = typeof results === 'string' ? JSON.parse(results) : results;
            } catch (parseError) {
                return res.status(400).json({ message: 'Invalid JSON format for results' });
            }
        }

        const reportData = {
          patientId,
          labId: req.user!.userId,
          testType,
          results: parsedResults, // Store parsed JSON
          fileHash: file
            ? blockchainService.hashData({
                filename: file.filename,
                size: file.size,
              })
            : null,
          filePath: file ? file.path : null,
          fileName: file ? file.originalname : null,
          status: file ? 'completed' : 'pending', // Consider if status should be different if results are provided w/o file
        };

        // Log lab report upload using addRecord on blockchain
        const txId = await blockchainService.submitTransaction(
          'addRecord', // Using addRecord chaincode function
          patientId,
          reportData.fileHash || blockchainService.hashData(reportData),
          req.user!.userId, // Lab ID
          JSON.stringify({ recordType: 'lab_report', testType }), // Metadata
        );

        const report = await storage.createLabReport({
          ...reportData,
          blockchainTxId: txId,
        });

        await storage.createAuditLog({
          txId,
          operation: 'addLabReport', // Specific operation log
          entityId: report.id,
          entityType: 'lab_report',
          dataHash:
            reportData.fileHash || blockchainService.hashData(reportData),
          metadata: { patientId, labId: req.user!.userId, testType },
        });

        res.status(201).json(report);
      } catch (error: any) {
        console.error('Upload lab report error:', error);
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: 'Invalid lab report data',
            errors: error.errors,
          });
        }
        // Catch parsing error again in case it happens outside Zod
        if (error instanceof SyntaxError) {
             return res.status(400).json({ message: 'Invalid JSON format for results' });
        }
        res.status(500).json({ message: 'Failed to upload lab report' });
      }
    },
  );

  export default router;