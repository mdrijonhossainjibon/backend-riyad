import mongoose from 'mongoose';

export interface IWithdrawal {
  userId: string;
  amount: number;
  method: string;
  address: string;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: Date;
}

const withdrawalSchema = new mongoose.Schema<IWithdrawal>({
  userId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  method: { type: String, required: true },
  address: { type: String, required: true },
  status: { type: String, enum: ['pending', 'completed', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IWithdrawal>('Withdrawal', withdrawalSchema);
