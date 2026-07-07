import { Schema, model, Document } from 'mongoose';

export interface IRoom extends Document {
  roomNumber: string;
  block: string;
  capacity: number;
  occupants: Schema.Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    roomNumber: { type: String, required: true, trim: true },
    block: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, default: 4 },
    occupants: [{ type: Schema.Types.ObjectId, ref: 'Student' }]
  },
  { timestamps: true }
);

// Unique index per room + block
RoomSchema.index({ roomNumber: 1, block: 1 }, { unique: true });

export const Room = model<IRoom>('Room', RoomSchema);
