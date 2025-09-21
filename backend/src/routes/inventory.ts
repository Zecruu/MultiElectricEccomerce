import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth(), requireRole('admin'), async (_req, res) => {
  // Placeholder inventory list
  res.json({ items: [] });
});

export default router;

