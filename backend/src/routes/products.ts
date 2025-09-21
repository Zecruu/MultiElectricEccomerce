import { Router } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { Product } from '../models/Product';
import { getStripe } from '../utils/stripe';
import { Category } from '../models/Category';

async function isValidCategory(input: any): Promise<boolean> {
  const v = String(input||'').trim();
  if (!v) return false;
  const found = await Category.exists({ $or: [ { slug: v.toLowerCase() }, { name: v } ] });
  return !!found;
}

const router = Router();

// List with filters and pagination
router.get('/', requireAuth(), requireRole('employee'), async (req, res) => {
  const { query = '', status = '', category = '', page = '1', limit = '20', sortBy = 'updatedAt', sortDir = 'desc' } = req.query as any;
  const p = Math.max(parseInt(page, 10) || 1, 1);
  const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const q: any = {};
  if (status) q.status = status;
  if (category) q.category = category;
  if (query) {
    const rx = new RegExp(String(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    q.$or = [
      { sku: rx },
      { 'translations.en.name': rx },
      { 'translations.es.name': rx },
      { category: rx },
    ];
  }

  const sortMap: Record<string, any> = {
    updatedAt: { updatedAt: sortDir === 'asc' ? 1 : -1 },
    price: { price: sortDir === 'asc' ? 1 : -1 },
    stock: { stock: sortDir === 'asc' ? 1 : -1 },
    sku: { sku: sortDir === 'asc' ? 1 : -1 },
  };
  const sort = sortMap[String(sortBy)] || sortMap.updatedAt;

  const [items, total] = await Promise.all([
    Product.find(q).sort(sort).skip((p - 1) * l).limit(l).lean(),
    Product.countDocuments(q),
  ]);
  res.json({ items, page: p, limit: l, total, totalPages: Math.ceil(total / l) });
});

// Get one
router.get('/:id', requireAuth(), requireRole('employee'), async (req, res) => {
  const doc = await Product.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

// Create (admin only)
router.post('/', requireAuth(), requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const body = req.body || {};
    if (typeof body.price !== 'number' || body.price < 0) return res.status(400).json({ error: 'Invalid price' });
    if (typeof body.stock !== 'number' || body.stock < 0) return res.status(400).json({ error: 'Invalid stock' });
    if (!body.sku || !body.category) return res.status(400).json({ error: 'Missing sku/category' });
    if (!(await isValidCategory(body.category))) return res.status(400).json({ error: 'Invalid category' });

    // Force all products to be active
    body.status = 'active';

    const doc = await Product.create(body);

    // Stripe sync (best-effort)
    const stripe = getStripe();
    if (stripe) {
      try {
        const sp = await stripe.products.create({
          name: body.translations?.en?.name || body.sku,
          active: true,
          metadata: { sku: body.sku, productId: String(doc._id) },
        });
        const unitAmount = Math.round(Number(body.price) * 100);
        const pr = await stripe.prices.create({ currency: 'usd', unit_amount: unitAmount, product: sp.id, active: true });
        await Product.findByIdAndUpdate(doc._id, { stripeProductId: sp.id, stripePriceId: pr.id });
        (doc as any).stripeProductId = sp.id;
        (doc as any).stripePriceId = pr.id;
      } catch (e) {
        console.error('Stripe sync (create) failed', e);
        // do not fail creation
      }
    }

    return res.status(201).json(doc);
  } catch (e: any) {
    if (e?.code === 11000) return res.status(409).json({ error: 'Duplicate SKU' });
    return res.status(400).json({ error: 'Bad request' });
  }
});

// Full update (admin only)
router.put('/:id', requireAuth(), requireRole('admin'), async (req, res) => {
  try {
    const body = req.body || {};
    if (typeof body.price !== 'number' || body.price < 0) return res.status(400).json({ error: 'Invalid price' });
    if (typeof body.stock !== 'number' || body.stock < 0) return res.status(400).json({ error: 'Invalid stock' });

    // Force active status
    body.status = 'active';

    if (typeof body.category !== 'undefined'){
      if (!(await isValidCategory(body.category))) return res.status(400).json({ error: 'Invalid category' });
    }
    const doc = await Product.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Not found' });

    const stripe = getStripe();
    if (stripe) {
      try {
        // Ensure product exists
        let spId = (doc as any).stripeProductId as string | undefined;
        if (!spId) {
          const sp = await stripe.products.create({ name: doc.translations?.en?.name || doc.sku, active: true, metadata: { sku: doc.sku, productId: String(doc._id) } });
          spId = sp.id;
        }
        // Ensure product is active in Stripe
        await stripe.products.update(spId!, { active: true });
        // Create new price if price changed
        if (typeof body.price === 'number') {
          const unitAmount = Math.round(Number(doc.price) * 100);
          const pr = await stripe.prices.create({ currency: 'usd', unit_amount: unitAmount, product: spId!, active: true });
          await Product.findByIdAndUpdate(doc._id, { stripeProductId: spId!, stripePriceId: pr.id });
          (doc as any).stripeProductId = spId!;
          (doc as any).stripePriceId = pr.id;
        }
      } catch (e) {
        console.error('Stripe sync (put) failed', e);
      }
    }

    res.json(doc);
  } catch (e: any) {
    if (e?.code === 11000) return res.status(409).json({ error: 'Duplicate SKU' });
    return res.status(400).json({ error: 'Bad request' });
  }
});

// Partial update (admin; allow employee to patch stock only)
router.patch('/:id', requireAuth(), requireRole('employee'), async (req: AuthRequest, res) => {
  const isAdmin = req.user!.role === 'admin';
  const body = req.body || {};
  // If not admin, only allow { stock }
  if (!isAdmin) {
    const keys = Object.keys(body);
    if (keys.length !== 1 || !keys.includes('stock')) return res.status(403).json({ error: 'Forbidden' });
    if (typeof body.stock !== 'number' || body.stock < 0) return res.status(400).json({ error: 'Invalid stock' });
  }
  if (isAdmin && typeof body.category !== 'undefined'){
    if (!(await isValidCategory(body.category))) return res.status(400).json({ error: 'Invalid category' });
  }

  if (typeof body.price !== 'undefined' && (typeof body.price !== 'number' || body.price < 0))
    return res.status(400).json({ error: 'Invalid price' });

  // Force active status always
  body.status = 'active';

  const updated = await Product.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
  if (!updated) return res.status(404).json({ error: 'Not found' });

  const stripe = getStripe();
  if (stripe && isAdmin) {
    try {
      let spId = (updated as any).stripeProductId as string | undefined;
      if (!spId) {
        const sp = await stripe.products.create({ name: updated.translations?.en?.name || updated.sku, active: true, metadata: { sku: updated.sku, productId: String(updated._id) } });
        spId = sp.id;
      }
      await stripe.products.update(spId!, { active: true });
      if (typeof body.price === 'number') {
        const unitAmount = Math.round(Number(updated.price) * 100);
        const pr = await stripe.prices.create({ currency: 'usd', unit_amount: unitAmount, product: spId!, active: true });
        await Product.findByIdAndUpdate(updated._id, { stripeProductId: spId!, stripePriceId: pr.id });
      }
    } catch (e) {
      console.error('Stripe sync (patch) failed', e);
    }
  }

  res.json(updated);
});

// Delete (admin only)
router.delete('/:id', requireAuth(), requireRole('admin'), async (req, res) => {
  const doc = await Product.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

export default router;

