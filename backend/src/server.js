"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const csurf_1 = __importDefault(require("csurf"));
const env_1 = require("./config/env");
const mongoose_1 = require("./db/mongoose");
const Order_1 = require("./models/Order");
const auth_1 = __importDefault(require("./routes/auth"));
const me_1 = __importDefault(require("./routes/me"));
const clients_1 = __importDefault(require("./routes/clients"));
const users_1 = __importDefault(require("./routes/users"));
const inventory_1 = __importDefault(require("./routes/inventory"));
const products_1 = __importDefault(require("./routes/products"));
const uploads_1 = __importDefault(require("./routes/uploads"));
const catalog_1 = __importDefault(require("./routes/catalog"));
const orders_1 = __importDefault(require("./routes/orders"));
const cart_1 = __importDefault(require("./routes/cart"));
const account_1 = __importDefault(require("./routes/account"));
const reports_1 = __importDefault(require("./routes/reports"));
const settings_1 = __importDefault(require("./routes/settings"));
const alerts_1 = __importDefault(require("./routes/alerts"));
const stripe_webhook_1 = __importDefault(require("./routes/stripe_webhook"));
const categories_1 = __importDefault(require("./routes/categories"));
const Category_1 = require("./models/Category");
const os_1 = require("os");
function getLanIPv4() {
    try {
        const nets = (0, os_1.networkInterfaces)();
        for (const name of Object.keys(nets)) {
            for (const net of nets[name] || []) {
                const ni = net;
                if (ni?.family === 'IPv4' && !ni?.internal)
                    return ni.address;
            }
        }
    }
    catch { }
    return null;
}
async function main() {
    await (0, mongoose_1.connectMongo)();
    // Ensure default category exists
    try {
        const unc = await Category_1.Category.findOne({ slug: 'uncategorized' }).lean();
        if (!unc) {
            await Category_1.Category.create({ name: 'Uncategorized', description: 'Default category for uncategorized products' });
            console.log('Created default category: Uncategorized');
        }
    }
    catch (e) {
        console.log('Ensure default category failed', e?.message || e);
    }
    // Ensure orderNumber index is compatible (unique only when present)
    try {
        await Order_1.Order.collection.dropIndex('orderNumber_1');
        console.log('Dropped existing index orderNumber_1');
    }
    catch (e) {
        if (e?.codeName === 'IndexNotFound') {
            console.log('No existing orderNumber_1 index to drop');
        }
        else if (e) {
            console.log('Skipping drop index orderNumber_1:', e?.message || e);
        }
    }
    try {
        await Order_1.Order.collection.createIndex({ orderNumber: 1 }, { unique: true, partialFilterExpression: { orderNumber: { $type: 'string' } } });
        console.log('Created partial unique index on orderNumber');
    }
    catch (e) {
        console.log('Failed to create partial unique index on orderNumber', e);
    }
    // Backfill missing orderNumber for legacy orders
    try {
        const missing = await Order_1.Order.find({ $or: [{ orderNumber: { $exists: false } }, { orderNumber: null }] }).select('_id').lean();
        if (missing.length) {
            console.log(`Backfilling orderNumber for ${missing.length} legacy orders...`);
            for (const m of missing) {
                const code = `MES-${String(m._id).slice(-6).toUpperCase()}`;
                await Order_1.Order.updateOne({ _id: m._id }, { $set: { orderNumber: code } });
            }
            console.log('Backfill complete.');
        }
    }
    catch (e) {
        console.log('Backfill orderNumber skipped/failed:', e?.message || e);
    }
    const app = (0, express_1.default)();
    app.disable('x-powered-by');
    app.use((0, helmet_1.default)());
    const isProd = env_1.env.NODE_ENV === 'production';
    // Respect proxy headers in Railway so secure cookies work
    app.set('trust proxy', 1);
    // CORS: support primary origin + optional additional origins and optional *.vercel.app wildcard
    const origins = [env_1.env.FRONTEND_ORIGIN, ...(env_1.env.CORS_ADDITIONAL_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || [])];
    const allowedOrigins = new Set(origins);
    const allowVercelWildcard = String((env_1.env.CORS_ALLOW_VERCEL_WILDCARD ?? '1')).toLowerCase() === '1';
    const vercelRe = /^https?:\/\/[a-z0-9-]+\.vercel\.app$/i;
    app.use((0, cors_1.default)({
        credentials: true,
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (allowedOrigins.has(origin))
                return callback(null, true);
            if (allowVercelWildcard && vercelRe.test(origin))
                return callback(null, true);
            if (!isProd) {
                const ok = /^https?:\/\/(localhost|127\.0\.0\.1|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/i.test(origin);
                if (ok)
                    return callback(null, true);
            }
            return callback(new Error('CORS: origin not allowed: ' + origin));
        },
    }));
    // Webhooks (raw body) — mount before JSON parsers and CSRF
    app.use('/api/webhooks', stripe_webhook_1.default);
    // Increase JSON body limit to avoid 413 when clients accidentally send large arrays
    app.use(express_1.default.json({ limit: '2mb' }));
    app.use((0, cookie_parser_1.default)());
    const authLimiter = (0, express_rate_limit_1.default)({ windowMs: 15 * 60 * 1000, max: 100 });
    app.use('/api/auth', authLimiter);
    // CSRF: provide a token endpoint and protect state-changing routes
    const csrfProtection = (0, csurf_1.default)({ cookie: { httpOnly: true, sameSite: isProd ? (env_1.env.COOKIE_SAMESITE || 'none') : 'lax', secure: isProd, domain: env_1.env.COOKIE_DOMAIN } });
    app.get('/api/csrf-token', (0, cookie_parser_1.default)(), csrfProtection, (req, res) => {
        res.json({ csrfToken: req.csrfToken() });
    });
    // Apply CSRF protection to mutating requests
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
    // Deprecated: /api/inventory (kept temporarily for compatibility)
    app.use('/api/inventory', inventory_1.default);
    // Standardized routes
    app.use('/api/products', products_1.default);
    app.use('/api/uploads', uploads_1.default);
    app.use('/api/orders', orders_1.default);
    app.use('/api/cart', cart_1.default);
    app.use('/api/account', account_1.default);
    app.use('/api/reports', reports_1.default);
    app.use('/api/settings', settings_1.default);
    app.use('/api/alerts', alerts_1.default);
    app.use('/api/categories', categories_1.default);
    // Public catalog
    app.use('/api/catalog', catalog_1.default);
    const port = parseInt(env_1.env.PORT, 10);
    app.listen(port, '0.0.0.0', () => {
        const ip = getLanIPv4();
        console.log('Backend listening:');
        console.log(`- Local:   http://localhost:${port}`);
        console.log(`- Network: ${ip ? `http://${ip}:${port}` : 'unavailable'}`);
        console.log(`- All IFs: http://0.0.0.0:${port}`);
    });
}
main().catch((err) => {
    console.error('Fatal startup error', err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map