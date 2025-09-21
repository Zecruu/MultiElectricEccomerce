import mongoose, { Document } from 'mongoose';
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
        language?: 'es' | 'en';
        emailNotifications?: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
}
export declare const User: mongoose.Model<any, {}, {}, {}, any, any> | mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=User.d.ts.map