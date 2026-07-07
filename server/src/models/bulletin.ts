import { Schema, model, Document } from 'mongoose';

export interface IBulletin extends Document {
  id: string; // e.g., BUL-001
  category: 'announcement' | 'gallery' | 'event' | 'circular' | 'notice' | 'holiday';
  title: string;
  date: string;
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const BulletinSchema = new Schema<IBulletin>(
  {
    id: { type: String, unique: true, sparse: true, trim: true },
    category: {
      type: String,
      enum: ['announcement', 'gallery', 'event', 'circular', 'notice', 'holiday'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export const Bulletin = model<IBulletin>('Bulletin', BulletinSchema);
