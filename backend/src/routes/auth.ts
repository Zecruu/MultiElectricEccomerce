import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { randomUUID } from 'crypto';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { env } from '../config/env';
import { PasswordResetToken } from '../models/PasswordResetToken';
import { EmailVerificationToken } from '../models/EmailVerificationToken';
import { sendEmail } from '../utils/email';

const router = Router();

const isProd = env.NODE_ENV === 'production';
const sameSite = (env.COOKIE_SAMESITE as any) || (isProd ? 'none' : 'lax');
const cookieOpts = {
  httpOnly: true as const,
  secure: isProd,
  sameSite: sameSite as any,
  domain: env.COOKIE_DOMAIN || undefined,
  path: '/',
};

function setAuthCookies(
  res: any,
  user: { id: string; role: 'customer' | 'employee' | 'admin'; ver: number }
) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role, ver: user.ver });
  const refreshToken = signRefreshToken({ sub: user.id, role: user.role, ver: user.ver });
  res.cookie('accessToken', accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...cookieOpts, maxAge: 14 * 24 * 60 * 60 * 1000 });
}

function clearAuthCookies(res: any) {
  res.clearCookie('accessToken', { ...cookieOpts });
  res.clearCookie('refreshToken', { ...cookieOpts });
}

router.post('/register', async (req, res) => {
  const schema = z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(8) });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { name, email, password } = parse.data;

  const existing = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
  if (existing) return res.status(409).json({ error: 'Email already in use' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash, role: 'customer', emailVerified: false });

  await AuditLog.create({ actorId: user._id, action: 'user.register', targetType: 'User', targetId: String(user._id) });

  // Send verification email
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  await EmailVerificationToken.create({ userId: user._id, token, expiresAt });
  const verifyUrl = `${env.BACKEND_BASE_URL || 'http://localhost:' + env.PORT}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  await sendEmail(user.email, 'Verify your account', `Click to verify: <a href="${verifyUrl}">${verifyUrl}</a>`);

  return res.status(201).json({ message: 'Registered. Please check your email to verify your account.' });
});

router.post('/login', async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { email, password } = parse.data;

  const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  if (!user.emailVerified) return res.status(403).json({ error: 'Email not verified' });

  user.lastLoginAt = new Date();
  await user.save();

  setAuthCookies(res, { id: String(user._id), role: user.role, ver: user.refreshTokenVersion });
  await AuditLog.create({ actorId: user._id, action: 'auth.login', targetType: 'User', targetId: String(user._id) });

  res.json({ message: 'Logged in' });
});

router.post('/login-employee', async (req, res) => {
  // Same credentials; UI surfacing is different
  const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { email, password } = parse.data;

  const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  if (!user.emailVerified) return res.status(403).json({ error: 'Email not verified' });

  user.lastLoginAt = new Date();
  await user.save();

  setAuthCookies(res, { id: String(user._id), role: user.role, ver: user.refreshTokenVersion });
  await AuditLog.create({ actorId: user._id, action: 'auth.login-employee', targetType: 'User', targetId: String(user._id) });

  res.json({ message: 'Logged in' });
});

router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.sub).select('role refreshTokenVersion');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (user.refreshTokenVersion !== payload.ver) return res.status(401).json({ error: 'Unauthorized' });
    // Rotate
    setAuthCookies(res, { id: String(user._id), role: user.role, ver: user.refreshTokenVersion });
    await AuditLog.create({ actorId: user._id, action: 'auth.refresh', targetType: 'User', targetId: String(user._id) });
    return res.json({ message: 'refreshed' });
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
});

router.post('/logout', async (req, res) => {
  clearAuthCookies(res);
  return res.json({ message: 'logged out' });
});

router.post('/forgot-password', async (req, res) => {
  const schema = z.object({ email: z.string().email() });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { email } = parse.data;
  const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
  if (user) {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await PasswordResetToken.create({ userId: user._id, token, expiresAt });
    const resetUrl = `${env.APP_BASE_URL || env.FRONTEND_ORIGIN}/reset-password?token=${encodeURIComponent(token)}`;
    await sendEmail(user.email, 'Reset your password', `Click to reset: <a href="${resetUrl}">${resetUrl}</a>`);
    await AuditLog.create({ actorId: user._id, action: 'auth.forgot-password', targetType: 'User', targetId: String(user._id) });
  }
  return res.status(202).json({ message: 'If the email exists, a reset has been sent.' });
});

router.post('/reset-password', async (req, res) => {
  const schema = z.object({ token: z.string().min(1), password: z.string().min(8) });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { token, password } = parse.data;

  const tokenDoc = await PasswordResetToken.findOne({ token, usedAt: null, expiresAt: { $gt: new Date() } });
  if (!tokenDoc) return res.status(400).json({ error: 'Invalid or expired token' });
  const user = await User.findById(tokenDoc.userId);
  if (!user) return res.status(400).json({ error: 'Invalid token' });

  user.passwordHash = await bcrypt.hash(password, 12);
  user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1; // revoke all existing refresh tokens
  await user.save();

  tokenDoc.usedAt = new Date();
  await tokenDoc.save();

  clearAuthCookies(res);
  await AuditLog.create({ actorId: user._id, action: 'auth.reset-password', targetType: 'User', targetId: String(user._id) });
  return res.json({ message: 'Password updated' });
});

router.post('/verify-email', async (req, res) => {
  const schema = z.object({ token: z.string().min(1) });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { token } = parse.data;
  const tokenDoc = await EmailVerificationToken.findOne({ token, usedAt: null, expiresAt: { $gt: new Date() } });
  if (!tokenDoc) return res.status(400).json({ error: 'Invalid or expired token' });
  const user = await User.findById(tokenDoc.userId);
  if (!user) return res.status(400).json({ error: 'Invalid token' });
  user.emailVerified = true;
  await user.save();
  tokenDoc.usedAt = new Date();
  await tokenDoc.save();
  await AuditLog.create({ actorId: user._id, action: 'auth.verify-email', targetType: 'User', targetId: String(user._id) });
  return res.json({ message: 'Email verified' });
});

router.get('/verify-email', async (req, res) => {
  const token = (req.query.token as string) || '';
  if (!token) return res.status(400).json({ error: 'Missing token' });
  const tokenDoc = await EmailVerificationToken.findOne({ token, usedAt: null, expiresAt: { $gt: new Date() } });
  if (!tokenDoc) return res.status(400).json({ error: 'Invalid or expired token' });
  const user = await User.findById(tokenDoc.userId);
  if (!user) return res.status(400).json({ error: 'Invalid token' });
  user.emailVerified = true;
  await user.save();
  tokenDoc.usedAt = new Date();
  await tokenDoc.save();
  await AuditLog.create({ actorId: user._id, action: 'auth.verify-email', targetType: 'User', targetId: String(user._id) });
  return res.json({ message: 'Email verified' });
});

router.get('/google/start', (req, res) => {
  if (!env.GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'Google not configured' });
  const base = env.BACKEND_BASE_URL || `${req.protocol}://${req.get('host')}`;
  const redirectUri = `${base}/api/auth/google/callback`;
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('prompt', 'consent');
  res.redirect(url.toString());
});

