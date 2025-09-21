"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product = void 0;
const mongoose_1 = __importStar(require("mongoose"));
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