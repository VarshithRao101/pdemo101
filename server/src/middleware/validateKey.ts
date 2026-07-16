import { Request, Response, NextFunction } from 'express';
import { SecurityKey } from '../models/securityKey';

export const validateSecurityKey = (role: 'accountant' | 'admin2' | 'admin1' | 'admin3') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['x-security-key'] as string;

    if (!key || !key.trim()) {
      return res.status(403).json({
        status: 'error',
        message: `Security key is required for this operation. Please enter the active key generated for ${role} in the Authenticator.`
      });
    }

    try {
      const activeKey = await SecurityKey.findOne({ role });

      if (!activeKey) {
        return res.status(403).json({
          status: 'error',
          message: `No security key has been initialized for ${role}. Please check the Authenticator.`
        });
      }

      if (activeKey.key !== key.trim()) {
        return res.status(403).json({
          status: 'error',
          message: 'Invalid security key. Please check the Authenticator for the correct daily key.'
        });
      }

      if (activeKey.expiresAt < new Date()) {
        return res.status(403).json({
          status: 'error',
          message: 'Security key has expired. Please check the Authenticator for the new key.'
        });
      }

      next();
    } catch (error) {
      console.error('Security key validation error:', error);
      res.status(500).json({
        status: 'error',
        message: 'An internal error occurred during security key validation.'
      });
    }
  };
};
