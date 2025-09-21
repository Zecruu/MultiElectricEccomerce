import { Router } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { getRecent, push, subscribe, unsubscribe } from '../services/alerts';

const router = Router();

// Recent alerts (employees/admins)
router.get('/recent', requireAuth(), requireRole('employee'), async (_req, res) => {
  res.json({ alerts: getRecent() });
});

// SSE stream
router.get('/stream', requireAuth(), requireRole('employee'), async (req: AuthRequest, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Allow CORS preconfigured globally; include credentials.
  res.flushHeaders?.();

  subscribe(res);
  const hb = setInterval(() => {
    try { res.write(`: ping ${Date.now()}\n\n`); } catch {}
  }, 20000);

  req.on('close', () => { clearInterval(hb); unsubscribe(res); try { res.end(); } catch {} });
});

export default router;

