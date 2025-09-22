"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Order = void 0;
const mongoose_1 = require("mongoose");
const OrderItemSchema = new mongoose_1.Schema({
    productId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    imageUrl: { type: String },
}, { _id: false });
const AddressSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String },
    zip: { type: String },
    country: { type: String },
    phone: { type: String },
}, { _id: false });
const OrderSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    email: { type: String, required: true, index: true },
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    shipping: { type: Number, required: true },
    total: { type: Number, required: true },
    payment: {
        method: { type: String, enum: ['cod', 'card', 'mock'], default: 'mock' },
        paidAt: { type: Date, default: null },
        reference: { type: String, default: null },
    },
    shippingAddress: { type: AddressSchema, required: true },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'cancelled', 'shipped', 'completed'], default: 'pending', index: true },
    publicToken: { type: String, required: true, index: true },
    orderNumber: { type: String, required: true, unique: true, index: true },
}, { timestamps: true });
exports.Order = mongoose_1.default.models.Order || mongoose_1.default.model('Order', OrderSchema);
//# sourceMappingURL=Order.js.map