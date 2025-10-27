import { type Response, type NextFunction, Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { blockchainService } from '../fabric/blockchain';
import { authenticateToken, type AuthRequest } from '../middleware/auth';
import { UserRole } from '../../shared/schema'; // Assuming UserRole is correctly exported
import multer from 'multer';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

// --- Configure Multer ---
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
// (Ensure this is either imported from auth.ts or defined here)
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

// --- Zod Schema for Medication (reusable) ---
const medicationSchema = z.object({
  name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  duration: z.string().min(1, 'Duration is required'),
});

// --- Refined Zod Schema for Create Record ---
const createRecordSchema = z.object({
    patientId: z.string().uuid('Valid Patient ID is required in the request body.'), // Added explicitly
    recordType: z.string().min(1, 'Record type is required'),
    title: z.string().optional(),
    description: z.string().optional(),
    // Allow any type initially for medications, parse and validate before refine
    diagnosis: z.string().optional(),
    medications: z.any().optional(),
}).refine(data => {
    // Check required fields based on recordType
    if (data.recordType !== 'prescription' && (!data.title || data.title.trim() === '')) {
        return false; // Title required if not prescription
    }
    // If prescription, diagnosis and a non-empty medications array are required
    if (data.recordType === 'prescription' && (!data.diagnosis || data.diagnosis.trim() === '' || !Array.isArray(data.medications) || data.medications.length === 0)) {
        return false;
    }
    return true;
}, {
    message: "Title is required (unless type is Prescription). Diagnosis and a valid Medications array are required for Prescriptions.",
    // path: ["title"], // Path might be misleading
});

// --- Router Instance ---
const router = Router();

// --- GET /api/records/my-records (Patient View) ---
router.get(
  '/my-records',
  authenticateToken,
  requireRole(UserRole.PATIENT), // Ensure only patient calls this
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

// --- GET /api/records/created-by-me (Doctor View) ---
router.get(
  '/created-by-me',
  authenticateToken,
  requireRole(UserRole.DOCTOR), // Ensure only doctor calls this
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

// --- POST /api/records/upload (Unified Creation Endpoint) ---
router.post(
  '/upload',
  authenticateToken,
  // Allow roles that can create records
  requireRole([UserRole.DOCTOR, UserRole.LAB /* Add others if needed */]),
  upload.single('file'), // Handles optional file upload
  async (req: AuthRequest, res: Response) => {
    try {
      const requestBody = { ...req.body };
      const file = req.file;
      const creatorId = req.user!.userId;
      const creatorRole = req.user!.role;

      // Manually parse 'medications' if it's a string from FormData
      let parsedMedications: any[] | undefined = undefined; // To hold parsed array
      if (requestBody.medications && typeof requestBody.medications === 'string') {
        console.log("Attempting to parse medications string:", requestBody.medications);
        try {
          parsedMedications = JSON.parse(requestBody.medications);
          // Validate the parsed array structure immediately
          z.array(medicationSchema).parse(parsedMedications);
          requestBody.medications = parsedMedications; // Put the array back for main validation
          console.log("Parsed and validated medications array:", requestBody.medications);
        } catch (parseOrValidationError) {
          console.error("Failed to parse or validate medications JSON:", parseOrValidationError);
          let message = 'Invalid format for medications data.';
          if (parseOrValidationError instanceof z.ZodError) {
              message = 'Invalid structure for one or more medication items.';
          }
          return res.status(400).json({ message });
        }
      }

      // Validate the potentially modified requestBody using the refined schema
      const validatedData = createRecordSchema.parse(requestBody);
      // Destructure AFTER validation
      const { title, description, recordType, patientId, medications, diagnosis } = validatedData;

      // Ensure patient exists
      const patientUser = await storage.getUser(patientId);
      if (!patientUser || patientUser.role !== UserRole.PATIENT) {
           return res.status(404).json({ message: 'Patient not found' });
      }

      const accessGrant = await storage.getAccessByPatientAndEntity(patientId, creatorId);

      if (!accessGrant || accessGrant.status !== 'active') {
          console.log(`Access DENIED for Creator ${creatorId} to Patient ${patientId}. Grant status: ${accessGrant?.status ?? 'none'}`);
          // Return 403 Forbidden if no active grant exists
          return res.status(403).json({ message: 'Access denied: You do not have active permission to create records for this patient.' });
      }

      // Construct the data to be saved in the database
      const recordData = {
        title: recordType === 'prescription' ? (title || diagnosis!) : title!,
        description,
        recordType,
        patientId,
        // Assign creator ID based on role
        doctorId: creatorRole === UserRole.DOCTOR ? creatorId : null,
        labId: creatorRole === UserRole.LAB ? creatorId : null,
        // insuranceId: creatorRole === UserRole.INSURANCE ? creatorId : null, // Add if needed
        fileHash: file ? blockchainService.hashData({ filename: file.filename, size: file.size }) : null,
        filePath: file ? file.path : null,
        fileName: file ? file.originalname : null,
        status: 'active',
        // Use the validated medications/diagnosis (which are now arrays/strings)
        medications: recordType === 'prescription' ? medications : null,
        diagnosis: recordType === 'prescription' ? diagnosis : null,
      };

      // Create a simplified object to hash for the blockchain log
      const dataToHash = {
          title: recordData.title,
          recordType: recordData.recordType,
          patientId: recordData.patientId,
          creatorId: creatorId,
          // Conditionally include relevant fields based on type
          ...(recordType === 'prescription' && { diagnosis: recordData.diagnosis, medications: recordData.medications }),
          ...(recordType === 'lab_report' /* && { testType: ... } */), // Add specifics for other types if needed
          timestamp: new Date().toISOString() // Add timestamp for hash uniqueness
      };
      // Use file hash if available, otherwise hash the constructed data
      const dataHashForBlockchain = recordData.fileHash || blockchainService.hashData(dataToHash);

      console.log(`Calling blockchainService.addRecord for type ${recordType}: patientId=${patientId}, creatorId=${creatorId}, hash=${dataHashForBlockchain}`);

      // Call blockchainService.addRecord function
      const blockchainResultPayload = await blockchainService.addRecord(
          patientId,
          dataHashForBlockchain,
          creatorId // Pass the creator's ID
      );
      console.log('Blockchain addRecord successful. Result:', blockchainResultPayload);
      // Note: blockchainResultPayload is the result from chaincode, NOT the Fabric Tx ID.

      // Generate a UUID for the audit log's txId column
      const auditLogTxId = randomUUID();

      // Create record in the database
      const record = await storage.createRecord({
        ...recordData,
        blockchainTxId: auditLogTxId, // Use audit log ref
      });
      console.log(`Record created in DB (Type: ${recordType}, ID: ${record.id})`);

      // Create the audit log entry
      await storage.createAuditLog({
        txId: auditLogTxId, // Use the generated UUID
        operation: `addRecord_${recordType}`, // Specific operation based on type
        entityId: record.id,
        entityType: 'record', // Unified entity type
        dataHash: dataHashForBlockchain, // The hash stored on the blockchain
        metadata: { recordType, patientId, createdBy: creatorId, role: creatorRole }, // Useful metadata
      });
      console.log('Audit log created for record:', record.id);

      res.status(201).json(record); // Return the created record

    } catch (error: any) {
      console.error(`Create record (type: ${req.body?.recordType || 'unknown'}) error:`, error);
      if (error instanceof z.ZodError) {
        console.error("Zod Validation Errors:", JSON.stringify(error.errors, null, 2));
        return res
          .status(400)
          .json({ message: 'Invalid record data', errors: error.errors });
      }
       if (error instanceof SyntaxError && error.message.includes('JSON')) {
            return res.status(400).json({ message: 'Invalid JSON format received (e.g., for medications)' });
       }
      // Handle potential blockchain errors
      if (error.message && (error.message.includes('endorsement') || error.message.includes('chaincode') || error.message.includes('submitTransaction'))) {
           console.error("Blockchain transaction error:", error.message);
           // Attempt to provide a more specific message if possible
           let detail = error.message;
           if (error.message.includes('ENDORSEMENT_POLICY_FAILURE')) detail = 'Endorsement policy failure.';
           if (error.message.includes('CHAINCODE_INVOKE_TIMEOUT')) detail = 'Chaincode invocation timed out.';
           return res.status(502).json({ message: 'Blockchain transaction failed', details: detail });
      }
      res.status(500).json({ message: 'Failed to create record' });
    }
  },
);

export default router; // Export the router instance
