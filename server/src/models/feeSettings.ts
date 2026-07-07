import { Schema, model, Document } from 'mongoose';

export interface IAcademicFeeSettings extends Document {
  tuition: number;
  hostel: number;
  transport: number;
  misc: number;
  isLocked: boolean;
  academicYear: string;
  installments: string;
  lateFeeRules: string;
  scholarshipRules: string;
  discountRules: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const AcademicFeeSettingsSchema = new Schema<IAcademicFeeSettings>(
  {
    tuition: { type: Number, required: true, min: 0, default: 120000 },
    hostel: { type: Number, required: true, min: 0, default: 85000 },
    transport: { type: Number, required: true, min: 0, default: 15000 },
    misc: { type: Number, required: true, min: 0, default: 5000 },
    isLocked: { type: Boolean, required: true, default: false },
    academicYear: { type: String, required: true, default: '2026-27' },
    installments: { type: String, required: true, default: '3 Installments' },
    lateFeeRules: { type: String, required: true, default: '₹100 per day after due date' },
    scholarshipRules: { type: String, required: true, default: 'Merit: 50% waiver, Sports: 30% waiver' },
    discountRules: { type: String, required: true, default: 'Sibling: 10% waiver' },
  },
  { timestamps: true }
);

export const AcademicFeeSettings = model<IAcademicFeeSettings>('AcademicFeeSettings', AcademicFeeSettingsSchema);
