import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage'; // Adjust path as needed
import { blockchainService } from '../fabric/blockchain'; // Adjust path
import { authenticateToken, generateToken, type AuthRequest } from '../middleware/auth'; // Adjust path
import { UserRole} from '../../shared/schema';
import type {  Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// --- Zod Schemas for Input Validation ---
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
    '/granted',
    authenticateToken,
    requireRole(UserRole.PATIENT),
    async (req: AuthRequest, res) => {
      try {
        const accessControls = await storage.getAccessByPatient(
          req.user!.userId,
        );
        // IMPROVED: Join with User data for entity details here
        const detailedAccess = await Promise.all(
          accessControls.map(async (ac) => {
            const entityUser = await storage.getUser(ac.entityId);
            return {
              ...ac,
              entity: entityUser
                ? { // Only include necessary, non-sensitive fields
                    id: entityUser.id,
                    fullName: entityUser.fullName,
                    role: entityUser.role,
                    specialty: entityUser.specialty,
                    organization: entityUser.organization,
                  }
                : { // Provide a fallback structure
                    id: ac.entityId,
                    fullName: 'Unknown Entity',
                    role: ac.entityType,
                    specialty: null,
                    organization: null,
                 },
            };
          }),
        );
        res.json(detailedAccess);
      } catch (error: any) {
        console.error('Get granted access error:', error);
        res.status(500).json({ message: 'Failed to get access controls' });
      }
    },
  );

  // --- PATIENT: Proactively GRANT access ---
  router.post(
    '/grant',
    authenticateToken,
    requireRole(UserRole.PATIENT),
    async (req: AuthRequest, res) => {
      try {
        const validatedData = grantAccessSchema.parse(req.body);
        const { entityId, entityType, permissions, patientId } = validatedData;

        const accessData = {
          patientId: patientId || req.user!.userId,
          entityId,
          entityType,
          permissions,
          status: 'active', // Granted immediately
        };

        if (accessData.patientId !== req.user!.userId) {
          return res
            .status(403)
            .json({ message: 'You can only grant access to your own records' });
        }

        // Check if entity exists
        const entityUser = await storage.getUser(entityId);
        if (!entityUser) {
           return res.status(404).json({ message: 'Entity not found' });
        }
        // Optional strict check: Ensure entityType matches entityUser.role
        if (entityUser.role !== entityType) {
           return res.status(400).json({ message: 'Entity type mismatch' });
        }

        // Check if grant already exists (pending, active, or revoked)
        // Requires getAccessByPatientAndEntity method in storage
        const existing = await storage.getAccessByPatientAndEntity(accessData.patientId, entityId);
        if (existing && existing.status === 'active') {
             return res.status(400).json({ message: 'Access already granted to this entity' });
        }

        // Submit grant to blockchain
        const txId = await blockchainService.submitTransaction(
          'grantAccess',
          accessData.patientId,
          entityId,
          JSON.stringify(permissions), // Pass permissions as JSON string
        );

        // Create or Update DB record
        let access;
        if(existing && existing.status !== 'active'){
            // Update revoked/pending grant to active
            access = await storage.updateAccessControl(existing.id, {
                status: 'active',
                permissions: permissions, // Update permissions if changed
                grantedAt: new Date(),
                revokedAt: null,
                blockchainTxId: txId,
            });
        } else {
            // Create new grant
            access = await storage.createAccessControl({
              ...accessData,
              blockchainTxId: txId,
            });
        }

        await storage.createAuditLog({
          txId,
          operation: 'grantAccess',
          entityId: access.id,
          entityType: 'access_control',
          dataHash: blockchainService.hashData(accessData), // Hash intended data
          metadata: { patientId: accessData.patientId, entityId, entityType },
        });

        res.status(201).json(access);
      } catch (error: any) {
        console.error('Grant access error:', error);
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ message: 'Invalid access data', errors: error.errors });
        }
        res.status(500).json({ message: 'Failed to grant access' });
      }
    },
  );

  // --- PATIENT: REVOKE access ---
  router.post(
    '/revoke',
    authenticateToken,
    requireRole(UserRole.PATIENT),
    async (req: AuthRequest, res) => {
      try {
        const validatedData = revokeAccessSchema.parse(req.body);
        const { id } = validatedData; // ID of the access_control record

        const access = await storage.getAccessControl(id);
        if (!access) {
          return res
            .status(404)
            .json({ message: 'Access control record not found' });
        }

        if (access.patientId !== req.user!.userId) {
          return res
            .status(403)
            .json({ message: 'You can only revoke access you have granted' });
        }

        if (access.status === 'revoked') {
             return res.status(400).json({ message: 'Access is already revoked' });
        }

        // Submit revoke to blockchain
        const txId = await blockchainService.submitTransaction(
          'revokeAccess',
          access.id, // CORRECTED: Pass the access control ID to revoke
        );

        // Update DB record
        const updatedAccess = await storage.updateAccessControl(id, {
          status: 'revoked',
          revokedAt: new Date(),
          blockchainTxId: txId, // Update TxID on revoke
        });

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
          return res
            .status(400)
            .json({ message: 'Invalid data', errors: error.errors });
        }
        res.status(500).json({ message: 'Failed to revoke access' });
      }
    },
  );


  router.post(
    '/find-patients',
    authenticateToken,
    requireRole(UserRole.DOCTOR),
    async (req: AuthRequest, res: Response) => {
      try {
        const validatedData = findPatientSchema.parse(req.body);
        const user = await storage.getUserByUsername(validatedData.username);

        if (!user || user.role !== UserRole.PATIENT) {
          return res.status(404).json({ message: 'Patient not found' });
        }

        // Return non-sensitive info
        res.json({
          id: user.id,
          fullName: user.fullName,
          username: user.username,
        });
      } catch (error: any) {
        console.error('Find patient error:', error);
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ message: 'Invalid search query', errors: error.errors });
        }
        res.status(500).json({ message: 'Error finding patient' });
      }
    },
  );

  

  // --- DOCTOR: Request access from a patient ---
