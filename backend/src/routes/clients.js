"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const User_1 = require("../models/User");
const AuditLog_1 = require("../models/AuditLog");
const router = (0, express_1.Router)();
// Employees and Admins: list clients (customers only) with search and pagination
router.get('/', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('employee'), async (req, res) => {
    const { q = '', page = '1', limit = '50', verified = '' } = req.query;
    const p = Math.max(parseInt(String(page), 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);
    const filter = { role: 'customer', deletedAt: null };
    if (String(verified) === 'true')
        filter.emailVerified = true;
    if (String(verified) === 'false')
        filter.emailVerified = false;
    const s = String(q || '').trim();
    if (s) {
        const esc = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [
            { name: { $regex: esc(s), $options: 'i' } },
            { email: { $regex: esc(s), $options: 'i' } },
        ];
    }
    const [items, total] = await Promise.all([
        User_1.User.find(filter).select('email name role lastLoginAt createdAt emailVerified').sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
        User_1.User.countDocuments(filter),
    ]);
    res.json({ items, page: p, limit: l, total, totalPages: Math.ceil(total / l) });
});
// Employees and Admins can trigger a reset email for a client
router.post('/:id/send-reset', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('employee'), async (req, res) => {
    const { id } = req.params;
    const client = await User_1.User.findById(id);
    if (!client || client.role !== 'customer')
        return res.status(404).json({ error: 'Not found' });
    // Issue reset token and email
    const { PasswordResetToken } = await import('../models/PasswordResetToken');
    const { sendEmail } = await import('../utils/email');
    const { env } = await import('../config/env');
    const { randomUUID } = await import('crypto');
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await PasswordResetToken.create({ userId: client._id, token, expiresAt });
    const resetUrl = `${env.APP_BASE_URL || env.FRONTEND_ORIGIN}/reset-password?token=${encodeURIComponent(token)}`;
    await sendEmail(client.email, 'Password reset requested', `Click to reset: <a href="${resetUrl}">${resetUrl}</a>`);
    await AuditLog_1.AuditLog.create({ actorId: req.user.id, action: 'client.send-reset', targetType: 'User', targetId: String(client._id) });
    res.json({ message: 'Reset email sent.' });
});
// Admin only: delete account (soft-delete for now)
router.delete('/:id', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    const { id } = req.params;
    const client = await User_1.User.findById(id);
    if (!client)
        return res.status(404).json({ error: 'Not found' });
    client.deletedAt = new Date();
    await client.save();
    await AuditLog_1.AuditLog.create({ actorId: req.user.id, action: 'client.delete', targetType: 'User', targetId: String(client._id) });
    res.json({ message: 'Account deleted' });
});
exports.default = router;
//# sourceMappingURL=clients.js.map