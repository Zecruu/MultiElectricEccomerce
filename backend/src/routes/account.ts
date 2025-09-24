import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { User } from '../models/User';

const router = Router();

// Fetch current settings
router.get('/settings', requireAuth(), async (req: AuthRequest, res) => {
  const user = await User.findById(req.user!.id).lean();
  if (!user) return res.status(404).json({ error: 'Not found' });
  return res.json({
    profile: { name: user.name, email: user.email },
    preferences: { language: user.preferences?.language || 'es', emailNotifications: user.preferences?.emailNotifications ?? true },
    sessions: [{ id: 'current', device: req.headers['user-agent'] || 'Unknown', current: true, lastActiveAt: new Date() }],
    addresses: [], // stub for now
    paymentMethods: [], // stub for now
  });
});

// Update profile (name/email)
router.patch('/profile', requireAuth(), async (req: AuthRequest, res) => {
  const schema = z.object({ name: z.string().min(1).max(120).optional(), email: z.string().email().optional() }).refine(v => v.name !== undefined || v.email !== undefined, { message: 'Nothing to update' });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input', issues: parse.error.issues });
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  if (parse.data.name !== undefined) user.name = parse.data.name;
  if (parse.data.email !== undefined) {
    const emailLower = parse.data.email.toLowerCase();
    const exists = await User.findOne({ email: emailLower, deletedAt: null, _id: { $ne: user._id } });
    if (exists) return res.status(409).json({ error: 'Email already in use' });
    user.email = emailLower;
  }
  await user.save();
  res.json({ message: 'Updated' });
});

// Change password
router.post('/password', requireAuth(), async (req: AuthRequest, res) => {
  const schema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(200) });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input', issues: parse.error.issues });
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const ok = await bcrypt.compare(parse.data.currentPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Current password incorrect' });
  user.passwordHash = await bcrypt.hash(parse.data.newPassword, 12);
  user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1; // revoke refresh tokens
  await user.save();
  res.json({ message: 'Password changed' });
});

// Preferences
router.patch('/preferences', requireAuth(), async (req: AuthRequest, res) => {
  const schema = z.object({ language: z.enum(['es','en']).optional(), emailNotifications: z.boolean().optional() }).refine(v => v.language !== undefined || v.emailNotifications !== undefined, { message: 'Nothing to update' });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input', issues: parse.error.issues });
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  user.preferences = user.preferences || {};
  if (parse.data.language !== undefined) user.preferences.language = parse.data.language;
  if (parse.data.emailNotifications !== undefined) user.preferences.emailNotifications = parse.data.emailNotifications;
  await user.save();
  res.json({ message: 'Updated', preferences: user.preferences });
});

// Sessions list (stub)
router.get('/sessions', requireAuth(), async (req: AuthRequest, res) => {
  res.json({ sessions: [{ id: 'current', device: req.headers['user-agent'] || 'Unknown', current: true, lastActiveAt: new Date() }] });
});

// Revoke all other sessions (stateless -> bump token version)
router.post('/sessions/revoke-all', requireAuth(), async (req: AuthRequest, res) => {
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1;
  await user.save();
  res.json({ message: 'Revoked' });
});

// Privacy export request (stub)
router.post('/privacy/export', requireAuth(), async (_req: AuthRequest, res) => {
  res.status(202).json({ message: 'Export requested. You will receive an email when ready.' });
});

// Delete account (soft delete + revoke)
router.delete('/', requireAuth(), async (req: AuthRequest, res) => {
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  user.deletedAt = new Date();
  user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1;
  await user.save();
  res.json({ message: 'Account deleted' });
});

export default router;

