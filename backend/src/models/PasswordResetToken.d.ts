import mongoose, { Document, Types } from 'mongoose';
export interface IPasswordResetToken extends Document {
    userId: Types.ObjectId;
    token: string;
    expiresAt: Date;
    usedAt?: Date | null;
    createdAt: Date;
}
export declare const PasswordResetToken: mongoose.Model<any, {}, {}, {}, any, any> | mongoose.Model<IPasswordResetToken, {}, {}, {}, mongoose.Document<unknown, {}, IPasswordResetToken, {}, {}> & IPasswordResetToken & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=PasswordResetToken.d.ts.map