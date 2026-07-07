import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  passwordHash: string;
  role: 'student' | 'accountant' | 'admin1' | 'admin2';
  profileId?: Schema.Types.ObjectId;
  profileModel?: 'Student';
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['student', 'accountant', 'admin1', 'admin2'],
      required: true,
    },
    profileId: { type: Schema.Types.ObjectId, refPath: 'profileModel' },
    profileModel: { type: String, enum: ['Student'] },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);
