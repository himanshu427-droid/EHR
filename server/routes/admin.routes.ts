import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { storage } from '../storage'; // Adjust path as needed
import { blockchainService } from '../fabric/blockchain'; // Adjust path
import { authenticateToken, generateToken, type AuthRequest } from '../middleware/auth'; // Adjust path
import { loginSchema, registerSchema , UserRole} from '../../shared/schema';

const router = Router();


import type { Express, Response, NextFunction } from 'express';
import { createServer, type Server } from 'http';
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

const createPrescriptionSchema = z.object({
  patientId: z.string().uuid('Invalid Patient ID'),
  // CORRECTED: Match schema.ts (jsonb expects object array)
  medications: z
    .array(
      z.object({
        name: z.string().min(1),
        dosage: z.string().min(1),
        frequency: z.string().min(1),
        duration: z.string().min(1),
      }),
    )
    .min(1, 'At least one medication is required'),
  diagnosis: z.string().min(1, 'Diagnosis is required'),
  notes: z.string().optional(),
});

const uploadReportSchema = z.object({
  patientId: z.string().uuid('Invalid Patient ID'),
  testType: z.string().min(1, 'Test type is required'),
  // CORRECTED: Allow any JSON structure for results
  results: z.any().optional(),
});

const submitClaimSchema = z.object({
  patientId: z.string().uuid('Invalid Patient ID'),
  recordIds: z
    .array(z.string().uuid())
    .min(1, 'At least one record ID is required'),
  // CORRECTED: Drizzle schema uses text, validate as string
  claimAmount: z.string().min(1, 'Claim amount is required'),
  diagnosis: z.string().min(1, 'Diagnosis is required'),
  treatment: z.string().min(1, 'Treatment is required'),
});

const reviewClaimSchema = z.object({
  claimId: z.string().uuid('Invalid Claim ID'),
  // CORRECTED: Match schema.ts status values
  status: z.enum(['pending', 'approved', 'rejected']),
  reviewNotes: z.string().optional(),
});

const grantAccessSchema = z.object({
  entityId: z.string().uuid('Invalid Entity ID'), // e.g., a doctor's user ID
  entityType: z.string().min(1, 'Entity type is required'), // e.g., 'doctor'
  permissions: z
    .array(z.string())
    .min(1, 'At least one permission is required'),
  patientId: z.string().uuid().optional(), // Optional, defaults to self
});

const revokeAccessSchema = z.object({
  id: z.string().uuid('Invalid Access Control ID'),
});

// --- NEW SCHEMAS FOR Doctor/Patient Access Routes ---
const findPatientSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
});

const requestAccessSchema = z.object({
  patientId: z.string().uuid('Invalid Patient ID'),
});

const approveAccessSchema = z.object({
  accessId: z.string().uuid('Invalid Access ID'),
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

 router.get(
    '/api/admin/users',
    authenticateToken,
    requireRole(UserRole.HOSPITAL_ADMIN), // Use UserRole enum
    async (req: AuthRequest, res) => {
      try {
        const users = await storage.getAllUsers();
        // Remove passwords before sending
        const sanitizedUsers = users.map(({ password, ...user }) => user);
        res.json(sanitizedUsers);
      } catch (error: any) {
        console.error('Admin get users error:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
      }
    },
  );



  export default router;