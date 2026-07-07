import { Schema, model, Document } from 'mongoose';

export interface IExpenditure extends Document {
  category: string;
  amount: number;
  date: Date;
  description: string;
  recordedBy: Schema.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const ExpenditureSchema = new Schema<IExpenditure>(
  {
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    description: { type: String, required: true, trim: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Expenditure = model<IExpenditure>('Expenditure', ExpenditureSchema);
