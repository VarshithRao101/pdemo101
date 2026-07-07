import { Schema, model, Document } from 'mongoose';

export interface ITeacher extends Document {
  id: string; // e.g., FAC-201
  name: string;
  subject: string;
  mobile: string;
  salary: number;
  assignedClasses: string[];
  assignedSections: string[];
  assignedSubjects: string[];
  status: 'Active' | 'Inactive';
  tempPassword?: string;
  salaryStatus?: 'paid' | 'pending';
  salaryPaymentDate?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const TeacherSchema = new Schema<ITeacher>(
  {
    id: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    mobile: { type: String, trim: true },
    salary: { type: Number, required: true, min: 0, default: 0 },
    assignedClasses: { type: [String], default: [] },
    assignedSections: { type: [String], default: [] },
    assignedSubjects: { type: [String], default: [] },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active', required: true },
    tempPassword: { type: String },
    salaryStatus: { type: String, enum: ['paid', 'pending'], default: 'pending' },
    salaryPaymentDate: { type: String }
  },
  { timestamps: true }
);

export const Teacher = model<ITeacher>('Teacher', TeacherSchema);
