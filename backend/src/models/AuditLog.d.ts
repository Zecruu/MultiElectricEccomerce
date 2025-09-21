import mongoose, { Document, Types } from 'mongoose';
export interface IAuditLog extends Document {
    actorId: Types.ObjectId | null;
    action: string;
    targetType: string;
    targetId: string;
    diff?: Record<string, unknown> | null;
    ip?: string | null;
    createdAt: Date;
}
export declare const AuditLog: mongoose.Model<any, {}, {}, {}, any, any> | mongoose.Model<IAuditLog, {}, {}, {}, mongoose.Document<unknown, {}, IAuditLog, {}, {}> & IAuditLog & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=AuditLog.d.ts.map