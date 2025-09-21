import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { User } from '../models/User';

const router = Router();

router.get('/', requireAuth(), async (req: AuthRequest, res) => {
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const isAdmin = user.role === 'admin';
  const isEmployee = user.role === 'employee';
  const perms = {
    // existing
    canManageProducts: isAdmin,
    canEditStock: isAdmin || isEmployee,
    canManageUsers: isAdmin,
    // settings RBAC
    canManageStoreSettings: isAdmin,
    canManageEmailTemplates: isAdmin,
    canManageWebhooks: isAdmin,
    canManageSecurity: isAdmin,
    canManageIntegrations: isAdmin,
    canViewStoreSettings: isAdmin || isEmployee, // configurable later
  } as const;
  return res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: perms,
    lastLoginAt: user.lastLoginAt,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  });
});

export default router;

