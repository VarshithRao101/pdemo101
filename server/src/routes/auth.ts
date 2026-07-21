import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { User } from '../models/user';
import { Student } from '../models/student';
import { authenticateJWT, AuthRequest } from '../middleware/authenticate';
import { getDailyPin } from '../middleware/validateKey';

const router = Router();

// Brute-force protection: demo-safe ceiling for shared testing sessions.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const { identifier, password } = req.body;

  if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier.trim() || !password.trim()) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide both username/ID and PIN.',
    });
  }

  if (identifier.trim().length > 64 || password.trim().length > 128) {
    return res.status(400).json({
      status: 'error',
      message: 'Identifier or PIN is too long.',
    });
  }

  try {
    const searchId = identifier.trim();
    let user = await User.findOne({ username: searchId.toLowerCase() });

    // Fallback 1: Search by Student roll number or ID
    if (!user) {
      const student = await Student.findOne({
        $or: [
          { rollNumber: searchId },
          { studentId: searchId },
          { admissionNumber: searchId },
        ],
      });
      if (student) {
        user = await User.findOne({ profileId: student._id });
      }
    }



    // Generic error to prevent user enumeration
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials. Please verify your ID and PIN.',
      });
    }

    let isMatch = false;
    if (user.role === 'authenticator') {
      isMatch = await bcrypt.compare(password, user.passwordHash);
    } else {
      const expectedDailyPin = getDailyPin(user.username);
      if (password === expectedDailyPin) {
        isMatch = true;
      } else {
        isMatch = await bcrypt.compare(password, user.passwordHash);
      }
    }

    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials. Please verify your ID and PIN.',
      });
    }

    // Generate JWT
    const secret = process.env.JWT_SECRET || 'some_super_secret_key_change_me';
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role,
        profileId: user.profileId,
        profileModel: user.profileModel,
      },
      secret,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      status: 'success',
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        profileId: user.profileId,
        profileModel: user.profileModel,
      },
    });
  } catch (error) {
    console.error('Login process error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An internal error occurred during login.',
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  // Stateless JWT requires no server-side cache changes, client discards the token
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully.',
  });
});

// GET /api/auth/me
router.get('/me', authenticateJWT, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  
  if (!authReq.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized. User session not found.',
    });
  }

  try {
    const user = await User.findById(authReq.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User session invalid or expired.',
      });
    }

    res.status(200).json({
      status: 'success',
      user,
    });
  } catch (error) {
    console.error('Session recovery error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An internal error occurred while restoring the session.',
    });
  }
});

export default router;
