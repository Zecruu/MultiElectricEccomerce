import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAuditLog extends Document {
  actorId: Types.ObjectId | null; // null for system
  action: string;
  targetType: string;
  targetId: string;
  diff?: Record<string, unknown> | null;
  ip?: string | null;
  createdAt: Date;
}

const schema = new Schema<IAuditLog>({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  action: { type: String, required: true },
  targetType: { type: String, required: true },
  targetId: { type: String, required: true },
  diff: { type: Schema.Types.Mixed, default: null },
  ip: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', schema);

