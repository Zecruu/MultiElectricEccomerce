import mongoose, { Document, Types } from 'mongoose';
export interface IEmailVerificationToken extends Document {
    userId: Types.ObjectId;
    token: string;
    expiresAt: Date;
    usedAt?: Date | null;
    createdAt: Date;
}
export declare const EmailVerificationToken: mongoose.Model<any, {}, {}, {}, any, any> | mongoose.Model<IEmailVerificationToken, {}, {}, {}, mongoose.Document<unknown, {}, IEmailVerificationToken, {}, {}> & IEmailVerificationToken & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=EmailVerificationToken.d.ts.map