import { Router } from 'express';
import { Product } from '../models/Product';
import { Category } from '../models/Category';

const router = Router();

// Public categories list with counts
router.get('/categories', async (_req, res) => {
  try {
    const cats = await Category.find({}).sort({ name: 1 }).lean();
    const results = await Promise.all(cats.map(async (c) => {
      const $or: any[] = [];
      if (c.name) $or.push({ category: c.name });
      if (c.slug) $or.push({ category: c.slug });
      const count = $or.length ? await Product.countDocuments({ $or }) : 0;
      return { _id: c._id, name: c.name, slug: c.slug, description: c.description, productCount: count };
    }));
    // Ensure the default category appears even if missing in DB
    if (!results.find(r => r.slug === 'uncategorized')) {
      const count = await Product.countDocuments({ $or: [{ category: 'uncategorized' }, { category: 'Uncategorized' }] });
      results.unshift({ _id: 'uncategorized', name: 'Uncategorized', slug: 'uncategorized', description: 'Default category', productCount: count });
    }
    res.json({ items: results });
  } catch (e) {
    res.status(500).json({ error: 'catalog_categories_failed' });
  }
});

// Public catalog listing (all products)
router.get('/products', async (req, res) => {
  try {
    const { q = '', page = '1', limit = '20', sortBy = 'updatedAt', sortDir = 'desc' } = req.query as any;
    const p = Math.max(parseInt(String(page), 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);

    // Multi-category support: category can be string (csv) or multiple query params
    const rawCat = (req.query as any).category;
    let categories: string[] = [];
    if (Array.isArray(rawCat)) {
      for (const entry of rawCat) {
        String(entry).split(',').forEach(s=>{ const v=s.trim(); if (v) categories.push(v); });
      }
    } else if (typeof rawCat === 'string' && rawCat.trim()) {
      String(rawCat).split(',').forEach(s=>{ const v=s.trim(); if (v) categories.push(v); });
    }
    categories = Array.from(new Set(categories));

    const query: any = {};
    if (categories.length === 1) query.category = categories[0];
    if (categories.length > 1) query.category = { $in: categories };

    // Featured only
    const featuredRaw = (req.query as any).featured;
    const featured = typeof featuredRaw !== 'undefined' && ['1','true','yes','on'].includes(String(featuredRaw).toLowerCase());
    if (featured) query.featured = true;

    if (q) {
      const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { sku: rx },
        { 'translations.en.name': rx },
        { 'translations.es.name': rx },
        { category: rx },
      ];
    }

    const sortMap: Record<string, any> = {
      updatedAt: { updatedAt: sortDir === 'asc' ? 1 : -1 },
      price: { price: sortDir === 'asc' ? 1 : -1 },
      sku: { sku: sortDir === 'asc' ? 1 : -1 },
    };
    const sort = sortMap[String(sortBy)] || sortMap.updatedAt;

    const [items, total] = await Promise.all([
      Product.find(query)
        .select('sku price stock category status images translations updatedAt')
        .sort(sort)
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      Product.countDocuments(query),
    ]);

    res.json({ items, page: p, limit: l, total, totalPages: Math.ceil(total / l) });
  } catch (e) {
    res.status(500).json({ error: 'catalog_list_failed' });
  }
});

// Public single product
router.get('/products/:id', async (req, res) => {
  try {
    const doc = await Product.findById(req.params.id)
      .select('sku price stock category status images translations updatedAt')
      .lean();
    if (!doc) return res.status(404).json({ error: 'not_found' });
    res.json(doc);
  } catch (e) {
    res.status(404).json({ error: 'not_found' });
  }
});

export default router;

