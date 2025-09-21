import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';

export interface AuthRequest extends Request {
  user?: { id: string; role: 'customer' | 'employee' | 'admin' };
}

export function requireAuth() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.cookies?.accessToken as string | undefined;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
        sub: string;
        role: 'customer' | 'employee' | 'admin';
        ver: number;
      };
      // Ensure token version is current
      const user = await User.findById(payload.sub).select('refreshTokenVersion role');
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      if (user.refreshTokenVersion !== payload.ver) return res.status(401).json({ error: 'Unauthorized' });
      req.user = { id: String(user._id), role: user.role };
      next();
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
}
export function optionalAuth() {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    const token = req.cookies?.accessToken as string | undefined;
    if (!token) return next();
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
        sub: string;
        role: 'customer' | 'employee' | 'admin';
        ver: number;
      };
      const user = await User.findById(payload.sub).select('refreshTokenVersion role');
      if (!user) return next();
      if (user.refreshTokenVersion !== payload.ver) return next();
      req.user = { id: String(user._id), role: user.role };
    } catch {}
    return next();
  };
}


export function requireRole(role: 'employee' | 'admin') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (role === 'employee') {
      if (req.user.role === 'employee' || req.user.role === 'admin') return next();
      return res.status(403).json({ error: 'Forbidden' });
    } else if (role === 'admin') {
      if (req.user.role === 'admin') return next();
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.status(403).json({ error: 'Forbidden' });
  };
}

