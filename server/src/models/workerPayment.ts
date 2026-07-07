import { Schema, model, Document } from 'mongoose';

export interface IWorkerPayment extends Document {
  workerName: string;
  role: string;
  amount: number;
  monthPeriod: string;
  paid: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const WorkerPaymentSchema = new Schema<IWorkerPayment>(
  {
    workerName: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    monthPeriod: { type: String, required: true, trim: true },
    paid: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

export const WorkerPayment = model<IWorkerPayment>('WorkerPayment', WorkerPaymentSchema);
