import { Router } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';

const router = Router();

// Employees and Admins: list clients (customers only) with search and pagination
router.get('/', requireAuth(), requireRole('employee'), async (req, res) => {
  const { q = '', page = '1', limit = '50', verified = '' } = req.query as any;
  const p = Math.max(parseInt(String(page), 10) || 1, 1);
  const l = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);

  const filter: any = { role: 'customer', deletedAt: null };
  if (String(verified) === 'true') filter.emailVerified = true;
  if (String(verified) === 'false') filter.emailVerified = false;

  const s = String(q || '').trim();
  if (s) {
    const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: esc(s), $options: 'i' } },
      { email: { $regex: esc(s), $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filter).select('email name role lastLoginAt createdAt emailVerified').sort({ createdAt: -1 }).skip((p-1)*l).limit(l).lean(),
    User.countDocuments(filter),
  ]);
  res.json({ items, page: p, limit: l, total, totalPages: Math.ceil(total / l) });
});

// Employees and Admins can trigger a reset email for a client
router.post('/:id/send-reset', requireAuth(), requireRole('employee'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const client = await User.findById(id);
  if (!client || client.role !== 'customer') return res.status(404).json({ error: 'Not found' });
  // Issue reset token and email
  const { PasswordResetToken } = await import('../models/PasswordResetToken');
  const { sendEmail } = await import('../utils/email');
  const { env } = await import('../config/env');
  const { randomUUID } = await import('crypto');
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await PasswordResetToken.create({ userId: client._id, token, expiresAt });
  const resetUrl = `${env.APP_BASE_URL || env.FRONTEND_ORIGIN}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail(client.email, 'Password reset requested', `Click to reset: <a href="${resetUrl}">${resetUrl}</a>`);
  await AuditLog.create({ actorId: req.user!.id as any, action: 'client.send-reset', targetType: 'User', targetId: String(client._id) });
  res.json({ message: 'Reset email sent.' });
});

// Admin only: delete account (soft-delete for now)
router.delete('/:id', requireAuth(), requireRole('admin'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const client = await User.findById(id);
  if (!client) return res.status(404).json({ error: 'Not found' });
  client.deletedAt = new Date();
  await client.save();
  await AuditLog.create({ actorId: req.user!.id as any, action: 'client.delete', targetType: 'User', targetId: String(client._id) });
  res.json({ message: 'Account deleted' });
});

export default router;

