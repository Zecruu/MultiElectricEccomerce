import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';

const router = Router();

router.get('/', requireAuth(), requireRole('admin'), async (_req, res) => {
  const users = await User.find({ deletedAt: null }).select('name email role createdAt lastLoginAt emailVerified');
  res.json({ users });
});

router.post('/', requireAuth(), requireRole('admin'), async (req: AuthRequest, res) => {
  const schema = z.object({ name: z.string().min(1), email: z.string().email(), role: z.enum(['customer','employee','admin']), password: z.string().min(8) });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { name, email, role, password } = parse.data;
  const exists = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
  if (exists) return res.status(409).json({ error: 'Email already in use' });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email: email.toLowerCase(), role, passwordHash, emailVerified: true });
  await AuditLog.create({ actorId: req.user!.id as any, action: 'admin.user.create', targetType: 'User', targetId: String(user._id) });
  res.status(201).json({ id: user._id });
});

router.patch('/:id', requireAuth(), requireRole('admin'), async (req: AuthRequest, res) => {
  const schema = z.object({ name: z.string().min(1).optional(), email: z.string().email().optional() });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  if (parse.data.name !== undefined) user.name = parse.data.name;
  if (parse.data.email !== undefined) {
    const emailLower = parse.data.email.toLowerCase();
    const exists = await User.findOne({ email: emailLower, deletedAt: null, _id: { $ne: id } });
    if (exists) return res.status(409).json({ error: 'Email already in use' });
    user.email = emailLower;
  }
  await user.save();
  await AuditLog.create({ actorId: req.user!.id as any, action: 'admin.user.update', targetType: 'User', targetId: String(user._id) });
  res.json({ message: 'Updated' });
});


router.patch('/:id/role', requireAuth(), requireRole('admin'), async (req: AuthRequest, res) => {
  const schema = z.object({ role: z.enum(['customer', 'employee', 'admin']) });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  user.role = parse.data.role;
  await user.save();
  await AuditLog.create({ actorId: req.user!.id as any, action: 'admin.user.set-role', targetType: 'User', targetId: String(user._id), diff: { role: parse.data.role } });
  res.json({ message: 'Role updated' });
});

// Admin: reset user password
router.post('/:id/reset-password', requireAuth(), requireRole('admin'), async (req: AuthRequest, res) => {
  const schema = z.object({ password: z.string().min(8) });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  user.passwordHash = await bcrypt.hash(parse.data.password, 12);
  // Invalidate existing refresh tokens
  user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1;
  await user.save();
  await AuditLog.create({ actorId: req.user!.id as any, action: 'admin.user.reset-password', targetType: 'User', targetId: String(user._id) });
  res.json({ message: 'Password reset' });
});

// Admin: delete (soft-delete) user
router.delete('/:id', requireAuth(), requireRole('admin'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  user.deletedAt = new Date();
  await user.save();
  await AuditLog.create({ actorId: req.user!.id as any, action: 'admin.user.delete', targetType: 'User', targetId: String(user._id) });
  res.json({ message: 'Deleted' });
});

export default router;

