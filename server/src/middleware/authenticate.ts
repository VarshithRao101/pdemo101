import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface DecodedUser {
  id: string;
  username: string;
  role: 'student' | 'accountant' | 'admin1' | 'admin2';
  profileId?: string;
  profileModel?: 'Student';
}

// Custom request interface extending standard Express Request
export interface AuthRequest extends Request {
  user?: DecodedUser;
}

export const getJwtSecret = () => process.env.JWT_SECRET || 'some_super_secret_key_change_me';

export const verifyJwtToken = (token: string) => {
  return jwt.verify(token, getJwtSecret()) as DecodedUser;
};

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Access token is missing or invalid.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyJwtToken(token);
    (req as AuthRequest).user = decoded;
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error);
    return res.status(401).json({
      status: 'error',
      message: 'Access token is expired or invalid.',
    });
  }
};