router.get('/google/callback', async (req, res) => {
  try {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return res.status(500).json({ error: 'Google not configured' });
    const code = (req.query.code as string) || '';
    if (!code) return res.status(400).json({ error: 'Missing code' });
    const base = env.BACKEND_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${base}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) return res.status(400).json({ error: 'Failed to exchange code' });
    const tokenJson: any = await tokenRes.json();
    const idToken = tokenJson.id_token as string | undefined;
    if (!idToken) return res.status(400).json({ error: 'No id_token' });

    // Validate id_token via tokeninfo
    const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!infoRes.ok) return res.status(400).json({ error: 'Invalid id_token' });
    const info: any = await infoRes.json();
    if (info.aud !== env.GOOGLE_CLIENT_ID) return res.status(400).json({ error: 'aud mismatch' });
    if (info.email_verified !== 'true') return res.status(400).json({ error: 'email not verified' });

    const email = String(info.email).toLowerCase();
    const name = info.name || email.split('@')[0];
    const sub = info.sub;

    let user = await User.findOne({ email, deletedAt: null });
    if (!user) {
      const randomPassword = (await import('crypto')).randomUUID();
      const passwordHash = await bcrypt.hash(randomPassword, 12);
      user = await User.create({ name, email, passwordHash, role: 'customer', emailVerified: true, oauthProvider: 'google', oauthSub: sub });
      await AuditLog.create({ actorId: user._id, action: 'auth.google.create', targetType: 'User', targetId: String(user._id) });
    } else if (!user.oauthProvider) {
      user.oauthProvider = 'google';
      user.oauthSub = sub;
      if (!user.emailVerified) user.emailVerified = true;
      await user.save();
      await AuditLog.create({ actorId: user._id, action: 'auth.google.link', targetType: 'User', targetId: String(user._id) });
    }

    setAuthCookies(res, { id: String(user!._id), role: user!.role, ver: user!.refreshTokenVersion });
    await AuditLog.create({ actorId: user!._id, action: 'auth.google.login', targetType: 'User', targetId: String(user!._id) });

    // Redirect back to app (account page)
    return res.redirect(`${env.APP_BASE_URL || env.FRONTEND_ORIGIN}/cuenta`);
  } catch (e) {
    console.error('google/callback error', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;

