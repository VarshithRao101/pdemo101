import { Schema, model, Document } from 'mongoose';

export interface ISecurityKey extends Document {
  role: 'accountant' | 'admin2' | 'admin1' | 'admin3';
  key: string;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const SecurityKeySchema = new Schema<ISecurityKey>(
  {
    role: {
      type: String,
      enum: ['accountant', 'admin2', 'admin1', 'admin3'],
      required: true,
      unique: true
    },
    key: { type: String, required: true },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

export const SecurityKey = model<ISecurityKey>('SecurityKey', SecurityKeySchema);
