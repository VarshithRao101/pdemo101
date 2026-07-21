import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const getDailyPin = (username: string, date: Date = new Date()): string => {
  const dateStr = date.toISOString().split('T')[0];
  const hash = crypto.createHash('sha256').update(`${username}-${dateStr}-inspire-daily-salt`).digest('hex');
  let pin = '';
  for (const char of hash) {
    if (/[0-9]/.test(char)) {
      pin += char;
      if (pin.length === 6) break;
    }
  }
  while (pin.length < 6) {
    pin += '1';
  }
  return pin;
};

export const getDailyOtpForSection = (section: string, date: Date = new Date()): string => {
  const dateStr = date.toISOString().split('T')[0];
  const hash = crypto.createHash('sha256').update(`${section}-${dateStr}-inspire-otp-salt`).digest('hex');
  return hash.substring(0, 6).toUpperCase();
};

export const validateSecurityKey = (actionType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['x-security-key'] as string;

    if (!key || !key.trim()) {
      return res.status(403).json({
        status: 'error',
        message: `Security key is required for this operation. Please enter the active key generated for this section in the Authenticator.`
      });
    }

    const inputKey = key.trim().toUpperCase();

    // Map legacy role checks to action-specific keys
    let mappedAction = actionType;
    if (actionType === 'admin1') {
      if (req.originalUrl.includes('/bulletins')) {
        mappedAction = 'admin1-publishing';
      } else {
        mappedAction = 'admin1-students';
      }
    } else if (actionType === 'admin3') {
      mappedAction = 'admin1-exams';
    } else if (actionType === 'admin2') {
      if (req.originalUrl.includes('/staff-salaries')) {
        mappedAction = 'admin2-salaries';
      } else {
        mappedAction = 'admin2-expenditure';
      }
    }

    const expectedOtp = getDailyOtpForSection(mappedAction);

    // Dynamic verification + fallback support for DEV123 / 111111 developer bypass
    if (inputKey === expectedOtp || inputKey === 'DEV123' || inputKey === '111111') {
      return next();
    }

    return res.status(403).json({
      status: 'error',
      message: `Invalid security key for action '${mappedAction}'. Please consult the Authenticator for the correct daily OTP.`
    });
  };
};
