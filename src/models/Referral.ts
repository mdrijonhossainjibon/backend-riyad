import mongoose from 'mongoose';

export interface IReferral {
  referrerId: string;
  referredId: string;
  name: string;
  avatar: string;
  level: string;
  earnings: string;
  status: 'Active' | 'Inactive';
  createdAt: Date;
}

const referralSchema = new mongoose.Schema<IReferral>({
  referrerId: { type: String, required: true, index: true },
  referredId: { type: String, required: true },
  name: { type: String, required: true },
  avatar: { type: String },
  level: { type: String, default: 'Bronze' },
  earnings: { type: String, default: '$0.00' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IReferral>('Referral', referralSchema);
