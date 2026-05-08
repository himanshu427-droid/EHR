import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { storage } from '../storage';
import { authenticateToken, type AuthRequest } from '../middleware/auth';
import { UserRole } from '../../shared/schema';

const router = Router();

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

router.get(
  '/users',
  authenticateToken,
  requireRole(UserRole.HOSPITAL_ADMIN),
  async (_req: AuthRequest, res) => {
    try {
      const users = await storage.getAllUsers();
      const sanitizedUsers = users.map(({ password, ...user }) => user);
      res.json(sanitizedUsers);
    } catch (error: any) {
      console.error('Admin get users error:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  },
);

export default router;
