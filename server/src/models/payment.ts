import { Schema, model, Document } from 'mongoose';

export interface IFeePayment extends Document {
  receiptNumber: string;
  date: string;
  category: string;
  installment: string;
  amount: number;
  balance: number;
  mode: string;
  cashier: string;
  student: Schema.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const FeePaymentSchema = new Schema<IFeePayment>(
  {
    receiptNumber: { type: String, required: true, unique: true, trim: true },
    date: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    installment: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    balance: { type: Number, required: true, min: 0 },
    mode: { type: String, required: true, trim: true },
    cashier: { type: String, required: true, trim: true },
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  },
  { timestamps: true }
);

export const FeePayment = model<IFeePayment>('FeePayment', FeePaymentSchema);
