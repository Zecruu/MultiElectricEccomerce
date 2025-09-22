"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Category = void 0;
const mongoose_1 = require("mongoose");
const CategorySchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    description: { type: String, default: '' },
}, { timestamps: true });
CategorySchema.pre('validate', function (next) {
    const doc = this;
    if (doc.name && !doc.slug) {
        doc.slug = String(doc.name)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    next();
});
exports.Category = mongoose_1.default.models.Category || mongoose_1.default.model('Category', CategorySchema);
//# sourceMappingURL=Category.js.map