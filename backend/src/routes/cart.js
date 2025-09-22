"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const Cart_1 = require("../models/Cart");
const router = (0, express_1.Router)();
// Fetch user's cart
router.get('/', (0, auth_1.requireAuth)(), async (req, res) => {
    const cart = await Cart_1.Cart.findOne({ userId: req.user.id }).lean();
    res.json({ items: (cart === null || cart === void 0 ? void 0 : cart.items) || [] });
});
// Replace user's cart
router.put('/', (0, auth_1.requireAuth)(), async (req, res) => {
    var _a;
    const items = Array.isArray((_a = req.body) === null || _a === void 0 ? void 0 : _a.items) ? req.body.items : [];
    const cart = await Cart_1.Cart.findOneAndUpdate({ userId: req.user.id }, { $set: { items } }, { upsert: true, new: true });
    res.json({ ok: true, items: cart.items });
});
exports.default = router;
//# sourceMappingURL=cart.js.map