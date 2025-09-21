import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'customer' | 'employee' | 'admin';

export interface IUser extends Document {
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  emailVerified: boolean;
  lastLoginAt?: Date;
  oauthProvider?: string;
  oauthSub?: string;
  refreshTokenVersion: number;
  preferences?: {
    language?: 'es'|'en';
    emailNotifications?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

const userSchema = new Schema<IUser>(
  {
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
      language: { type: String, enum: ['es','en'], default: 'es' },
      emailNotifications: { type: Boolean, default: true },
    } as any,
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

