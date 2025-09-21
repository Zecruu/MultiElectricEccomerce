"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const bcrypt_1 = __importDefault(require("bcrypt"));
const auth_1 = require("../middleware/auth");
const User_1 = require("../models/User");
const AuditLog_1 = require("../models/AuditLog");
const router = (0, express_1.Router)();
router.get('/', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (_req, res) => {
    const users = await User_1.User.find({ deletedAt: null }).select('name email role createdAt lastLoginAt emailVerified');
    res.json({ users });
});
router.post('/', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    const schema = zod_1.z.object({ name: zod_1.z.string().min(1), email: zod_1.z.string().email(), role: zod_1.z.enum(['customer', 'employee', 'admin']), password: zod_1.z.string().min(8) });
    const parse = schema.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json({ error: 'Invalid input' });
    const { name, email, role, password } = parse.data;
    const exists = await User_1.User.findOne({ email: email.toLowerCase(), deletedAt: null });
    if (exists)
        return res.status(409).json({ error: 'Email already in use' });
    const passwordHash = await bcrypt_1.default.hash(password, 12);
    const user = await User_1.User.create({ name, email: email.toLowerCase(), role, passwordHash, emailVerified: true });
    await AuditLog_1.AuditLog.create({ actorId: req.user.id, action: 'admin.user.create', targetType: 'User', targetId: String(user._id) });
    res.status(201).json({ id: user._id });
});
router.patch('/:id', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    const schema = zod_1.z.object({ name: zod_1.z.string().min(1).optional(), email: zod_1.z.string().email().optional() });
    const parse = schema.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json({ error: 'Invalid input' });
    const { id } = req.params;
    const user = await User_1.User.findById(id);
    if (!user)
        return res.status(404).json({ error: 'Not found' });
    if (parse.data.name !== undefined)
        user.name = parse.data.name;
    if (parse.data.email !== undefined) {
        const emailLower = parse.data.email.toLowerCase();
        const exists = await User_1.User.findOne({ email: emailLower, deletedAt: null, _id: { $ne: id } });
        if (exists)
            return res.status(409).json({ error: 'Email already in use' });
        user.email = emailLower;
    }
    await user.save();
    await AuditLog_1.AuditLog.create({ actorId: req.user.id, action: 'admin.user.update', targetType: 'User', targetId: String(user._id) });
    res.json({ message: 'Updated' });
});
router.patch('/:id/role', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    const schema = zod_1.z.object({ role: zod_1.z.enum(['customer', 'employee', 'admin']) });
    const parse = schema.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json({ error: 'Invalid input' });
    const { id } = req.params;
    const user = await User_1.User.findById(id);
    if (!user)
        return res.status(404).json({ error: 'Not found' });
    user.role = parse.data.role;
    await user.save();
    await AuditLog_1.AuditLog.create({ actorId: req.user.id, action: 'admin.user.set-role', targetType: 'User', targetId: String(user._id), diff: { role: parse.data.role } });
    res.json({ message: 'Role updated' });
});
// Admin: reset user password
router.post('/:id/reset-password', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    const schema = zod_1.z.object({ password: zod_1.z.string().min(8) });
    const parse = schema.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json({ error: 'Invalid input' });
    const { id } = req.params;
    const user = await User_1.User.findById(id);
    if (!user)
        return res.status(404).json({ error: 'Not found' });
    user.passwordHash = await bcrypt_1.default.hash(parse.data.password, 12);
    // Invalidate existing refresh tokens
    user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1;
    await user.save();
    await AuditLog_1.AuditLog.create({ actorId: req.user.id, action: 'admin.user.reset-password', targetType: 'User', targetId: String(user._id) });
    res.json({ message: 'Password reset' });
});
// Admin: delete (soft-delete) user
router.delete('/:id', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (req, res) => {
    const { id } = req.params;
    const user = await User_1.User.findById(id);
    if (!user)
        return res.status(404).json({ error: 'Not found' });
    user.deletedAt = new Date();
    await user.save();
    await AuditLog_1.AuditLog.create({ actorId: req.user.id, action: 'admin.user.delete', targetType: 'User', targetId: String(user._id) });
    res.json({ message: 'Deleted' });
});
exports.default = router;
//# sourceMappingURL=users.js.map