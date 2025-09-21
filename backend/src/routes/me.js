"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
router.get('/', (0, auth_1.requireAuth)(), async (req, res) => {
    const user = await User_1.User.findById(req.user.id);
    if (!user)
        return res.status(404).json({ error: 'Not found' });
    const isAdmin = user.role === 'admin';
    const isEmployee = user.role === 'employee';
    const perms = {
        // existing
        canManageProducts: isAdmin,
        canEditStock: isAdmin || isEmployee,
        canManageUsers: isAdmin,
        // settings RBAC
        canManageStoreSettings: isAdmin,
        canManageEmailTemplates: isAdmin,
        canManageWebhooks: isAdmin,
        canManageSecurity: isAdmin,
        canManageIntegrations: isAdmin,
        canViewStoreSettings: isAdmin || isEmployee, // configurable later
    };
    return res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: perms,
        lastLoginAt: user.lastLoginAt,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
    });
});
exports.default = router;
//# sourceMappingURL=me.js.map