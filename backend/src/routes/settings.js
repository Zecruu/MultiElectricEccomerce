"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const AuditLog_1 = require("../models/AuditLog");
// NOTE: This router provides mock/sample data to unblock UI development.
// Data is in-memory and resets on server restart. Replace with a proper
// Settings model + persistence as needed.
const router = (0, express_1.Router)();
const storeInfo = {
    storeName: 'Multi Electric',
    legalName: 'Multi Electric LLC',
    phones: ['+1 (555) 123-4567'],
    emails: ['support@multielectric.test'],
    addresses: [{ line1: '123 Main St', city: 'Miami', state: 'FL', zip: '33101' }],
    hours: {
        mon: '9:00-18:00', tue: '9:00-18:00', wed: '9:00-18:00', thu: '9:00-18:00', fri: '9:00-18:00', sat: '10:00-14:00', sun: 'Closed'
    },
    pickupInstructions: 'Bring photo ID and your order number to the pickup desk.',
    returnPolicy: 'Returns accepted within 30 days for unused items in original packaging.'
};
const templates = {
    order_confirmation: {
        key: 'order_confirmation',
        name: 'Order confirmation',
        subject: { en: 'Your order {{orderNumber}}', es: 'Tu pedido {{orderNumber}}' },
        body: {
            en: 'Hi {{customerName}}, thanks for your order {{orderNumber}}. Total: {{total}}.',
            es: 'Hola {{customerName}}, gracias por tu pedido {{orderNumber}}. Total: {{total}}.'
        },
        versions: [],
    },
    ready_for_pickup: {
        key: 'ready_for_pickup',
        name: 'Ready for pickup',
        subject: { en: 'Order {{orderNumber}} is ready', es: 'Pedido {{orderNumber}} listo para recoger' },
        body: { en: 'Pickup code: {{pickupCode}}', es: 'Código de recogida: {{pickupCode}}' },
        versions: [],
    },
    status_update: {
        key: 'status_update',
        name: 'Status update',
        subject: { en: 'Order {{orderNumber}} update', es: 'Actualización pedido {{orderNumber}}' },
        body: { en: 'New status: {{status}}', es: 'Nuevo estado: {{status}}' },
        versions: [],
    },
    password_reset: {
        key: 'password_reset',
        name: 'Password reset',
        subject: { en: 'Reset your password', es: 'Restablecer contraseña' },
        body: { en: 'Click the link to reset.', es: 'Haz clic en el enlace para restablecer.' },
        versions: [],
    },
};
let webhooks = [
    { id: '1', name: 'Order events sink', url: 'https://example.test/webhooks', secret: '••••••', events: ['order.paid', 'order.ready'], status: 'healthy', lastDelivery: new Date().toISOString() },
];
let webhookDeliveries = [
    { id: 'd1', webhookId: '1', event: 'order.paid', status: 200, latencyMs: 120, retries: 0, createdAt: new Date().toISOString() },
];
let security = {
    passwordPolicy: { minLength: 8, requireSymbol: true, requireNumber: true, breachCheck: false },
    loginRateLimit: { attempts: 10, windowMinutes: 15 },
    sessions: { accessMinutes: 15, refreshDays: 14 },
    twoFA: { enabled: false },
};
let integrations = {
    stripe: { connected: false, account: null, lastCheck: null },
    email: { provider: 'smtp', connected: true, lastCheck: new Date().toISOString() },
    storage: { provider: 's3', connected: false, lastCheck: null },
};
// Helpers
function ensureAdmin(req) {
    if (req.user?.role !== 'admin') {
        const err = new Error('Forbidden');
        err.status = 403;
        throw err;
    }
}
// Store Info
router.get('/store', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('employee'), async (_req, res) => {
    res.json(storeInfo);
});
router.patch('/store', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    const before = { ...storeInfo };
    Object.assign(storeInfo, req.body || {});
    await AuditLog_1.AuditLog.create({ actorId: req.user.id, action: 'settings.store.update', before, after: storeInfo });
    res.json(storeInfo);
});
// Templates
router.get('/templates', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (_req, res) => {
    res.json(Object.values(templates));
});
router.patch('/templates/:key', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    const key = req.params.key;
    const t = templates[key];
    if (!t)
        return res.status(404).json({ error: 'Not found' });
    const before = { ...t };
    if (req.body?.subject)
        t.subject = req.body.subject;
    if (req.body?.body)
        t.body = req.body.body;
    // Versioning (keep last 5)
    t.versions = [{ subject: before.subject, body: before.body, at: new Date().toISOString() }, ...t.versions].slice(0, 5);
    await AuditLog_1.AuditLog.create({ actorId: req.user.id, action: 'settings.templates.update', targetId: key, before, after: { subject: t.subject, body: t.body } });
    res.json(t);
});
router.post('/templates/:key/test', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    const key = req.params.key;
    if (!templates[key])
        return res.status(404).json({ error: 'Not found' });
    await AuditLog_1.AuditLog.create({ actorId: req.user.id, action: 'settings.templates.send-test', targetId: key });
    res.json({ message: 'Test sent (mock)' });
});
// Webhooks
router.get('/webhooks', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (_req, res) => {
    res.json({ endpoints: webhooks, deliveries: webhookDeliveries.slice(-50) });
});
router.post('/webhooks', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    const id = String(Date.now());
    const item = { id, name: req.body?.name || 'New endpoint', url: req.body?.url, secret: '••••••', events: req.body?.events || [], status: 'unknown', lastDelivery: null };
    webhooks = [...webhooks, item];
    await AuditLog_1.AuditLog.create({ actorId: req.user.id, action: 'settings.webhooks.create', targetId: id, after: item });
    res.status(201).json(item);
});
router.patch('/webhooks/:id', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    const { id } = req.params;
    const idx = webhooks.findIndex(w => w.id === id);
    if (idx < 0)
        return res.status(404).json({ error: 'Not found' });
    const before = { ...webhooks[idx] };
    webhooks[idx] = { ...webhooks[idx], ...req.body, secret: '••••••' };
    await AuditLog_1.AuditLog.create({ actorId: req.user.id, action: 'settings.webhooks.update', targetId: id, before, after: webhooks[idx] });
    res.json(webhooks[idx]);
});
router.delete('/webhooks/:id', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    const { id } = req.params;
    const before = webhooks.find(w => w.id === id);
    if (!before)
        return res.status(404).json({ error: 'Not found' });
    webhooks = webhooks.filter(w => w.id !== id);
    await AuditLog_1.AuditLog.create({ actorId: req.user.id, action: 'settings.webhooks.delete', targetId: id, before });
    res.status(204).send();
});
router.post('/webhooks/:id/replay', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    const { id } = req.params;
    if (!webhooks.find(w => w.id === id))
        return res.status(404).json({ error: 'Not found' });
    const d = { id: 'd' + Date.now(), webhookId: id, event: 'manual.replay', status: 200, latencyMs: 100, retries: 0, createdAt: new Date().toISOString() };
    webhookDeliveries.push(d);
    await AuditLog_1.AuditLog.create({ actorId: req.user.id, action: 'settings.webhooks.replay', targetId: id, after: d });
    res.json({ message: 'Replay enqueued (mock)' });
});
// Security
router.get('/security', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (_req, res) => {
    res.json(security);
});
router.patch('/security', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    const before = { ...security };
    security = { ...security, ...(req.body || {}) };
    await AuditLog_1.AuditLog.create({ actorId: req.user.id, action: 'settings.security.update', before, after: security });
    res.json(security);
});
// Integrations
router.get('/integrations', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (_req, res) => {
    res.json(integrations);
});
router.patch('/integrations', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    const before = { ...integrations };
    integrations = { ...integrations, ...(req.body || {}) };
    await AuditLog_1.AuditLog.create({ actorId: req.user.id, action: 'settings.integrations.update', before, after: integrations });
    res.json(integrations);
});
router.post('/integrations/healthcheck', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    // Simulate a health check
    integrations.email.lastCheck = new Date().toISOString();
    await AuditLog_1.AuditLog.create({ actorId: req.user.id, action: 'settings.integrations.healthcheck' });
    res.json({ ok: true, integrations });
});
exports.default = router;
//# sourceMappingURL=settings.js.map