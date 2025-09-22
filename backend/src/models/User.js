"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const userSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    role: { type: String, enum: ['customer', 'employee', 'admin'], default: 'customer', index: true },
    passwordHash: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    oauthProvider: { type: String },
    oauthSub: { type: String },
    refreshTokenVersion: { type: Number, default: 0 },
    preferences: {
        language: { type: String, enum: ['es', 'en'], default: 'es' },
        emailNotifications: { type: Boolean, default: true },
    },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });
exports.User = mongoose_1.default.models.User || mongoose_1.default.model('User', userSchema);
//# sourceMappingURL=User.js.map