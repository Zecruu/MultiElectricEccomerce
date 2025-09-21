import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: 'customer' | 'employee' | 'admin';
    };
}
export declare function requireAuth(): (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare function optionalAuth(): (req: AuthRequest, _res: Response, next: NextFunction) => Promise<void>;
export declare function requireRole(role: 'employee' | 'admin'): (req: AuthRequest, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
//# sourceMappingURL=auth.d.ts.map