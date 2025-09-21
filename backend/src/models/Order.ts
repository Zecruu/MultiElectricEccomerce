import mongoose, { Document, Schema, Types } from 'mongoose';

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'shipped' | 'completed';

export interface IOrderItem {
  productId: Types.ObjectId;
  sku: string;
  name: string;
  price: number; // unit price at purchase time
  qty: number;
  imageUrl?: string;
}

export interface IAddress {
  name: string; // full name
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
  publicToken: string; // to allow guests to view confirmation page
  orderNumber: string; // unique human/reference identifier
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  sku: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  qty: { type: Number, required: true, min: 1 },
  imageUrl: { type: String },
}, { _id: false });

const AddressSchema = new Schema<IAddress>({
  name: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String },
  zip: { type: String },
  country: { type: String },
  phone: { type: String },
}, { _id: false });

const OrderSchema = new Schema<IOrder>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  email: { type: String, required: true, index: true },
  items: { type: [OrderItemSchema], required: true },
  subtotal: { type: Number, required: true },
  tax: { type: Number, required: true },
  shipping: { type: Number, required: true },
  total: { type: Number, required: true },
  payment: {
    method: { type: String, enum: ['cod', 'card', 'mock'], default: 'mock' },
    paidAt: { type: Date, default: null },
    reference: { type: String, default: null },
  },
  shippingAddress: { type: AddressSchema, required: true },
  status: { type: String, enum: ['pending', 'paid', 'failed', 'cancelled', 'shipped', 'completed'], default: 'pending', index: true },
  publicToken: { type: String, required: true, index: true },
  orderNumber: { type: String, required: true, unique: true, index: true },
}, { timestamps: true });

export const Order = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

