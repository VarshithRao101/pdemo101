import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate';

export const authorizeRoles = (...allowedRoles: ('student' | 'accountant' | 'admin1' | 'admin2' | 'admin3' | 'authenticator')[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    
    if (!authReq.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized. User session not found.',
      });
    }

    if (!allowedRoles.includes(authReq.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden. Access restricted for this user role.',
      });
    }

    next();
  };
};
