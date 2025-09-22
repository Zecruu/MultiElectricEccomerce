"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const Product_1 = require("../models/Product");
const stripe_1 = require("../utils/stripe");
const Category_1 = require("../models/Category");
async function isValidCategory(input) {
    const v = String(input || '').trim();
    if (!v)
        return false;
    const found = await Category_1.Category.exists({ $or: [{ slug: v.toLowerCase() }, { name: v }] });
    return !!found;
}
const router = (0, express_1.Router)();
// List with filters and pagination
router.get('/', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('employee'), async (req, res) => {
    const { query = '', status = '', category = '', page = '1', limit = '20', sortBy = 'updatedAt', sortDir = 'desc' } = req.query;
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const q = {};
    if (status)
        q.status = status;
    if (category)
        q.category = category;
    if (query) {
        const rx = new RegExp(String(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        q.$or = [
            { sku: rx },
            { 'translations.en.name': rx },
            { 'translations.es.name': rx },
            { category: rx },
        ];
    }
    const sortMap = {
        updatedAt: { updatedAt: sortDir === 'asc' ? 1 : -1 },
        price: { price: sortDir === 'asc' ? 1 : -1 },
        stock: { stock: sortDir === 'asc' ? 1 : -1 },
        sku: { sku: sortDir === 'asc' ? 1 : -1 },
    };
    const sort = sortMap[String(sortBy)] || sortMap.updatedAt;
    const [items, total] = await Promise.all([
        Product_1.Product.find(q).sort(sort).skip((p - 1) * l).limit(l).lean(),
        Product_1.Product.countDocuments(q),
    ]);
    res.json({ items, page: p, limit: l, total, totalPages: Math.ceil(total / l) });
});
// Get one
router.get('/:id', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('employee'), async (req, res) => {
    const doc = await Product_1.Product.findById(req.params.id).lean();
    if (!doc)
        return res.status(404).json({ error: 'Not found' });
    res.json(doc);
});
// Create (admin only)
router.post('/', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    var _a, _b;
    try {
        const body = req.body || {};
        if (typeof body.price !== 'number' || body.price < 0)
            return res.status(400).json({ error: 'Invalid price' });
        if (typeof body.stock !== 'number' || body.stock < 0)
            return res.status(400).json({ error: 'Invalid stock' });
        if (!body.sku || !body.category)
            return res.status(400).json({ error: 'Missing sku/category' });
        if (!(await isValidCategory(body.category)))
            return res.status(400).json({ error: 'Invalid category' });
        // Force all products to be active
        body.status = 'active';
        const doc = await Product_1.Product.create(body);
        // Stripe sync (best-effort)
        const stripe = (0, stripe_1.getStripe)();
        if (stripe) {
            try {
                const sp = await stripe.products.create({
                    name: ((_b = (_a = body.translations) === null || _a === void 0 ? void 0 : _a.en) === null || _b === void 0 ? void 0 : _b.name) || body.sku,
                    active: true,
                    metadata: { sku: body.sku, productId: String(doc._id) },
                });
                const unitAmount = Math.round(Number(body.price) * 100);
                const pr = await stripe.prices.create({ currency: 'usd', unit_amount: unitAmount, product: sp.id, active: true });
                await Product_1.Product.findByIdAndUpdate(doc._id, { stripeProductId: sp.id, stripePriceId: pr.id });
                doc.stripeProductId = sp.id;
                doc.stripePriceId = pr.id;
            }
            catch (e) {
                console.error('Stripe sync (create) failed', e);
                // do not fail creation
            }
        }
        return res.status(201).json(doc);
    }
    catch (e) {
        if ((e === null || e === void 0 ? void 0 : e.code) === 11000)
            return res.status(409).json({ error: 'Duplicate SKU' });
        return res.status(400).json({ error: 'Bad request' });
    }
});
// Full update (admin only)
router.put('/:id', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    var _a, _b;
    try {
        const body = req.body || {};
        if (typeof body.price !== 'number' || body.price < 0)
            return res.status(400).json({ error: 'Invalid price' });
        if (typeof body.stock !== 'number' || body.stock < 0)
            return res.status(400).json({ error: 'Invalid stock' });
        // Force active status
        body.status = 'active';
        if (typeof body.category !== 'undefined') {
            if (!(await isValidCategory(body.category)))
                return res.status(400).json({ error: 'Invalid category' });
        }
        const doc = await Product_1.Product.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
        if (!doc)
            return res.status(404).json({ error: 'Not found' });
        const stripe = (0, stripe_1.getStripe)();
        if (stripe) {
            try {
                // Ensure product exists
                let spId = doc.stripeProductId;
                if (!spId) {
                    const sp = await stripe.products.create({ name: ((_b = (_a = doc.translations) === null || _a === void 0 ? void 0 : _a.en) === null || _b === void 0 ? void 0 : _b.name) || doc.sku, active: true, metadata: { sku: doc.sku, productId: String(doc._id) } });
                    spId = sp.id;
                }
                // Ensure product is active in Stripe
                await stripe.products.update(spId, { active: true });
                // Create new price if price changed
                if (typeof body.price === 'number') {
                    const unitAmount = Math.round(Number(doc.price) * 100);
                    const pr = await stripe.prices.create({ currency: 'usd', unit_amount: unitAmount, product: spId, active: true });
                    await Product_1.Product.findByIdAndUpdate(doc._id, { stripeProductId: spId, stripePriceId: pr.id });
                    doc.stripeProductId = spId;
                    doc.stripePriceId = pr.id;
                }
            }
            catch (e) {
                console.error('Stripe sync (put) failed', e);
            }
        }
        res.json(doc);
    }
    catch (e) {
        if ((e === null || e === void 0 ? void 0 : e.code) === 11000)
            return res.status(409).json({ error: 'Duplicate SKU' });
        return res.status(400).json({ error: 'Bad request' });
    }
});
// Partial update (admin; allow employee to patch stock only)
router.patch('/:id', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('employee'), async (req, res) => {
    var _a, _b;
    const isAdmin = req.user.role === 'admin';
    const body = req.body || {};
    // If not admin, only allow { stock }
    if (!isAdmin) {
        const keys = Object.keys(body);
        if (keys.length !== 1 || !keys.includes('stock'))
            return res.status(403).json({ error: 'Forbidden' });
        if (typeof body.stock !== 'number' || body.stock < 0)
            return res.status(400).json({ error: 'Invalid stock' });
    }
    if (isAdmin && typeof body.category !== 'undefined') {
        if (!(await isValidCategory(body.category)))
            return res.status(400).json({ error: 'Invalid category' });
    }
    if (typeof body.price !== 'undefined' && (typeof body.price !== 'number' || body.price < 0))
        return res.status(400).json({ error: 'Invalid price' });
    // Force active status always
    body.status = 'active';
    const updated = await Product_1.Product.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!updated)
        return res.status(404).json({ error: 'Not found' });
    const stripe = (0, stripe_1.getStripe)();
    if (stripe && isAdmin) {
        try {
            let spId = updated.stripeProductId;
            if (!spId) {
                const sp = await stripe.products.create({ name: ((_b = (_a = updated.translations) === null || _a === void 0 ? void 0 : _a.en) === null || _b === void 0 ? void 0 : _b.name) || updated.sku, active: true, metadata: { sku: updated.sku, productId: String(updated._id) } });
                spId = sp.id;
            }
            await stripe.products.update(spId, { active: true });
            if (typeof body.price === 'number') {
                const unitAmount = Math.round(Number(updated.price) * 100);
                const pr = await stripe.prices.create({ currency: 'usd', unit_amount: unitAmount, product: spId, active: true });
                await Product_1.Product.findByIdAndUpdate(updated._id, { stripeProductId: spId, stripePriceId: pr.id });
            }
        }
        catch (e) {
            console.error('Stripe sync (patch) failed', e);
        }
    }
    res.json(updated);
});
// Delete (admin only)
router.delete('/:id', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    const doc = await Product_1.Product.findByIdAndDelete(req.params.id);
    if (!doc)
        return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
});
exports.default = router;
//# sourceMappingURL=products.js.map