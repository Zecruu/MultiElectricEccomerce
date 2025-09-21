"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const Category_1 = require("../models/Category");
const Product_1 = require("../models/Product");
const router = (0, express_1.Router)();
// Utility: count products for a category by matching either slug or name
async function productCountForCategory(cat) {
    const name = String(cat.name || '');
    const slug = String(cat.slug || '').toLowerCase();
    const $or = [];
    if (name)
        $or.push({ category: name });
    if (slug)
        $or.push({ category: slug });
    if ($or.length === 0)
        return 0;
    return await Product_1.Product.countDocuments({ $or });
}
// List categories with product counts (employees and admins can see)
router.get('/', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('employee'), async (_req, res) => {
    const cats = await Category_1.Category.find({}).sort({ name: 1 }).lean();
    const withCounts = await Promise.all(cats.map(async (c) => ({ ...c, productCount: await productCountForCategory(c) })));
    res.json({ items: withCounts });
});
// Create (admin)
router.post('/', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    try {
        const { name, description = '' } = req.body || {};
        if (!name || typeof name !== 'string')
            return res.status(400).json({ error: 'invalid_name' });
        const doc = await Category_1.Category.create({ name, description });
        res.status(201).json(doc);
    }
    catch (e) {
        if (e?.code === 11000)
            return res.status(409).json({ error: 'duplicate' });
        res.status(400).json({ error: 'bad_request' });
    }
});
// Update (admin)
router.patch('/:id', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    try {
        const { name, description } = req.body || {};
        const update = {};
        if (typeof name === 'string' && name.trim())
            update.name = name.trim();
        if (typeof description === 'string')
            update.description = description;
        const doc = await Category_1.Category.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
        if (!doc)
            return res.status(404).json({ error: 'not_found' });
        res.json(doc);
    }
    catch (e) {
        if (e?.code === 11000)
            return res.status(409).json({ error: 'duplicate' });
        res.status(400).json({ error: 'bad_request' });
    }
});
// Delete (admin) with product handling
router.delete('/:id', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    const cat = await Category_1.Category.findById(req.params.id).lean();
    if (!cat)
        return res.status(404).json({ error: 'not_found' });
    const count = await productCountForCategory(cat);
    const action = (req.body?.action || req.query?.action || '').toString();
    const toId = (req.body?.to || req.query?.to || '').toString();
    if (count > 0 && !action) {
        return res.status(409).json({ error: 'has_products', products: count, requireAction: true });
    }
    if (count > 0 && action === 'reassign') {
        if (!toId)
            return res.status(400).json({ error: 'missing_target' });
        const target = await Category_1.Category.findById(toId).lean();
        if (!target)
            return res.status(400).json({ error: 'invalid_target' });
        if (String(target._id) === String(cat._id))
            return res.status(400).json({ error: 'same_target' });
        const $or = [];
        if (cat.name)
            $or.push({ category: cat.name });
        if (cat.slug)
            $or.push({ category: cat.slug });
        await Product_1.Product.updateMany({ $or }, { $set: { category: target.slug || target.name } });
    }
    else if (count > 0 && action === 'delete') {
        const $or = [];
        if (cat.name)
            $or.push({ category: cat.name });
        if (cat.slug)
            $or.push({ category: cat.slug });
        await Product_1.Product.deleteMany({ $or });
    }
    await Category_1.Category.deleteOne({ _id: cat._id });
    res.json({ ok: true });
});
// Usage info (admin)
router.get('/:id/usage', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    const cat = await Category_1.Category.findById(req.params.id).lean();
    if (!cat)
        return res.status(404).json({ error: 'not_found' });
    const products = await productCountForCategory(cat);
    res.json({ products });
});
exports.default = router;
//# sourceMappingURL=categories.js.map