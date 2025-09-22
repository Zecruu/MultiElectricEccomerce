"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApp = getApp;
require("dotenv/config");
const express_1 = require("express");
const helmet_1 = require("helmet");
const cors_1 = require("cors");
const cookie_parser_1 = require("cookie-parser");
const express_rate_limit_1 = require("express-rate-limit");
const csurf_1 = require("csurf");
const env_1 = require("./config/env");
const mongoose_1 = require("./db/mongoose");
const Order_1 = require("./models/Order");
const Category_1 = require("./models/Category");
const auth_1 = require("./routes/auth");
const me_1 = require("./routes/me");
const clients_1 = require("./routes/clients");
const users_1 = require("./routes/users");
const inventory_1 = require("./routes/inventory");
const products_1 = require("./routes/products");
const uploads_1 = require("./routes/uploads");
const catalog_1 = require("./routes/catalog");
const orders_1 = require("./routes/orders");
const cart_1 = require("./routes/cart");
const account_1 = require("./routes/account");
const reports_1 = require("./routes/reports");
const settings_1 = require("./routes/settings");
const alerts_1 = require("./routes/alerts");
const stripe_webhook_1 = require("./routes/stripe_webhook");
// Global singletons to avoid re-initializing on each serverless invocation
const g = globalThis;
async function ensureDbAndIndexesOnce() {
    if (g.__me_app_inited)
        return;
    await (0, mongoose_1.connectMongo)();
    try {
        const unc = await Category_1.Category.findOne({ slug: 'uncategorized' }).lean();
        if (!unc) {
            await Category_1.Category.create({ name: 'Uncategorized', description: 'Default category for uncategorized products' });
            console.log('Created default category: Uncategorized');
        }
    }
    catch (e) {
        console.log('Ensure default category failed', (e === null || e === void 0 ? void 0 : e.message) || e);
    }
    try {
        // Make orderNumber unique only when present
        try {
            await Order_1.Order.collection.dropIndex('orderNumber_1');
        }
        catch (e) {
            if ((e === null || e === void 0 ? void 0 : e.codeName) !== 'IndexNotFound')
                console.log('Drop index note:', (e === null || e === void 0 ? void 0 : e.message) || e);
        }
        await Order_1.Order.collection.createIndex({ orderNumber: 1 }, { unique: true, partialFilterExpression: { orderNumber: { $type: 'string' } } });
    }
    catch (e) {
        console.log('Index create note:', (e === null || e === void 0 ? void 0 : e.message) || e);
    }
    try {
        const missing = await Order_1.Order.find({ $or: [{ orderNumber: { $exists: false } }, { orderNumber: null }] }).select('_id').lean();
        if (missing.length) {
            for (const m of missing) {
                const code = `MES-${String(m._id).slice(-6).toUpperCase()}`;
                await Order_1.Order.updateOne({ _id: m._id }, { $set: { orderNumber: code } });
            }
            console.log('Backfilled orderNumber for legacy orders');
        }
    }
    catch (e) {
        console.log('Backfill note:', (e === null || e === void 0 ? void 0 : e.message) || e);
    }
    g.__me_app_inited = true;
}
function createExpressApp() {
    var _a, _b;
    const app = (0, express_1.default)();
    app.disable('x-powered-by');
    app.use((0, helmet_1.default)());
    const isProd = env_1.env.NODE_ENV === 'production';
    app.set('trust proxy', 1);
    // CORS setup
    const origins = [env_1.env.FRONTEND_ORIGIN, ...(((_a = env_1.env.CORS_ADDITIONAL_ORIGINS) === null || _a === void 0 ? void 0 : _a.split(',').map(s => s.trim()).filter(Boolean)) || [])];
    const allowed = new Set(origins);
    const allowVercelWildcard = String(((_b = env_1.env.CORS_ALLOW_VERCEL_WILDCARD) !== null && _b !== void 0 ? _b : '1')).toLowerCase() === '1';
    const vercelRe = /^https?:\/\/[a-z0-9-]+\.vercel\.app$/i;
    app.use((0, cors_1.default)({
        credentials: true,
        origin: (origin, cb) => {
            if (!origin)
                return cb(null, true);
            if (allowed.has(origin))
                return cb(null, true);
            if (allowVercelWildcard && vercelRe.test(origin))
                return cb(null, true);
            if (!isProd) {
                const ok = /^https?:\/\/(localhost|127\.0\.0\.1|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/i.test(origin);
                if (ok)
                    return cb(null, true);
            }
            return cb(new Error('CORS: origin not allowed: ' + origin));
        },
    }));
    // Webhooks (raw body) — mount before JSON parse & CSRF
    app.use('/api/webhooks', stripe_webhook_1.default);
    // Parsers & cookies
    app.use(express_1.default.json({ limit: '2mb' }));
    app.use((0, cookie_parser_1.default)());
    const authLimiter = (0, express_rate_limit_1.default)({ windowMs: 15 * 60 * 1000, max: 100 });
    app.use('/api/auth', authLimiter);
    // CSRF token endpoint and protection for mutating routes
    const csrfProtection = (0, csurf_1.default)({ cookie: { httpOnly: true, sameSite: isProd ? (env_1.env.COOKIE_SAMESITE || 'none') : 'lax', secure: isProd, domain: env_1.env.COOKIE_DOMAIN } });
    app.get('/api/csrf-token', (0, cookie_parser_1.default)(), csrfProtection, (req, res) => {
        res.json({ csrfToken: req.csrfToken() });
    });
    app.use((req, res, next) => {
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method))
            return next();
        return csrfProtection(req, res, next);
    });
    // Health
    app.get('/api/health', (_req, res) => res.json({ ok: true }));
    // Routes
    app.use('/api/auth', auth_1.default);
    app.use('/api/me', me_1.default);
    app.use('/api/clients', clients_1.default);
    app.use('/api/users', users_1.default);
    app.use('/api/inventory', inventory_1.default);
    app.use('/api/products', products_1.default);
    app.use('/api/uploads', uploads_1.default);
    app.use('/api/orders', orders_1.default);
    app.use('/api/cart', cart_1.default);
    app.use('/api/account', account_1.default);
    app.use('/api/reports', reports_1.default);
    app.use('/api/settings', settings_1.default);
    app.use('/api/alerts', alerts_1.default);
    app.use('/api/categories', categoriesRouter);
    app.use('/api/catalog', catalog_1.default);
    return app;
}
async function getApp() {
    if (!g.__me_app) {
        await ensureDbAndIndexesOnce();
        g.__me_app = createExpressApp();
    }
    return g.__me_app;
}
//# sourceMappingURL=app.js.map