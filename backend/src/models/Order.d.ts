import mongoose, { Document, Types } from 'mongoose';
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'shipped' | 'completed';
export interface IOrderItem {
    productId: Types.ObjectId;
    sku: string;
    name: string;
    price: number;
    qty: number;
    imageUrl?: string;
}
export interface IAddress {
    name: string;
    street: string;
    city: string;
    state?: string;
    zip?: string;
    country?: string;
    phone?: string;
}
export interface IOrder extends Document {
    userId?: Types.ObjectId | null;
    email: string;
    items: IOrderItem[];
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    payment: {
        method: 'cod' | 'card' | 'mock';
        paidAt?: Date | null;
        reference?: string | null;
    };
    shippingAddress: IAddress;
    status: OrderStatus;
    publicToken: string;
    orderNumber: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Order: mongoose.Model<any, {}, {}, {}, any, any> | mongoose.Model<IOrder, {}, {}, {}, mongoose.Document<unknown, {}, IOrder, {}, {}> & IOrder & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Order.d.ts.map