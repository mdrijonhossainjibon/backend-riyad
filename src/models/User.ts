import mongoose, { Schema, Document } from 'mongoose';

export interface IAdWatchData {
  rewarded: number;
  banner: number;
  lastWatch: Date | null;
}

export interface ITaskProgress {
  status: 'start' | 'progress' | 'claim' | 'done';
  progress: number;
  currentCount: number;
  completedAt?: Date;
}

export interface IUser extends Document {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  referralCode: string;
  balance: number;
  totalEarned: number;
  tasksCompleted: number;
  level: number;
  streak: number;
  lastCheckIn?: Date;
  joinedAt: Date;
  adsWatched: IAdWatchData;
  taskProgress: Map<string, ITaskProgress>;
  createdAt: Date;
  updatedAt: Date;
}

// Generate unique referral code
const generateReferralCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'TW';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const AdWatchSchema: Schema = new Schema({
  rewarded: { type: Number, default: 0 },
  banner: { type: Number, default: 0 },
  lastWatch: { type: Date, default: null }
}, { _id: false });

const TaskProgressSchema: Schema = new Schema({
  status: { type: String, enum: ['start', 'progress', 'claim', 'done'], default: 'start' },
  progress: { type: Number, default: 0 },
  currentCount: { type: Number, default: 0 },
  completedAt: { type: Date, default: null }
}, { _id: false });

const UserSchema: Schema = new Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  avatar: { type: String, default: null },
  referralCode: { type: String, unique: true, default: generateReferralCode },
  balance: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  tasksCompleted: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  streak: { type: Number, default: 0 },
  lastCheckIn: { type: Date, default: null },
  joinedAt: { type: Date, default: Date.now },
  adsWatched: { type: AdWatchSchema, default: () => ({ rewarded: 0, banner: 0, lastWatch: null }) },
  taskProgress: { type: Map, of: TaskProgressSchema, default: () => ({}) }
}, {
  timestamps: true
});

// Index for faster queries
UserSchema.index({ userId: 1 });
UserSchema.index({ email: 1 });

export default mongoose.model<IUser>('User', UserSchema);
