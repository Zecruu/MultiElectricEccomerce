"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth = __importStar(require("../middleware/auth"));
const Order_1 = require("../models/Order");
const Product_1 = require("../models/Product");
const crypto_1 = require("crypto");
const mongoose_1 = require("mongoose");
const stripe_1 = require("../utils/stripe");
const alerts_1 = require("../services/alerts");
const { requireAuth, requireRole } = auth;
const optionalAuthFn = auth.optionalAuth;
const SAFE_OPTIONAL = (typeof optionalAuthFn === 'function') ? optionalAuthFn() : ((_req, _res, next) => next());
const router = (0, express_1.Router)();
console.log('Orders router (TS) loaded');
// List current user's orders
router.get('/', requireAuth(), async (req, res) => {
    const orders = await Order_1.Order.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ orders });
});
// Public fetch for confirmation page via token
router.get('/public/:id', async (req, res) => {
    const id = req.params.id;
    const t = String(req.query.t || '');
    const doc = await Order_1.Order.findById(id).lean();
    if (!doc)
        return res.status(404).json({ error: 'Not found' });
    if (!t || t !== doc.publicToken)
        return res.status(403).json({ error: 'Forbidden' });
    res.json(doc);
});
// Employee/Admin: list all orders with optional status filter and search (q)
router.get('/admin', requireAuth(), requireRole('employee'), async (_req, res) => {
    const { status = '', page = '1', limit = '50', q: search = '' } = _req.query;
    const p = Math.max(parseInt(String(page), 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);
    // Build filter
    const filter = {};
    if (status)
        filter.status = status;
    const s = String(search || '').trim();
    if (s) {
        const esc = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const ors = [
            { orderNumber: { $regex: esc(s), $options: 'i' } },
            { email: { $regex: esc(s), $options: 'i' } },
            { 'shippingAddress.name': { $regex: esc(s), $options: 'i' } },
        ];
        // Phone flexible matching: match digits in order allowing non-digits between
        const digits = s.replace(/\D+/g, '');
        if (digits.length >= 3) {
            const flexible = digits.split('').join('\\D*');
            ors.push({ 'shippingAddress.phone': { $regex: flexible, $options: 'i' } });
        }
        else {
            ors.push({ 'shippingAddress.phone': { $regex: esc(s), $options: 'i' } });
        }
        filter.$or = ors;
    }
    const [items, total] = await Promise.all([
        Order_1.Order.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
        Order_1.Order.countDocuments(filter),
    ]);
    res.json({ items, page: p, limit: l, total, totalPages: Math.ceil(total / l) });
});
// Employee/Admin: get details for one order
router.get('/admin/:id', requireAuth(), requireRole('employee'), async (req, res) => {
    const doc = await Order_1.Order.findById(req.params.id).lean();
    if (!doc)
        return res.status(404).json({ error: 'Not found' });
    res.json(doc);
});
// Employee/Admin: update order status
const UpdateStatusInput = zod_1.z.object({ status: zod_1.z.enum(['pending', 'paid', 'failed', 'cancelled', 'shipped', 'completed']) });
router.patch('/admin/:id', requireAuth(), requireRole('employee'), async (req, res) => {
    const parse = UpdateStatusInput.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json({ error: 'Invalid input', issues: parse.error.issues });
    const nextStatus = parse.data.status;
    const updated = await Order_1.Order.findByIdAndUpdate(req.params.id, {
        $set: {
            status: nextStatus,
            'payment.paidAt': nextStatus === 'paid' ? new Date() : undefined,
        }
    }, { new: true }).lean();
    if (!updated)
        return res.status(404).json({ error: 'Not found' });
    res.json(updated);
});
const ItemInput = zod_1.z.object({ productId: zod_1.z.string(), qty: zod_1.z.number().int().min(1) });
const AddressInput = zod_1.z.object({
    name: zod_1.z.string().min(2).max(120),
    street: zod_1.z.string().min(3).max(200),
    city: zod_1.z.string().min(2).max(120),
    state: zod_1.z.string().optional(),
    zip: zod_1.z.string().optional(),
    country: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
});
const CreateOrderInput = zod_1.z.object({
    items: zod_1.z.array(ItemInput).min(1),
    email: zod_1.z.string().email(),
    shippingAddress: AddressInput,
    paymentMethod: zod_1.z.enum(['mock', 'card', 'cod']).default('mock'),
});
// Create order (guest or logged-in). CSRF protected globally.
router.post('/', SAFE_OPTIONAL, async (req, res) => {
    try {
        const parse = CreateOrderInput.safeParse(req.body);
        if (!parse.success)
            return res.status(400).json({ error: 'Invalid input', issues: parse.error.issues });
        const { items, email, shippingAddress, paymentMethod } = parse.data;
        console.log('Checkout request:', {
            itemsCount: items.length,
            itemIdsSample: items.slice(0, 3).map(i => i.productId),
            hasEmail: !!email,
            hasAddress: !!shippingAddress?.name && !!shippingAddress?.street && !!shippingAddress?.city,
            method: paymentMethod,
        });
        console.log('Checkout validation: validating product IDs');
        // Load products to price and validate
        const ids = items.map(i => i.productId);
        const invalidId = ids.find(id => !mongoose_1.Types.ObjectId.isValid(String(id)));
        if (invalidId) {
            console.warn('Invalid productId in checkout:', invalidId);
            return res.status(400).json({ error: 'Invalid productId', invalidId });
        }
        const products = await Product_1.Product.find({ _id: { $in: ids } }).lean();
        if (products.length !== ids.length) {
            return res.status(400).json({ error: 'One or more products are invalid or unavailable' });
        }
        const productMap = new Map(products.map(p => [String(p._id), p]));
        const orderItems = items.map(i => {
            const p = productMap.get(i.productId);
            if (!p)
                throw new Error('Product not found');
            return {
                productId: p._id,
                sku: p.sku,
                name: (p.translations?.es?.name || p.translations?.en?.name || p.sku),
                price: p.price,
                qty: i.qty,
                imageUrl: p.images?.[0]?.url,
            };
        });
        const subtotal = orderItems.reduce((s, it) => s + it.price * it.qty, 0);
        const tax = 0; // extend later
        const shipping = 0; // pickup default
        const total = subtotal + tax + shipping;
        const publicToken = (0, crypto_1.randomUUID)();
        // Pre-generate ObjectId so we can derive a consistent human order number
        const _id = new mongoose_1.Types.ObjectId();
        const derivedNumber = `MES-${String(_id).slice(-6).toUpperCase()}`;
        const basePayment = { method: paymentMethod };
        if (paymentMethod === 'mock') {
            basePayment.paidAt = new Date();
            basePayment.reference = 'mock_' + publicToken;
        }
        const toCreate = {
            _id,
            userId: req.user?.id || null,
            email,
            items: orderItems,
            subtotal, tax, shipping, total,
            payment: basePayment,
            shippingAddress,
            status: paymentMethod === 'mock' ? 'paid' : 'pending',
            publicToken,
            orderNumber: derivedNumber,
        };
        console.log('Creating order doc:', { orderNumber: toCreate.orderNumber, publicToken: toCreate.publicToken, subtotal: toCreate.subtotal, items: toCreate.items.length });
        const order = await Order_1.Order.create(toCreate);
        let clientSecret;
        if (paymentMethod === 'card') {
            const stripe = (0, stripe_1.getStripe)();
            if (!stripe) {
                console.warn('Stripe not configured: STRIPE_SECRET_KEY missing');
            }
            else {
                const pi = await stripe.paymentIntents.create({
                    amount: Math.round(total * 100),
                    currency: 'usd',
                    metadata: { orderId: String(order._id), orderNumber: order.orderNumber, email },
                    automatic_payment_methods: { enabled: true },
                });
                clientSecret = pi.client_secret || undefined;
                await Order_1.Order.findByIdAndUpdate(order._id, { $set: { 'payment.reference': pi.id } });
            }
        }
        // Push real-time alert for employees
        try {
            (0, alerts_1.push)({
                id: String(order._id),
                type: 'order',
                title: `New order ${order.orderNumber}`,
                detail: `${order.items.length} items • $${order.total.toFixed(2)}`,
                at: new Date().toISOString(),
                orderId: String(order._id),
                orderNumber: order.orderNumber,
                amount: order.total,
                customerName: order.shippingAddress?.name,
            });
        }
        catch (e) { /* noop */ }
        res.status(201).json({ id: order._id, orderNumber: order.orderNumber, publicToken, total, clientSecret });
    }
    catch (err) {
        console.error('Checkout error:', err?.stack || err);
        return res.status(500).json({ error: 'Internal error during checkout' });
    }
});
// Get one (authenticated owner)
router.get('/:id', requireAuth(), async (req, res) => {
    const doc = await Order_1.Order.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!doc)
        return res.status(404).json({ error: 'Not found' });
    res.json(doc);
});
exports.default = router;
//# sourceMappingURL=orders.js.map