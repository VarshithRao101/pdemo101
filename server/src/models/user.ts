import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  passwordHash: string;
  role: 'student' | 'accountant' | 'admin1' | 'admin2' | 'admin3' | 'authenticator';
  profileId?: Schema.Types.ObjectId;
  profileModel?: 'Student';
  backupCode?: string;
  usedBackupCodes?: string[];
  name?: string;
  email?: string;
  mobile?: string;
  department?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['student', 'accountant', 'admin1', 'admin2', 'admin3', 'authenticator'],
      required: true,
    },
    profileId: { type: Schema.Types.ObjectId, refPath: 'profileModel' },
    profileModel: { type: String, enum: ['Student'] },
    backupCode: { type: String },
    usedBackupCodes: { type: [String], default: [] },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    mobile: { type: String, default: '' },
    department: { type: String, default: '' }
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);
