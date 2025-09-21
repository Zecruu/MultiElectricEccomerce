import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import csurf from 'csurf';
import { env } from './config/env';
import { connectMongo } from './db/mongoose';
import { Order } from './models/Order';
import authRouter from './routes/auth';
import meRouter from './routes/me';
import clientsRouter from './routes/clients';
import usersRouter from './routes/users';
import inventoryRouter from './routes/inventory';
import productsRouter from './routes/products';
import uploadsRouter from './routes/uploads';
import catalogRouter from './routes/catalog';
import ordersRouter from './routes/orders';
import cartRouter from './routes/cart';
import accountRouter from './routes/account';
import reportsRouter from './routes/reports';
import settingsRouter from './routes/settings';
import alertsRouter from './routes/alerts';
import stripeWebhookRouter from './routes/stripe_webhook';
import categoriesRouter from './routes/categories';
import { Category } from './models/Category';

import { networkInterfaces } from 'os';

function getLanIPv4(): string | null {
  try {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        const ni: any = net as any;
        if (ni?.family === 'IPv4' && !ni?.internal) return ni.address as string;
      }
    }
  } catch {}
  return null;
}

async function main() {
  await connectMongo();
  // Ensure default category exists
  try {
    const unc = await Category.findOne({ slug: 'uncategorized' }).lean();
    if (!unc) {
      await Category.create({ name: 'Uncategorized', description: 'Default category for uncategorized products' });
      console.log('Created default category: Uncategorized');
    }
  } catch (e) { console.log('Ensure default category failed', (e as any)?.message || e); }
  // Ensure orderNumber index is compatible (unique only when present)
  try {
    await Order.collection.dropIndex('orderNumber_1');
    console.log('Dropped existing index orderNumber_1');
  } catch (e: any) {
    if (e?.codeName === 'IndexNotFound') {
      console.log('No existing orderNumber_1 index to drop');
    } else if (e) {
      console.log('Skipping drop index orderNumber_1:', e?.message || e);
    }
  }
  try {
    await Order.collection.createIndex(
      { orderNumber: 1 },
      { unique: true, partialFilterExpression: { orderNumber: { $type: 'string' } } }
    );
    console.log('Created partial unique index on orderNumber');
  } catch (e) {
    console.log('Failed to create partial unique index on orderNumber', e);
  }
  // Backfill missing orderNumber for legacy orders
  try {
    const missing = await Order.find({ $or: [ { orderNumber: { $exists: false } }, { orderNumber: null } ] }).select('_id').lean();
    if (missing.length) {
      console.log(`Backfilling orderNumber for ${missing.length} legacy orders...`);
      for (const m of missing) {
        const code = `MES-${String(m._id).slice(-6).toUpperCase()}`;
        await Order.updateOne({ _id: m._id }, { $set: { orderNumber: code } });
      }
      console.log('Backfill complete.');
    }
  } catch (e) {
    console.log('Backfill orderNumber skipped/failed:', (e as any)?.message || e);
  }



  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());

  const isProd = env.NODE_ENV === 'production';
  // Respect proxy headers in Railway so secure cookies work
  app.set('trust proxy', 1);

  // CORS: support primary origin + optional additional origins and optional *.vercel.app wildcard
  const origins = [env.FRONTEND_ORIGIN, ...(env.CORS_ADDITIONAL_ORIGINS?.split(',').map(s=>s.trim()).filter(Boolean) || [])];
  const allowedOrigins = new Set(origins);
  const allowVercelWildcard = String((env.CORS_ALLOW_VERCEL_WILDCARD ?? '1')).toLowerCase() === '1';
  const vercelRe = /^https?:\/\/[a-z0-9-]+\.vercel\.app$/i;
  app.use(
    cors({
      credentials: true,
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.has(origin)) return callback(null, true);
        if (allowVercelWildcard && vercelRe.test(origin)) return callback(null, true);
        if (!isProd) {
          const ok = /^https?:\/\/(localhost|127\.0\.0\.1|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/i.test(origin);
          if (ok) return callback(null, true);
        }
        return callback(new Error('CORS: origin not allowed: ' + origin));
      },
    })
  );
  // Webhooks (raw body) — mount before JSON parsers and CSRF
  app.use('/api/webhooks', stripeWebhookRouter);


  // Increase JSON body limit to avoid 413 when clients accidentally send large arrays
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
  app.use('/api/auth', authLimiter);

  // CSRF: provide a token endpoint and protect state-changing routes
  const csrfProtection = csurf({ cookie: { httpOnly: true, sameSite: isProd ? (env.COOKIE_SAMESITE || 'none') : 'lax', secure: isProd, domain: env.COOKIE_DOMAIN } as any });
  app.get('/api/csrf-token', cookieParser(), csrfProtection, (req, res) => {
    res.json({ csrfToken: (req as any).csrfToken() });
  });

  // Apply CSRF protection to mutating requests
  app.use((req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    return (csrfProtection as any)(req, res, next);
  });

  // Health
  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // Routes
  app.use('/api/auth', authRouter);
  app.use('/api/me', meRouter);
  app.use('/api/clients', clientsRouter);
  app.use('/api/users', usersRouter);
  // Deprecated: /api/inventory (kept temporarily for compatibility)
  app.use('/api/inventory', inventoryRouter);
  // Standardized routes
  app.use('/api/products', productsRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/cart', cartRouter);
  app.use('/api/account', accountRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/categories', categoriesRouter);
  // Public catalog
  app.use('/api/catalog', catalogRouter);

  const port = parseInt(env.PORT, 10);
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

