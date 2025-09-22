"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = void 0;
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({
    actorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    diff: { type: mongoose_1.Schema.Types.Mixed, default: null },
    ip: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
});
exports.AuditLog = mongoose_1.default.models.AuditLog || mongoose_1.default.model('AuditLog', schema);
//# sourceMappingURL=AuditLog.js.map