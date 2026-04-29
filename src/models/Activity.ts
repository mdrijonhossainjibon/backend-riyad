import mongoose from 'mongoose';

export interface IActivity {
  userId: string;
  title: string;
  type: string;
  amount: string;
  status: string;
  isPositive: boolean;
  createdAt: Date;
}

const activitySchema = new mongoose.Schema<IActivity>({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  type: { type: String, required: true },
  amount: { type: String, required: true },
  status: { type: String, default: 'completed' },
  isPositive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IActivity>('Activity', activitySchema);
