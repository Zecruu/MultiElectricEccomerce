"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product = void 0;
const mongoose_1 = require("mongoose");
const ImageSchema = new mongoose_1.Schema({
    url: { type: String, required: true },
    alt: { type: String },
    primary: { type: Boolean, default: false },
}, { _id: false });
const TranslationSchema = new mongoose_1.Schema({
    name: { type: String, default: '' },
    description: { type: String, default: '' },
}, { _id: false });
const ProductSchema = new mongoose_1.Schema({
    sku: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true, default: 'uncategorized', trim: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 },
    lowStockThreshold: { type: Number },
    status: { type: String, enum: ['draft', 'active', 'hidden', 'out_of_stock'], default: 'active' },
    featured: { type: Boolean, default: false },
    translations: {
        en: { type: TranslationSchema, default: () => ({}) },
        es: { type: TranslationSchema, default: () => ({}) },
    },
    images: { type: [ImageSchema], default: [] },
    stripeProductId: { type: String },
    stripePriceId: { type: String },
}, { timestamps: true });
exports.Product = mongoose_1.default.models.Product || mongoose_1.default.model('Product', ProductSchema);
//# sourceMappingURL=Product.js.map