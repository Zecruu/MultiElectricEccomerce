"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cart = void 0;
const mongoose_1 = require("mongoose");
const CartItemSchema = new mongoose_1.Schema({
    productId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    imageUrl: { type: String },
}, { _id: false });
const CartSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', unique: true, index: true, required: true },
    items: { type: [CartItemSchema], default: [] },
}, { timestamps: true });
exports.Cart = mongoose_1.default.models.Cart || mongoose_1.default.model('Cart', CartSchema);
//# sourceMappingURL=Cart.js.map