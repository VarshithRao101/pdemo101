import { Schema, model, Document } from 'mongoose';

export interface ITimetableEntry extends Document {
  section: string;
  day: string;
  period: string;
  subject: string;
  teacher: Schema.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const TimetableEntrySchema = new Schema<ITimetableEntry>(
  {
    section: { type: String, required: true, trim: true },
    day: { type: String, required: true, trim: true },
    period: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
  },
  { timestamps: true }
);

export const TimetableEntry = model<ITimetableEntry>('TimetableEntry', TimetableEntrySchema);
