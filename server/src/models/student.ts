import { Schema, model, Document } from 'mongoose';

export interface IStudent extends Document {
  admissionNumber: string;
  studentId: string;
  qrId: string;
  registrationNumber: string;
  name: string;
  fatherName: string;
  motherName: string;
  mobile: string;
  parentMobile: string;
  email: string;
  address: string;
  residentialAddress: string;
  hostelStatus: 'Resident' | 'Day Scholar';
  transportStatus: 'College Bus' | 'Self Transport';
  hostelBlock?: string;
  hostelRoom?: string;
  course: string;
  section: string;
  branch: string;
  rollNumber: string;
  status: 'Active' | 'Inactive';
  documents: string[];
  tuitionFee: number;
  hostelFee: number;
  transportFee: number;
  miscellaneousFee: number;
  previousPending: number;
  totalPaid: number;
  remainingBalance: number;
  receipts: Schema.Types.ObjectId[];
  scholarshipCategory?: 'Merit' | 'Sports' | 'None';
  tuitionWaiver?: number;
  hostelWaiver?: number;
  transportWaiver?: number;
  miscWaiver?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    admissionNumber: { type: String, required: true, unique: true, trim: true },
    studentId: { type: String, required: true, unique: true, trim: true },
    qrId: { type: String, required: true, trim: true },
    registrationNumber: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    fatherName: { type: String, trim: true },
    motherName: { type: String, trim: true },
    mobile: { type: String, trim: true },
    parentMobile: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'Please enter a valid email address'],
    },
    address: { type: String, trim: true },
    residentialAddress: { type: String, trim: true },
    hostelStatus: { type: String, enum: ['Resident', 'Day Scholar'], required: true },
    transportStatus: { type: String, enum: ['College Bus', 'Self Transport'], required: true },
    hostelBlock: { type: String, trim: true },
    hostelRoom: { type: String, trim: true },
    course: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
    branch: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, unique: true, trim: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active', required: true },
    documents: { type: [String], default: [] },
    tuitionFee: { type: Number, required: true, min: 0, default: 0 },
    hostelFee: { type: Number, required: true, min: 0, default: 0 },
    transportFee: { type: Number, required: true, min: 0, default: 0 },
    miscellaneousFee: { type: Number, required: true, min: 0, default: 0 },
    previousPending: { type: Number, required: true, min: 0, default: 0 },
    totalPaid: { type: Number, required: true, min: 0, default: 0 },
    remainingBalance: { type: Number, required: true, min: 0, default: 0 },
    receipts: [{ type: Schema.Types.ObjectId, ref: 'FeePayment' }],
    scholarshipCategory: { type: String, enum: ['Merit', 'Sports', 'None'], default: 'None' },
    tuitionWaiver: { type: Number, default: 0, min: 0 },
    hostelWaiver: { type: Number, default: 0, min: 0 },
    transportWaiver: { type: Number, default: 0, min: 0 },
    miscWaiver: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const Student = model<IStudent>('Student', StudentSchema);
