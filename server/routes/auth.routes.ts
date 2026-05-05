import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { storage } from '../storage'; // Adjust path as needed
import { blockchainService } from '../fabric/blockchain'; // Adjust path
import { authenticateToken, generateToken, type AuthRequest } from '../middleware/auth'; // Adjust path
import { loginSchema, registerSchema, UserRole, type RegisterRequest, type User} from '../../shared/schema';

const userIdParamSchema = z.object({
  id: z.string().uuid('Invalid User ID format'),
});

const router = Router();

 router.post('/register', async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(
        validatedData.username,
      );
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      const txId = await blockchainService.submitTransaction(
        'userRegistered',
        user.id,
        user.role,
      );

      await storage.createAuditLog({
        txId,
        operation: 'userRegistered',
        entityId: user.id,
        entityType: 'user',
        dataHash: blockchainService.hashData({
          userId: user.id,
          role: user.role,
        }),
        metadata: { role: user.role },
      });
      res.status(201).json({ message: 'User created successfully' });
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: 'Invalid registration data', errors: error.errors });
      }
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(validatedData.username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const isValidPassword = await bcrypt.compare(
        validatedData.password,
        user.password,
      );
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const token = generateToken(user);
      res.json({
        message: 'Login successful',
        token,
        user: {
          userId: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          speciality: user.specialty, // Note the 'ty' spelling from DB
          organization: user.organization,
          licenseNumber: user.licenseNumber,
        },
      });
    } catch (error: any) {
      console.error('Login error:', error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: 'Invalid login data', errors: error.errors });
      }
      res.status(500).json({ message: 'Login failed' });
    }
  });

  router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    // Return user details from the decoded token
    res.json({
      userId: req.user.userId,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      fullName: req.user.fullName,
      speciality: req.user.speciality, 
      organization: req.user.organization,
      licenseNumber: req.user.licenseNumber, 
    });
  });

  
router.get(
  '/users/:id', 
  authenticateToken, 
  async (req: AuthRequest, res) => {
    try {
      const { id } = userIdParamSchema.parse(req.params);
      console.log(`Fetching user details for ID: ${id}`);

      const user = await storage.getUser(id);

      if (!user) {
        console.log(`User ${id} not found.`);
        return res.status(404).json({ message: 'User not found' });
      }

      const { password, ...userWithoutPassword } = user;

      console.log(`Returning details for user ${id}`);
      res.json(userWithoutPassword);

    } catch (error: any) {
      console.error(`Error fetching user ${req.params.id}:`, error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid User ID format', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to fetch user details' });
    }
  }
);



export default router;