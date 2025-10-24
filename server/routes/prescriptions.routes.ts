import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage'; // Adjust path as needed
import { blockchainService } from '../fabric/blockchain'; // Adjust path
import { authenticateToken,  type AuthRequest } from '../middleware/auth'; // Adjust path
import { UserRole} from '../../shared/schema';
import type { Response, NextFunction } from 'express';


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
    '/my-prescriptions',
    authenticateToken,
    requireRole(UserRole.DOCTOR),
    async (req: AuthRequest, res) => {
      try {
        const prescriptions = await storage.getPrescriptionsByDoctor(
          req.user!.userId,
        );
        res.json(prescriptions);
      } catch (error: any) {
        console.error('Get my-prescriptions error:', error);
        res.status(500).json({ message: 'Failed to fetch prescriptions' });
      }
    },
  );



  router.post(
    '/create',
    authenticateToken,
    requireRole(UserRole.DOCTOR),
    async (req: AuthRequest, res) => {
      try {
        const validatedData = createPrescriptionSchema.parse(req.body);
        const { patientId, medications, diagnosis, notes } = validatedData;

        // Ensure patient exists
        const patientUser = await storage.getUser(patientId);
        if (!patientUser || patientUser.role !== UserRole.PATIENT) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        const prescriptionData = {
          patientId,
          doctorId: req.user!.userId,
          medications, // Pass the array of objects directly
          diagnosis,
          notes,
          status: 'active',
        };

        // Log prescription creation using addRecord on blockchain
        const txId = await blockchainService.submitTransaction(
          'addRecord', // Using addRecord chaincode function
          patientId,
          blockchainService.hashData(prescriptionData), // Hash the full data
          req.user!.userId, // Doctor ID
          JSON.stringify({ recordType: 'prescription', diagnosis }), // Metadata
        );

        const prescription = await storage.createPrescription({
          ...prescriptionData,
          blockchainTxId: txId,
        });

        await storage.createAuditLog({
          txId,
          operation: 'addPrescription', // Specific operation log
          entityId: prescription.id,
          entityType: 'prescription',
          dataHash: blockchainService.hashData(prescriptionData),
          metadata: { patientId, doctorId: req.user!.userId },
        });

        res.status(201).json(prescription);
      } catch (error: any) {
        console.error('Create prescription error:', error);
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: 'Invalid prescription data',
            errors: error.errors,
          });
        }
        res.status(500).json({ message: 'Failed to create prescription' });
      }
    },
  );

export default  router;