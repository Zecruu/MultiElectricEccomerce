import { Router } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { AuditLog } from '../models/AuditLog';
import { Types } from 'mongoose';

const router = Router();

function parseRange(q: any) {
  const now = new Date();
  const to = q.to ? new Date(String(q.to)) : now;
  const from = q.from ? new Date(String(q.from)) : new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
  // normalize
  const fromNorm = new Date(from);
  fromNorm.setHours(0,0,0,0);
  const toNorm = new Date(to);
  toNorm.setHours(23,59,59,999);
  return { from: fromNorm, to: toNorm };
}

async function ensureAudit(req: AuthRequest, section: string) {
  try {
    await AuditLog.create({
      actorId: req.user ? new Types.ObjectId(req.user.id) as any : null,
      action: 'admin.report.view',
      targetType: 'Report',
      targetId: section,
      ip: (req.headers['x-forwarded-for'] as string) || req.ip || null,
    });
  } catch {}
}

// GET /api/reports/sales?from=&to=&category=&employee=&page=&limit=
router.get('/sales', requireAuth(), requireRole('admin'), async (req: AuthRequest, res) => {
  await ensureAudit(req, 'sales');
  const { from, to } = parseRange(req.query);
  const { category = '', employee = '', page = '1', limit = '50' } = req.query as any;

  const p = Math.max(parseInt(String(page), 10) || 1, 1);
  const l = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);

  // Build base filter
  const filter: any = { createdAt: { $gte: from, $lte: to } };

  // Category filter via items.productId
  let productIdSet: Set<string> | null = null;
  if (category) {
    const prods = await Product.find({ category: String(category) }).select('_id').lean();
    productIdSet = new Set(prods.map(p => String(p._id)));
    if (productIdSet.size === 0) {
      // No products in category => no results
      return res.json({
        kpis: { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, activeCustomers: 0, topProduct: null },
        series: [],
        orders: { items: [], page: p, limit: l, total: 0, totalPages: 0 },
        notes: { employeeFilterApplied: false },
      });
    }
    filter['items.productId'] = { $in: Array.from(productIdSet).map(id => new Types.ObjectId(id)) };
  }

  // Employee filter: not tracked yet in orders; placeholder only
  const employeeFilterApplied = !!employee;

  // Load orders for KPIs & series (cap at some max for performance; for KPIs we can aggregate)
  const [orders, totalCount] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((p-1)*l).limit(l).lean(),
    Order.countDocuments(filter),
  ]);

  // KPIs computed over full filtered dataset (not only the current page)
  const allOrders = await Order.find(filter).select('total email items createdAt').lean();
  const totalRevenue = allOrders.reduce((s, o: any) => s + (o.total || 0), 0);
  const totalOrders = allOrders.length;
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
  const activeCustomers = new Set(allOrders.map((o: any) => (o.email || '').toLowerCase())).size;
  // Top product by quantity
  const qtyBySku = new Map<string, { name: string; qty: number }>();
  for (const o of allOrders) {
    for (const it of (o.items || [])) {
      const prev = qtyBySku.get(it.sku) || { name: it.name, qty: 0 };
      prev.qty += it.qty || 0;
      qtyBySku.set(it.sku, prev);
    }
  }
  let topProduct: any = null;
  for (const [sku, v] of qtyBySku.entries()) {
    if (!topProduct || v.qty > topProduct.qty) topProduct = { sku, name: v.name, qty: v.qty };
  }

  // Series (by day revenue)
  const dayMap = new Map<string, { revenue: number; orders: number }>();
  for (const o of allOrders) {
    const d = new Date(o.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const cur = dayMap.get(key) || { revenue: 0, orders: 0 };
    cur.revenue += o.total || 0;
    cur.orders += 1;
    dayMap.set(key, cur);
  }
  const series = Array.from(dayMap.entries()).sort((a,b)=>a[0] < b[0] ? -1 : 1).map(([date, v])=>({ date, revenue: v.revenue, orders: v.orders }));

  res.json({
    kpis: { totalRevenue, totalOrders, avgOrderValue, activeCustomers, topProduct },
    series,
    orders: { items: orders, page: p, limit: l, total: totalCount, totalPages: Math.ceil(totalCount/l) },
    notes: { employeeFilterApplied },
  });
});

// GET /api/reports/inventory?from=&to=&category=
router.get('/inventory', requireAuth(), requireRole('admin'), async (req: AuthRequest, res) => {
  await ensureAudit(req, 'inventory');
  const { category = '' } = req.query as any;
  const filter: any = {};
  if (category) filter.category = String(category);

  const products = await Product.find(filter).select('sku category price stock lowStockThreshold status translations').lean();
  const low = products.filter((p: any) => (p.stock || 0) <= (p.lowStockThreshold || 0));
  const out = products.filter((p: any) => (p.stock || 0) <= 0);
  const byCat = new Map<string, number>();
  for (const p of products) {
    const cur = byCat.get(p.category) || 0;
    byCat.set(p.category, cur + (p.stock || 0));
  }
  const categoryPie = Array.from(byCat.entries()).map(([category, stock]) => ({ category, stock }));
  res.json({
    lowStock: low,
    outOfStock: out,
    categoryPie,
    totalProducts: products.length,
  });
});

// GET /api/reports/customers?from=&to=
router.get('/customers', requireAuth(), requireRole('admin'), async (req: AuthRequest, res) => {
  await ensureAudit(req, 'customers');
  const { from, to } = parseRange(req.query);
  const filter: any = { createdAt: { $gte: from, $lte: to } };

  const orders = await Order.find(filter).select('email total createdAt').lean();
  // Determine if a customer is "new" in this window
  const emails = Array.from(new Set(orders.map((o: any) => (o.email || '').toLowerCase())));
  let newCount = 0, returningCount = 0;
  for (const e of emails) {
    const first = await Order.findOne({ email: e }).sort({ createdAt: 1 }).select('createdAt').lean();
    if (first && first.createdAt >= from && first.createdAt <= to) newCount++; else returningCount++;
  }
  // Top customers (by value and orders) within range
  const byEmail = new Map<string, { email: string; orders: number; value: number }>();
  for (const o of orders) {
    const key = (o.email || '').toLowerCase();
    const cur = byEmail.get(key) || { email: key, orders: 0, value: 0 };
    cur.orders += 1;
    cur.value += (o.total || 0);
    byEmail.set(key, cur);
  }
  const top = Array.from(byEmail.values()).sort((a,b)=> b.value - a.value).slice(0, 50);

  res.json({ newCustomers: newCount, returningCustomers: returningCount, topCustomers: top });
});

// GET /api/reports/employees?from=&to=
router.get('/employees', requireAuth(), requireRole('admin'), async (req: AuthRequest, res) => {
  await ensureAudit(req, 'employees');
  // Not tracked yet in orders. Return placeholder.
  res.json({ items: [], note: 'Employee performance tracking not implemented yet.' });
});

export default router;

