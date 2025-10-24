import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required. Please set it in your .env file or Replit Secrets.');
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    email: string;
    role: string;
    fullName: string;
    speciality: string;
    organization: string;
    licenseNumber:string;
  };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
      fullName: decoded.fullName,
      speciality: decoded.speciality,
      organization: decoded.organization,
      licenseNumber: decoded.licenseNumber
    };
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

export function generateToken(user: {
  id: string;
  username: string;
  email: string;
  role: string;
  fullName: string;
  specialty?: string | null; // <-- Add this (from DB)
  organization?: string | null; // <-- Add this (from DB)
  licenseNumber?: string | null; // <-- Add this (from DB)
}): string {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      // Add the new fields to the token payload
      speciality: user.specialty, // <-- Map DB 'specialty' to token 'speciality'
      organization: user.organization,
      licenseNumber: user.licenseNumber,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}