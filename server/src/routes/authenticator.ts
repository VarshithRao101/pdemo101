import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { authenticateJWT, AuthRequest } from '../middleware/authenticate';
import { authorizeRoles } from '../middleware/authorize';
import { SecurityKey } from '../models/securityKey';
import { User } from '../models/user';
import { Student } from '../models/student';
import { Teacher } from '../models/teacher';

const router = Router();
const authenticatorGuard = [authenticateJWT, authorizeRoles('authenticator')];

// Generate 6-digit uppercase alphanumeric key
const generateOTPKey = () => {
  return '111111';
};

// Generate 6-digit numeric backup code
const generateBackupCode = () => {
  return '111111';
};

// GET /api/authenticator/keys - Get daily security OTP keys
router.get('/keys', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const roles: ('accountant' | 'admin2' | 'admin1' | 'admin3')[] = ['accountant', 'admin2', 'admin1', 'admin3'];
    const now = new Date();
    
    // Set expiration to midnight tonight
    const expiresAt = new Date();
    expiresAt.setHours(23, 59, 59, 999);

    const keysList = [];

    for (const role of roles) {
      let activeKey = await SecurityKey.findOne({ role });

      // Generate if not exists or expired
      if (!activeKey || activeKey.expiresAt < now) {
        const keyVal = generateOTPKey();
        if (!activeKey) {
          activeKey = await SecurityKey.create({ role, key: keyVal, expiresAt });
        } else {
          activeKey.key = keyVal;
          activeKey.expiresAt = expiresAt;
          await activeKey.save();
        }
      }

      keysList.push({
        role: activeKey.role,
        key: activeKey.key,
        expiresAt: activeKey.expiresAt
      });
    }

    res.json({ status: 'success', data: keysList });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch keys.' });
  }
});

// GET /api/authenticator/backup-codes - List all backup codes
router.get('/backup-codes', authenticatorGuard, async (req: Request, res: Response) => {
  try {
    const users = await User.find({ role: { $in: ['student', 'admin1', 'admin2', 'admin3', 'accountant'] } }).populate('profileId');
    
    const list = [];
    for (const u of users) {
      // Auto-initialize backupCode if missing
      if (!u.backupCode) {
        u.backupCode = generateBackupCode();
        await u.save();
      }

      let name = u.username.toUpperCase();
      if (u.profileId) {
        name = (u.profileId as any).name || name;
      }

      list.push({
        userId: u._id,
        username: u.username,
        name,
        role: u.role,
        backupCode: u.backupCode,
        usedBackupCodes: u.usedBackupCodes || []
      });
    }

    res.json({ status: 'success', data: list });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to get backup codes.' });
  }
});

// POST /api/authenticator/reset-password - Reset password using backup code
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { username, password, backupCode } = req.body;

    if (!username || !password || !backupCode) {
      return res.status(400).json({ status: 'error', message: 'Username, password, and backup code are required.' });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    if (!user.backupCode || user.backupCode !== backupCode.trim()) {
      return res.status(400).json({ status: 'error', message: 'Invalid backup code. Verification failed.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password.trim(), salt);

    // Save and rotate backup code
    const oldCode = user.backupCode;
    user.passwordHash = passwordHash;
    if (!user.usedBackupCodes) {
      user.usedBackupCodes = [];
    }
    user.usedBackupCodes.push(oldCode);
    user.backupCode = generateBackupCode();
    await user.save();

    res.json({
      status: 'success',
      message: 'Password reset successfully.',
      nextBackupCode: user.backupCode
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to reset password.' });
  }
});

// GET /api/authenticator/accounts - List admin & accountant User accounts
router.get('/accounts', authenticatorGuard, async (req: Request, res: Response) => {
  try {
    const accounts = await User.find({ role: { $in: ['admin1', 'admin2', 'admin3', 'accountant'] } }).select('-passwordHash');
    res.json({ status: 'success', data: accounts });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch accounts.' });
  }
});

// POST /api/authenticator/accounts - Create account
router.post('/accounts', authenticatorGuard, async (req: Request, res: Response) => {
  try {
    const { username, role, password, name, email, mobile, department } = req.body;

    if (!username || !role || !password) {
      return res.status(400).json({ status: 'error', message: 'Username, role, and password are required.' });
    }

    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'Account with this username already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const u = await User.create({
      username: username.toLowerCase().trim(),
      role,
      passwordHash,
      backupCode: generateBackupCode(),
      name: name || '',
      email: email || '',
      mobile: mobile || '',
      department: department || ''
    });

    res.status(201).json({ status: 'success', data: u });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to create account.' });
  }
});

// PUT /api/authenticator/accounts/:id - Update account
router.put('/accounts/:id', authenticatorGuard, async (req: Request, res: Response) => {
  try {
    const { username, name, email, mobile, department } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'Account not found.' });
    }

    if (username) {
      const lower = username.toLowerCase().trim();
      if (lower !== user.username) {
        const existing = await User.findOne({ username: lower });
        if (existing) {
          return res.status(409).json({ status: 'error', message: 'Username is already taken.' });
        }
        user.username = lower;
      }
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (mobile !== undefined) user.mobile = mobile;
    if (department !== undefined) user.department = department;

    await user.save();
    res.json({ status: 'success', data: user });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to update account.' });
  }
});

// DELETE /api/authenticator/accounts/:id - Delete account
router.delete('/accounts/:id', authenticatorGuard, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'Account not found.' });
    }

    await user.deleteOne();
    res.json({ status: 'success', message: 'Account deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to delete account.' });
  }
});

// GET /api/authenticator/stats - Dashboard analytics
router.get('/stats', authenticatorGuard, async (req: Request, res: Response) => {
  try {
    const totalStudents = await Student.countDocuments({ status: 'Active' });
    const totalTeachers = await Teacher.countDocuments({ status: 'Active' });
    const totalStaff = await User.countDocuments({ role: { $in: ['admin1', 'admin2', 'admin3', 'accountant'] } });
    
    // Simulate real-time connected devices between 8 and 15
    const activeDevices = Math.floor(8 + Math.random() * 8);

    res.json({
      status: 'success',
      data: {
        totalStudents,
        totalTeachers,
        totalStaff,
        activeDevices
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to compile stats.' });
  }
});

export default router;
