"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('admin'), async (_req, res) => {
    // Placeholder inventory list
    res.json({ items: [] });
});
exports.default = router;
//# sourceMappingURL=inventory.js.map