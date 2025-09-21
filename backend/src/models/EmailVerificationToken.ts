import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IEmailVerificationToken extends Document {
  userId: Types.ObjectId;
  token: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

const schema = new Schema<IEmailVerificationToken>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

export const EmailVerificationToken = mongoose.models.EmailVerificationToken ||
  mongoose.model<IEmailVerificationToken>('EmailVerificationToken', schema);

