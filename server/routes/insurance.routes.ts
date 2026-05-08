import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage'; 
import { createAuditId, hashData } from '../lib/audit';
import { authenticateToken, type AuthRequest } from '../middleware/auth'; 
import { UserRole} from '../../shared/schema';

const router = Router();

import type {  Response, NextFunction } from 'express';


// --- Zod Schemas for Input Validation ---

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
    '/claims',
    authenticateToken,
    requireRole(UserRole.INSURANCE), // Use UserRole enum
    async (req: AuthRequest, res) => {
      try {
        const claims = await storage.getClaimsByInsurance(req.user!.userId);
        res.json(claims);
      } catch (error: any) {
        console.error('Get claims error:', error);
        res.status(500).json({ message: 'Failed to fetch claims' });
      }
    },
  );

  router.post(
    '/submit-claim',
    authenticateToken,
    requireRole(UserRole.INSURANCE), // Use UserRole enum
    async (req: AuthRequest, res) => {
      try {
        const validatedData = submitClaimSchema.parse(req.body);

        // Ensure patient exists
        const patientUser = await storage.getUser(validatedData.patientId);
        if (!patientUser || patientUser.role !== UserRole.PATIENT) {
            return res.status(404).json({ message: 'Patient not found' });
        }
        // Potentially check if recordIds exist and belong to the patient

        const claimData = {
          ...validatedData,
          insuranceId: req.user!.userId,
          status: 'pending',
          reviewNotes: null,
          reviewedAt: null,
        };
        const auditId = createAuditId();

        const claim = await storage.createClaim({
          ...claimData,
        });

        await storage.createAuditLog({
          txId: auditId,
          operation: 'submitClaim', // Specific operation log
          entityId: claim.id,
          entityType: 'insurance_claim',
          dataHash: hashData(claimData),
          metadata: {
            patientId: claimData.patientId,
            insuranceId: req.user!.userId,
            claimAmount: claimData.claimAmount,
          },
        });

        res.status(201).json(claim);
      } catch (error: any) {
        console.error('Submit claim error:', error);
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ message: 'Invalid claim data', errors: error.errors });
        }
        res.status(500).json({ message: 'Failed to submit claim' });
      }
    },
  );

  router.post(
    '/review-claim',
    authenticateToken,
    requireRole(UserRole.INSURANCE), // Use UserRole enum
    async (req: AuthRequest, res) => {
      try {
        const validatedData = reviewClaimSchema.parse(req.body);
        const { claimId, status, reviewNotes } = validatedData;

        // Check if claim exists before updating
        const existingClaim = await storage.getInsuranceClaim(claimId);
        if (!existingClaim) {
           return res.status(404).json({ message: 'Claim not found' });
        }
        // Security check: Ensure the claim belongs to this insurance provider
        if (existingClaim.insuranceId !== req.user!.userId) {
           return res.status(403).json({ message: 'You can only review claims for your organization' });
        }

        const claim = await storage.updateClaim(claimId, {
          status,
          reviewNotes,
          reviewedAt: new Date(),
        });

        await storage.createAuditLog({
          txId: createAuditId(),
          operation: 'reviewClaim', // Specific operation log
          entityId: claimId,
          entityType: 'insurance_claim',
          dataHash: hashData({ claimId, status }),
          metadata: { status, reviewedBy: req.user!.userId },
        });

        res.json(claim);
      } catch (error: any) {
        console.error('Review claim error:', error);
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ message: 'Invalid review data', errors: error.errors });
        }
        res.status(500).json({ message: 'Failed to review claim' });
      }
    },
  );


export default router;