router.post(
    '/request',
    authenticateToken,
    requireRole(UserRole.DOCTOR),
    async (req: AuthRequest, res: Response) => {
      try {
        const validatedData = requestAccessSchema.parse(req.body);
        const { patientId } = validatedData;
        const doctorId = req.user!.userId;

        console.log(`Received access request from Doctor ${doctorId} for Patient ${patientId}`);

        // 1. Check if patient exists
        const patientUser = await storage.getUser(patientId);
        if (!patientUser || patientUser.role !== UserRole.PATIENT) {
            console.log(`Patient ${patientId} not found or not a patient.`);
            return res.status(404).json({ message: 'Patient not found' });
        }

        // 2. Check if a request already exists (pending, active, or revoked)
        // REQUIRES getAccessByPatientAndEntity in storage.ts
        const existingAccess = await storage.getAccessByPatientAndEntity(
          patientId,
          doctorId,
        );

        let accessRecord; // To hold the final record (new or updated)

        if (existingAccess) {
          console.log(`Existing access record found with status: ${existingAccess.status}`);
          // --- HANDLE EXISTING RECORD ---
          if (existingAccess.status === 'pending' || existingAccess.status === 'active') {
            // If already pending or active, prevent new request
            console.log('Request denied: Status is already pending or active.');
            return res
              .status(400)
              .json({ message: `Request status for this patient is already '${existingAccess.status}'` });
          } else if (existingAccess.status === 'revoked') {
            // If revoked, reactivate the request by setting it back to pending
            console.log('Reactivating revoked request to pending...');
            accessRecord = await storage.updateAccessControl(existingAccess.id, {
              status: 'pending',
              revokedAt: null,         // Clear revocation timestamp
              blockchainTxId: null,  // Clear old blockchain TxID from grant/revoke
              grantedAt: new Date(),   // Update timestamp to reflect new request time
              // Keep original permissions or reset to default? Resetting is safer:
              permissions: ['view_records', 'view_prescriptions'],
            });
            console.log('Updated existing record:', accessRecord);
            res.status(200).json(accessRecord); // Use 200 OK for update
            return; // Exit after handling update
          }
        } else {
          // --- CREATE NEW PENDING RECORD ---
          console.log('No existing record found. Creating new pending request...');
          const accessData = {
            patientId,
            entityId: doctorId,
            entityType: UserRole.DOCTOR,
            permissions: ['view_records', 'view_prescriptions'], // Default permissions requested
            status: 'pending',
            // grantedAt will be set on creation by DB default or by storage method
          };
          accessRecord = await storage.createAccessControl(accessData);
          console.log('Created new access record:', accessRecord);
          res.status(201).json(accessRecord); // Use 201 Created for new record
          return; // Exit after handling creation
        }

      } catch (error: any) {
        console.error('Request access error:', error);
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ message: 'Invalid request data', errors: error.errors });
        }
        res.status(500).json({ message: 'Failed to request access' });
      }
    },
  );
  // --- DOCTOR: Get list of their patients (with access status) ---
  router.get(
    '/my-patients',
    authenticateToken,
    requireRole(UserRole.DOCTOR),
    async (req: AuthRequest, res: Response) => {
      try {
        // 1. Get all access records where the entityId is the current doctor
        const accessRecords = await storage.getAccessByEntity(req.user!.userId);

        // 2. Get the patient user details for each access record
        const patientDataPromises = accessRecords.map(async (access) => {
          const patient = await storage.getUser(access.patientId);
          if (!patient) return null; // Handle case where patient might not exist
          return {
            id: patient.id, // Patient's User ID
            fullName: patient.fullName,
            username: patient.username,
            accessStatus: access.status as 'active' | 'pending' | 'revoked', // Assert type
            accessId: access.id, // ID of the access_control record itself
          };
        });
        const patientsWithAccess = (await Promise.all(patientDataPromises)).filter(p => p !== null); // Filter out nulls

        res.json(patientsWithAccess);
      } catch (error: any) {
        console.error('Get my-patients error:', error);
        res.status(500).json({ message: 'Failed to fetch patients' });
      }
    },
  );


  // --- PATIENT: Get list of pending access requests ---
  router.get(
    '/pending-requests',
    authenticateToken,
    requireRole(UserRole.PATIENT), // Ensure only patients can access this
    async (req: AuthRequest, res: Response) => {
      try {
        console.log('Received /api/access/pending-requests request');
        // 1. Get all access records for the currently logged-in patient
        const accessRecords = await storage.getAccessByPatient(
          req.user!.userId,
        );

        // 2. Filter only the records with 'pending' status
        const pendingRecords = accessRecords.filter(
          (a) => a.status === 'pending',
        );
        console.log(`Found ${pendingRecords.length} pending records.`);

        // 3. Get the entity (doctor/lab/etc.) user details for each pending record
        const entityDataPromises = pendingRecords.map(async (access) => {
          const entity = await storage.getUser(access.entityId);
          if (!entity) {
            console.warn(`Entity user not found for access record ID: ${access.id}, Entity ID: ${access.entityId}`);
            return null; // Handle case where entity user might have been deleted
          }
          // Construct the response object for this request
          return {
            accessId: access.id, // The ID of the access_control record itself
            entity: {
              id: entity.id,
              fullName: entity.fullName,
              organization: entity.organization || null,
              specialty: entity.specialty || null,
              role: entity.role as UserRole, // Assert type from DB
            },
            permissions: access.permissions, // Permissions requested
            status: access.status as 'pending', // Assert type
            // You could optionally include access.grantedAt (which would be the request time)
            // grantedAt: access.grantedAt
          };
        });

        // 4. Wait for all entity details to be fetched and filter out any nulls
        const pendingRequests = (await Promise.all(entityDataPromises)).filter(
          (r) => r !== null,
        );
        console.log(`Returning ${pendingRequests.length} detailed pending requests.`);

        // 5. Send the enriched list as JSON response
        res.json(pendingRequests);

      } catch (error: any) {
        console.error('Get pending-requests error:', error);
        res.status(500).json({ message: 'Failed to fetch pending requests' });
      }
    },
  );


