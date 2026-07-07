import { Schema, model, Document } from 'mongoose';

export interface IExamResult extends Document {
  subject: string;
  testTitle: string;
  date: string;
  score: number;
  maxMarks: number;
  student: Schema.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const ExamResultSchema = new Schema<IExamResult>(
  {
    subject: { type: String, required: true, trim: true },
    testTitle: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    score: { type: Number, required: true, min: 0 },
    maxMarks: { type: Number, required: true, default: 300, min: 0 },
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  },
  { timestamps: true }
);

export const ExamResult = model<IExamResult>('ExamResult', ExamResultSchema);
