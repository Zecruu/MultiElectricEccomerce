import mongoose, { Schema, InferSchemaType } from 'mongoose';

const ImageSchema = new Schema({
  url: { type: String, required: true },
  alt: { type: String },
  primary: { type: Boolean, default: false },
}, { _id: false });

const TranslationSchema = new Schema({
  name: { type: String, default: '' },
  description: { type: String, default: '' },
}, { _id: false });

const ProductSchema = new Schema({
  sku: { type: String, required: true, unique: true, index: true },
  category: { type: String, required: true, default: 'uncategorized', trim: true },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0 },
  lowStockThreshold: { type: Number },
  status: { type: String, enum: ['draft','active','hidden','out_of_stock'], default: 'active' },
  featured: { type: Boolean, default: false },
  translations: {
    en: { type: TranslationSchema, default: () => ({}) },
    es: { type: TranslationSchema, default: () => ({}) },
  },
  images: { type: [ImageSchema], default: [] },
  stripeProductId: { type: String },
  stripePriceId: { type: String },
}, { timestamps: true });

export type ProductDoc = InferSchemaType<typeof ProductSchema> & { _id: any };

export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

