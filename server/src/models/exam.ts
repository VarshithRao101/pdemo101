import { Schema, model, Document } from 'mongoose';

export interface IExam extends Document {
  id: string; // e.g. EX-1
  name: string;
  date: string;
  class: string;
  status: 'Scheduled' | 'Results Published';
  resultsPublished: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ExamSchema = new Schema<IExam>(
  {
    id: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    class: { type: String, required: true, default: 'Junior MPC', trim: true },
    status: { type: String, enum: ['Scheduled', 'Results Published'], default: 'Scheduled', required: true },
    resultsPublished: { type: Boolean, default: false, required: true }
  },
  { timestamps: true }
);

export const Exam = model<IExam>('Exam', ExamSchema);
