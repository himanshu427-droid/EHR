import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage'; 
import { blockchainService } from '../fabric/blockchain'; 
import { authenticateToken, generateToken, type AuthRequest } from '../middleware/auth'; 
import { UserRole} from '../../shared/schema';
import type {  Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';


const grantAccessSchema = z.object({
  entityId: z.string().uuid('Invalid Entity ID'), 
  entityType: z.string().min(1, 'Entity type is required'), 
  permissions: z
    .array(z.string())
    .min(1, 'At least one permission is required'),
  patientId: z.string().uuid().optional(), 
});

const revokeAccessSchema = z.object({
  id: z.string().uuid('Invalid Access Control ID'),
});

const findPatientSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
});

const requestAccessSchema = z.object({
  patientId: z.string().uuid('Invalid Patient ID'),
});

const approveAccessSchema = z.object({
  accessId: z.string().uuid('Invalid Access ID'),
});


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
        const detailedAccess = await Promise.all(
          accessControls.map(async (ac) => {
            const entityUser = await storage.getUser(ac.entityId);
            return {
              ...ac,
              entity: entityUser
                ? {
                    id: entityUser.id,
                    fullName: entityUser.fullName,
                    role: entityUser.role,
                    specialty: entityUser.specialty,
                    organization: entityUser.organization,
                  }
                : { 
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
          status: 'active', 
        };

        if (accessData.patientId !== req.user!.userId) {
          return res
            .status(403)
            .json({ message: 'You can only grant access to your own records' });
        }

       
        const entityUser = await storage.getUser(entityId);
        if (!entityUser) {
           return res.status(404).json({ message: 'Entity not found' });
        }
      
        if (entityUser.role !== entityType) {
           return res.status(400).json({ message: 'Entity type mismatch' });
        }

       
        const existing = await storage.getAccessByPatientAndEntity(accessData.patientId, entityId);
        if (existing && existing.status === 'active') {
             return res.status(400).json({ message: 'Access already granted to this entity' });
        }

        
        const txId = await blockchainService.submitTransaction(
          'grantAccess',
          accessData.patientId,
          entityId,
          JSON.stringify(permissions),
        );

        let access;
        if(existing && existing.status !== 'active'){
            access = await storage.updateAccessControl(existing.id, {
                status: 'active',
                permissions: permissions, 
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
          dataHash: blockchainService.hashData(accessData), 
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

  router.post(
    '/revoke',
    authenticateToken,
    requireRole(UserRole.PATIENT),
    async (req: AuthRequest, res) => {
      try {
        const validatedData = revokeAccessSchema.parse(req.body);
        const { id } = validatedData; 
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

        const txId = await blockchainService.submitTransaction(
          'revokeAccess',
          access.id, 
        );

        
        const updatedAccess = await storage.updateAccessControl(id, {
          status: 'revoked',
          revokedAt: new Date(),
          blockchainTxId: txId, 
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

        const patientUser = await storage.getUser(patientId);
        if (!patientUser || patientUser.role !== UserRole.PATIENT) {
            console.log(`Patient ${patientId} not found or not a patient.`);
            return res.status(404).json({ message: 'Patient not found' });
        }


        const existingAccess = await storage.getAccessByPatientAndEntity(
          patientId,
          doctorId,
        );

        let accessRecord; 

        if (existingAccess) {
          console.log(`Existing access record found with status: ${existingAccess.status}`);
          if (existingAccess.status === 'pending' || existingAccess.status === 'active') {
            console.log('Request denied: Status is already pending or active.');
            return res
              .status(400)
              .json({ message: `Request status for this patient is already '${existingAccess.status}'` });
          } else if (existingAccess.status === 'revoked') {
           
            console.log('Reactivating revoked request to pending...');
            accessRecord = await storage.updateAccessControl(existingAccess.id, {
              status: 'pending',
              revokedAt: null,         
              blockchainTxId: null,  
              grantedAt: new Date(),   
              permissions: ['view_records', 'view_prescriptions'],
            });
            console.log('Updated existing record:', accessRecord);
            res.status(200).json(accessRecord);
            return; 
          }
        } else {
          console.log('No existing record found. Creating new pending request...');
          const accessData = {
            patientId,
            entityId: doctorId,
            entityType: UserRole.DOCTOR,
            permissions: ['view_records', 'view_prescriptions'], 
            status: 'pending',
          };
          accessRecord = await storage.createAccessControl(accessData);
          console.log('Created new access record:', accessRecord);
          res.status(201).json(accessRecord); 
          return;
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
  
  router.get(
    '/my-patients',
    authenticateToken,
    requireRole(UserRole.DOCTOR),
    async (req: AuthRequest, res: Response) => {
      try {
       
        const accessRecords = await storage.getAccessByEntity(req.user!.userId);

        const patientDataPromises = accessRecords.map(async (access) => {
          const patient = await storage.getUser(access.patientId);
          if (!patient) return null; 
          return {
            id: patient.id, 
            fullName: patient.fullName,
            username: patient.username,
            accessStatus: access.status as 'active' | 'pending' | 'revoked', 
            accessId: access.id, 
          };
        });
        const patientsWithAccess = (await Promise.all(patientDataPromises)).filter(p => p !== null); 

        res.json(patientsWithAccess);
      } catch (error: any) {
        console.error('Get my-patients error:', error);
        res.status(500).json({ message: 'Failed to fetch patients' });
      }
    },
  );

  router.get('/patient/:patientId/records', authenticateToken, 
    requireRole([UserRole.DOCTOR, UserRole.LAB, UserRole.HOSPITAL_ADMIN]), 
    async (req:AuthRequest, res: Response)=>{
      try {
        const {patientId} = req.params;
        const requestingEntityId = req.user!.userId;
        const accessGrant = await storage.getAccessByPatientAndEntity(patientId, requestingEntityId);

        if(!accessGrant || accessGrant.status != 'active'){
          console.log(`Access denied for ${requestingEntityId} to view records of ${patientId}. Status: ${accessGrant?.status}`);
          return res.status(403).json("Access denied: You don't have this permission!");
        }

        const patientRecords = await storage.getRecordsByPatient(patientId)
        res.json(patientRecords)

      } catch (error) {
        console.error(`Error fetching records for patient ${req.params.patientId}:`, error);
       res.status(500).json({ message: 'Failed to fetch patient records' });
      }
    }
  );


  router.get(
    '/pending-requests',
    authenticateToken,
    requireRole(UserRole.PATIENT), 
    async (req: AuthRequest, res: Response) => {
      try {
        console.log('Received /api/access/pending-requests request');
        const accessRecords = await storage.getAccessByPatient(
          req.user!.userId,
        );

        const pendingRecords = accessRecords.filter(
          (a) => a.status === 'pending',
        );
        console.log(`Found ${pendingRecords.length} pending records.`);

        const entityDataPromises = pendingRecords.map(async (access) => {
          const entity = await storage.getUser(access.entityId);
          if (!entity) {
            console.warn(`Entity user not found for access record ID: ${access.id}, Entity ID: ${access.entityId}`);
            return null;
          }
          return {
            accessId: access.id, 
            entity: {
              id: entity.id,
              fullName: entity.fullName,
              organization: entity.organization || null,
              specialty: entity.specialty || null,
              role: entity.role as UserRole,
            },
            permissions: access.permissions, 
            status: access.status as 'pending', 
           
          };
        });

        
        const pendingRequests = (await Promise.all(entityDataPromises)).filter(
          (r) => r !== null,
        );
        console.log(`Returning ${pendingRequests.length} detailed pending requests.`);

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
        const { accessId } = validatedData; 
        console.log('Parsed accessId:', accessId);

        const access = await storage.getAccessControl(accessId);
        console.log('Found access record:', access);
        if (!access) {
          console.log('Access record not found');
          return res.status(404).json({ message: 'Request not found' });
        }

        console.log(`Checking ownership: Record patientId=${access.patientId}, Requesting userId=${req.user!.userId}`);
        if (access.patientId !== req.user!.userId) {
          console.log('Ownership check failed');
          return res.status(403).json({ message: 'You cannot approve this request' });
        }

        console.log('Checking status:', access.status);
        if (access.status !== 'pending') {
          console.log('Status check failed');
          return res.status(400).json({ message: 'This request is not pending or already handled' });
        }

        console.log('Submitting grantAccess to blockchain with accessId:', accessId);
        const blockchainResultPayload = await blockchainService.submitTransaction(
          'grantAccess',
          accessId,            
          access.patientId,
          access.entityId,
          JSON.stringify(access.permissions),
        );
        console.log('Blockchain transaction successful, result payload:', blockchainResultPayload);

    
        console.log('Updating DB record to active...');
        const updatedAccess = await storage.updateAccessControl(accessId, {
          status: 'active',
          grantedAt: new Date(),
        });
        console.log('DB record updated:', updatedAccess);

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
        res.status(500).json({ message: 'Failed to approve access' });
      }
    },
  );

export default router;