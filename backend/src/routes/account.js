"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const bcrypt_1 = require("bcrypt");
const auth_1 = require("../middleware/auth");
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
// Fetch current settings
router.get('/settings', (0, auth_1.requireAuth)(), async (req, res) => {
    var _a, _b, _c;
    const user = await User_1.User.findById(req.user.id).lean();
    if (!user)
        return res.status(404).json({ error: 'Not found' });
    return res.json({
        profile: { name: user.name, email: user.email },
        preferences: { language: ((_a = user.preferences) === null || _a === void 0 ? void 0 : _a.language) || 'es', emailNotifications: (_c = (_b = user.preferences) === null || _b === void 0 ? void 0 : _b.emailNotifications) !== null && _c !== void 0 ? _c : true },
        sessions: [{ id: 'current', device: req.headers['user-agent'] || 'Unknown', current: true, lastActiveAt: new Date() }],
        addresses: [], // stub for now
        paymentMethods: [], // stub for now
    });
});
// Update profile (name/email)
router.patch('/profile', (0, auth_1.requireAuth)(), async (req, res) => {
    const schema = zod_1.z.object({ name: zod_1.z.string().min(1).max(120).optional(), email: zod_1.z.string().email().optional() }).refine(v => v.name !== undefined || v.email !== undefined, { message: 'Nothing to update' });
    const parse = schema.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json({ error: 'Invalid input', issues: parse.error.issues });
    const user = await User_1.User.findById(req.user.id);
    if (!user)
        return res.status(404).json({ error: 'Not found' });
    if (parse.data.name !== undefined)
        user.name = parse.data.name;
    if (parse.data.email !== undefined) {
        const emailLower = parse.data.email.toLowerCase();
        const exists = await User_1.User.findOne({ email: emailLower, deletedAt: null, _id: { $ne: user._id } });
        if (exists)
            return res.status(409).json({ error: 'Email already in use' });
        user.email = emailLower;
    }
    await user.save();
    res.json({ message: 'Updated' });
});
// Change password
router.post('/password', (0, auth_1.requireAuth)(), async (req, res) => {
    const schema = zod_1.z.object({ currentPassword: zod_1.z.string().min(1), newPassword: zod_1.z.string().min(8).max(200) });
    const parse = schema.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json({ error: 'Invalid input', issues: parse.error.issues });
    const user = await User_1.User.findById(req.user.id);
    if (!user)
        return res.status(404).json({ error: 'Not found' });
    const ok = await bcrypt_1.default.compare(parse.data.currentPassword, user.passwordHash);
    if (!ok)
        return res.status(401).json({ error: 'Current password incorrect' });
    user.passwordHash = await bcrypt_1.default.hash(parse.data.newPassword, 12);
    user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1; // revoke refresh tokens
    await user.save();
    res.json({ message: 'Password changed' });
});
// Preferences
router.patch('/preferences', (0, auth_1.requireAuth)(), async (req, res) => {
    const schema = zod_1.z.object({ language: zod_1.z.enum(['es', 'en']).optional(), emailNotifications: zod_1.z.boolean().optional() }).refine(v => v.language !== undefined || v.emailNotifications !== undefined, { message: 'Nothing to update' });
    const parse = schema.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json({ error: 'Invalid input', issues: parse.error.issues });
    const user = await User_1.User.findById(req.user.id);
    if (!user)
        return res.status(404).json({ error: 'Not found' });
    user.preferences = user.preferences || {};
    if (parse.data.language !== undefined)
        user.preferences.language = parse.data.language;
    if (parse.data.emailNotifications !== undefined)
        user.preferences.emailNotifications = parse.data.emailNotifications;
    await user.save();
    res.json({ message: 'Updated', preferences: user.preferences });
});
// Sessions list (stub)
router.get('/sessions', (0, auth_1.requireAuth)(), async (req, res) => {
    res.json({ sessions: [{ id: 'current', device: req.headers['user-agent'] || 'Unknown', current: true, lastActiveAt: new Date() }] });
});
// Revoke all other sessions (stateless -> bump token version)
router.post('/sessions/revoke-all', (0, auth_1.requireAuth)(), async (req, res) => {
    const user = await User_1.User.findById(req.user.id);
    if (!user)
        return res.status(404).json({ error: 'Not found' });
    user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1;
    await user.save();
    res.json({ message: 'Revoked' });
});
// Privacy export request (stub)
router.post('/privacy/export', (0, auth_1.requireAuth)(), async (_req, res) => {
    res.status(202).json({ message: 'Export requested. You will receive an email when ready.' });
});
// Delete account (soft delete + revoke)
router.delete('/', (0, auth_1.requireAuth)(), async (req, res) => {
    const user = await User_1.User.findById(req.user.id);
    if (!user)
        return res.status(404).json({ error: 'Not found' });
    user.deletedAt = new Date();
    user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1;
    await user.save();
    res.json({ message: 'Account deleted' });
});
exports.default = router;
//# sourceMappingURL=account.js.map