"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetToken = void 0;
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
});
exports.PasswordResetToken = mongoose_1.default.models.PasswordResetToken ||
    mongoose_1.default.model('PasswordResetToken', schema);
//# sourceMappingURL=PasswordResetToken.js.map