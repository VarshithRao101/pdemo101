import { Schema, model, Document } from 'mongoose';

export interface ISyncJournal extends Document {
  transactionId: string;
  sourceNode: string;
  targetNode: string;
  action: string;
  payload: any;
  status: 'pending' | 'synced' | 'failed';
  acknowledgedClients: string[];
  expectedClientsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const SyncJournalSchema = new Schema<ISyncJournal>(
  {
    transactionId: { type: String, required: true, unique: true },
    sourceNode: { type: String, required: true },
    targetNode: { type: String, required: true },
    action: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ['pending', 'synced', 'failed'], default: 'pending' },
    acknowledgedClients: { type: [String], default: [] },
    expectedClientsCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const SyncJournal = model<ISyncJournal>('SyncJournal', SyncJournalSchema);
