import mongoose, { Schema, InferSchemaType } from 'mongoose';

const CategorySchema = new Schema({
  name: { type: String, required: true, trim: true, unique: true },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
  description: { type: String, default: '' },
}, { timestamps: true });

CategorySchema.pre('validate', function(next){
  const doc: any = this as any;
  if (doc.name && !doc.slug){
    doc.slug = String(doc.name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

export type CategoryDoc = InferSchemaType<typeof CategorySchema> & { _id: any };
export const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

