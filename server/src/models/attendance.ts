import { Schema, model, Document } from 'mongoose';

export interface IAttendanceRecord extends Document {
  targetId: Schema.Types.ObjectId;
  targetModel: 'Student' | 'Teacher';
  date: Date;
  status: 'present' | 'absent' | 'late' | 'leave';
  createdAt?: Date;
  updatedAt?: Date;
}

const AttendanceRecordSchema = new Schema<IAttendanceRecord>(
  {
    targetId: { type: Schema.Types.ObjectId, required: true, refPath: 'targetModel' },
    targetModel: { type: String, required: true, enum: ['Student', 'Teacher'] },
    date: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: ['present', 'absent', 'late', 'leave'], required: true },
  },
  { timestamps: true }
);

export const AttendanceRecord = model<IAttendanceRecord>('AttendanceRecord', AttendanceRecordSchema);