router.post(
    '/approve',
    authenticateToken,
    requireRole(UserRole.PATIENT),
    async (req: AuthRequest, res: Response) => {
      try {
        console.log('Received /api/access/approve request');
        const validatedData = approveAccessSchema.parse(req.body);
        const { accessId } = validatedData; // You already have the ID here
        console.log('Parsed accessId:', accessId);

        // 1. Get the access record
        const access = await storage.getAccessControl(accessId);
        console.log('Found access record:', access);
        if (!access) {
          console.log('Access record not found');
          return res.status(404).json({ message: 'Request not found' });
        }

        // 2. Security Check: Ownership
        console.log(`Checking ownership: Record patientId=${access.patientId}, Requesting userId=${req.user!.userId}`);
        if (access.patientId !== req.user!.userId) {
          console.log('Ownership check failed');
          return res.status(403).json({ message: 'You cannot approve this request' });
        }

        // 3. Security Check: Status
        console.log('Checking status:', access.status);
        if (access.status !== 'pending') {
          console.log('Status check failed');
          return res.status(400).json({ message: 'This request is not pending or already handled' });
        }

        // 4. Submit grant to Blockchain - ADD accessId HERE
        console.log('Submitting grantAccess to blockchain with accessId:', accessId);
        const blockchainResultPayload = await blockchainService.submitTransaction(
          'grantAccess',
          accessId,             // <-- PASS THE CORRECT accessId HERE
          access.patientId,
          access.entityId,
          JSON.stringify(access.permissions),
        );
        console.log('Blockchain transaction successful, result payload:', blockchainResultPayload);

        // 5. Update the DB record to 'active'
        console.log('Updating DB record to active...');
        const updatedAccess = await storage.updateAccessControl(accessId, {
          status: 'active',
          // blockchainTxId: txId,
          grantedAt: new Date(),
        });
        console.log('DB record updated:', updatedAccess);

        // 6. Create audit log (Ensure placeholder is filled)
        console.log('Creating audit log...');
        const auditLogTxId = randomUUID();
         await storage.createAuditLog({
           txId: auditLogTxId,
           operation: 'grantAccess',
           entityId: updatedAccess.id,
           entityType: 'access_control',
           dataHash: blockchainService.hashData({
              accessId: updatedAccess.id,
              status: 'active',
              patientId: updatedAccess.patientId,
              entityId: updatedAccess.entityId
           }),
           metadata: {
             patientId: updatedAccess.patientId,
             entityId: updatedAccess.entityId,
             entityType: updatedAccess.entityType,
           },
         });
        console.log('Audit log created.');

        res.status(200).json(updatedAccess);
      } catch (error: any) {
        console.error('Approve access error:', error);
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: 'Invalid data', errors: error.errors });
        }
        // Add specific check for Fabric errors if needed
        res.status(500).json({ message: 'Failed to approve access' });
      }
    },
  );

export default router;