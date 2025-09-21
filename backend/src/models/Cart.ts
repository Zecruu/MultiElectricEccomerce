import mongoose, { Document, Schema, Types } from 'mongoose';

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

const CartItemSchema = new Schema<ICartItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  sku: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  qty: { type: Number, required: true, min: 1 },
  imageUrl: { type: String },
}, { _id: false });

const CartSchema = new Schema<ICart>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', unique: true, index: true, required: true },
  items: { type: [CartItemSchema], default: [] },
}, { timestamps: true });

export const Cart = mongoose.models.Cart || mongoose.model<ICart>('Cart', CartSchema);

