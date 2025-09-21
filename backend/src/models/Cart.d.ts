import mongoose, { Document, Types } from 'mongoose';
export interface ICartItem {
    productId: Types.ObjectId;
    sku: string;
    name: string;
    price: number;
    qty: number;
    imageUrl?: string;
}
export interface ICart extends Document {
    userId: Types.ObjectId;
    items: ICartItem[];
    updatedAt: Date;
}
export declare const Cart: mongoose.Model<any, {}, {}, {}, any, any> | mongoose.Model<ICart, {}, {}, {}, mongoose.Document<unknown, {}, ICart, {}, {}> & ICart & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Cart.d.ts.map