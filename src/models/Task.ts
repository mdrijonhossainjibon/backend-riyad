import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  id: string;
  category: 'daily' | 'ads' | 'social' | 'bonus';
  status: 'start' | 'progress' | 'claim' | 'done';
  reward: string;
  rewardValue: number;
  tag: string;
  taskType?: 'link' | 'join' | 'invite' | 'task' | 'ads' | 'tg';
  link?: string;
  progress?: number;
  currentCount?: number;
  requiredCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['daily', 'ads', 'social', 'bonus'] 
  },
  status: { 
    type: String, 
    required: true, 
    enum: ['start', 'progress', 'claim', 'done'],
    default: 'start'
  },
  reward: { type: String, required: true },
  rewardValue: { type: Number, required: true },
  tag: { type: String, default: 'Quick' },
  taskType: { type: String, enum: ['link', 'join', 'invite', 'task', 'ads', 'tg'], default: 'task' },
  link: { type: String },
  progress: { type: Number, default: 0 },
  currentCount: { type: Number, default: 0 },
  requiredCount: { type: Number, default: 1 }
}, {
  timestamps: true
});

// Index for faster queries
TaskSchema.index({ category: 1, status: 1 });
TaskSchema.index({ id: 1 });

export default mongoose.model<ITask>('Task', TaskSchema);
