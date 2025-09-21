import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { Cart } from '../models/Cart';

const router = Router();

// Fetch user's cart
router.get('/', requireAuth(), async (req: AuthRequest, res) => {
  const cart = await Cart.findOne({ userId: req.user!.id }).lean();
  res.json({ items: cart?.items || [] });
});

// Replace user's cart
router.put('/', requireAuth(), async (req: AuthRequest, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const cart = await Cart.findOneAndUpdate(
    { userId: req.user!.id },
    { $set: { items } },
    { upsert: true, new: true }
  );
  res.json({ ok: true, items: cart.items });
});

export default router;

