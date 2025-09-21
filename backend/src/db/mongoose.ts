import mongoose from 'mongoose';
import { env } from '../config/env';

export async function connectMongo() {
  if (mongoose.connection.readyState === 1) return;
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGO_URI);
}

