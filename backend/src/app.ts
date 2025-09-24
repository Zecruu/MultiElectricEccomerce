
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import csurf from 'csurf';
import { env } from './config/env';
import { connectMongo } from './db/mongoose';
import { Order } from './models/Order';
import { Category } from './models/Category';

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

// Global singletons to avoid re-initializing on each serverless invocation
const g = globalThis as unknown as {
  __me_app?: express.Express;
  __me_app_inited?: boolean;
};

async function ensureDbAndIndexesOnce() {
  if (g.__me_app_inited) return;
  await connectMongo();
  try {
    const unc = await Category.findOne({ slug: 'uncategorized' }).lean();
    if (!unc) {
      await Category.create({ name: 'Uncategorized', description: 'Default category for uncategorized products' });
      console.log('Created default category: Uncategorized');
    }
  } catch (e) {
    console.log('Ensure default category failed', (e as any)?.message || e);
  }
  try {
    // Make orderNumber unique only when present
    try {
      await Order.collection.dropIndex('orderNumber_1');
    } catch (e: any) {
      if (e?.codeName !== 'IndexNotFound') console.log('Drop index note:', e?.message || e);
    }
    await Order.collection.createIndex(
      { orderNumber: 1 },
      { unique: true, partialFilterExpression: { orderNumber: { $type: 'string' } } }
    );
  } catch (e) {
    console.log('Index create note:', (e as any)?.message || e);
  }
  try {
    const missing = await Order.find({ $or: [{ orderNumber: { $exists: false } }, { orderNumber: null }] }).select('_id').lean();
    if (missing.length) {
      for (const m of missing) {
        const code = `MES-${String(m._id).slice(-6).toUpperCase()}`;
        await Order.updateOne({ _id: m._id }, { $set: { orderNumber: code } });
      }
      console.log('Backfilled orderNumber for legacy orders');
    }
  } catch (e) {
    console.log('Backfill note:', (e as any)?.message || e);
  }
  g.__me_app_inited = true;
}

function createExpressApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());

  const isProd = env.NODE_ENV === 'production';
  app.set('trust proxy', 1);

  // CORS setup
  const origins = [env.FRONTEND_ORIGIN, ...(env.CORS_ADDITIONAL_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || [])];
  const allowed = new Set(origins);
  const allowVercelWildcard = String((env.CORS_ALLOW_VERCEL_WILDCARD ?? '1')).toLowerCase() === '1';
  const vercelRe = /^https?:\/\/[a-z0-9-]+\.vercel\.app$/i;
  app.use(
    cors({
      credentials: true,
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (allowed.has(origin)) return cb(null, true);
        if (allowVercelWildcard && vercelRe.test(origin)) return cb(null, true);
        if (!isProd) {
          const ok = /^https?:\/\/(localhost|127\.0\.0\.1|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/i.test(origin);
          if (ok) return cb(null, true);
        }
        return cb(new Error('CORS: origin not allowed: ' + origin));
      },
    })
  );

  // Webhooks (raw body) — mount before JSON parse & CSRF
  app.use('/api/webhooks', stripeWebhookRouter);

  // Parsers & cookies
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
  app.use('/api/auth', authLimiter);

  // CSRF token endpoint and protection for mutating routes
  const csrfProtection = csurf({ cookie: { httpOnly: true, sameSite: isProd ? (env.COOKIE_SAMESITE || 'none') : 'lax', secure: isProd, domain: env.COOKIE_DOMAIN } as any });
  app.get('/api/csrf-token', cookieParser(), csrfProtection, (req, res) => {
    res.json({ csrfToken: (req as any).csrfToken() });
  });
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
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/cart', cartRouter);
  app.use('/api/account', accountRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/catalog', catalogRouter);

  return app;
}

export async function getApp(): Promise<express.Express> {
  if (!g.__me_app) {
    await ensureDbAndIndexesOnce();
    g.__me_app = createExpressApp();
  }
  return g.__me_app;
}

