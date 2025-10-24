import { Router } from 'express';
import { storage } from '../storage'; 
import { authenticateToken, type AuthRequest } from '../middleware/auth'; 
import {  UserRole} from '../../shared/schema';
import type { Response, NextFunction } from 'express';


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
    '/audit',
    authenticateToken,
    requireRole(UserRole.HOSPITAL_ADMIN), // Use UserRole enum
    async (req: AuthRequest, res) => {
      try {
        const auditLogs = await storage.getAllAuditLogs();
        res.json(auditLogs);
      } catch (error: any) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ message: 'Failed to fetch audit logs' });
      }
    },
  );


  export default router;