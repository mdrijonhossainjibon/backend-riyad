import { Router } from 'express';
import Task from '../models/Task.js';
import User from '../models/User.js';
import {
  successResponse,
  validationError,
  notFoundError,
  serverError
} from '../middleware/validate.js';

const router = Router();

// Default tasks to seed
const defaultTasks = [
  // Daily tasks
  { id: 'd1', category: 'daily', status: 'start', reward: '$0.50', rewardValue: 0.5, tag: 'Quick' },
  { id: 'd2', category: 'daily', status: 'start', reward: '$1.00', rewardValue: 1.0, tag: 'High Pay' },
  { id: 'd3', category: 'daily', status: 'done', reward: '$0.25', rewardValue: 0.25, tag: 'Fun' },
  { id: 'd4', category: 'daily', status: 'claim', reward: '$0.75', rewardValue: 0.75, tag: 'Auto' },
  { id: 'd5', category: 'daily', status: 'start', reward: '$0.30', rewardValue: 0.3, tag: 'Quick' },
  { id: 'd6', category: 'daily', status: 'start', reward: '$0.40', rewardValue: 0.4, tag: 'Challenge' },
  { id: 'd7', category: 'daily', status: 'progress', reward: '$2.00', rewardValue: 2.0, tag: 'High Pay', progress: 50 },
  { id: 'd8', category: 'daily', status: 'start', reward: '$0.10', rewardValue: 0.1, tag: 'Quick' },
  // Ads tasks
  { id: 'a1', category: 'ads', status: 'start', reward: '$0.50', rewardValue: 0.5, tag: 'Quick', requiredCount: 20 },
  { id: 'a2', category: 'ads', status: 'start', reward: '$0.75', rewardValue: 0.75, tag: 'Auto', requiredCount: 15 },
  { id: 'a3', category: 'ads', status: 'start', reward: '$0.20', rewardValue: 0.2, tag: 'Quick' },
  { id: 'a4', category: 'ads', status: 'start', reward: '$1.00', rewardValue: 1.0, tag: 'High Pay' },
  { id: 'a5', category: 'ads', status: 'done', reward: '$0.60', rewardValue: 0.6, tag: 'Fun' },
  // Social tasks
  { id: 's1', category: 'social', status: 'start', reward: '$0.25', rewardValue: 0.25, tag: 'Quick' },
  { id: 's2', category: 'social', status: 'progress', reward: '$2.50', rewardValue: 2.5, tag: 'High Pay', progress: 30 },
  { id: 's3', category: 'social', status: 'start', reward: '$0.15', rewardValue: 0.15, tag: 'Quick' },
  { id: 's4', category: 'social', status: 'start', reward: '$0.30', rewardValue: 0.3, tag: 'Fun' },
  { id: 's5', category: 'social', status: 'start', reward: '$0.50', rewardValue: 0.5, tag: 'Auto' },
  { id: 's6', category: 'social', status: 'done', reward: '$0.20', rewardValue: 0.2, tag: 'Quick' },
  // Bonus tasks
  { id: 'b1', category: 'bonus', status: 'start', reward: '$5.00', rewardValue: 5.0, tag: 'Milestone' },
  { id: 'b2', category: 'bonus', status: 'start', reward: '$3.00', rewardValue: 3.0, tag: 'Lucky' },
  { id: 'b3', category: 'bonus', status: 'start', reward: '$1.00', rewardValue: 1.0, tag: 'Challenge' },
  { id: 'b4', category: 'bonus', status: 'claim', reward: '$0.50', rewardValue: 0.5, tag: 'Lucky' },
  { id: 'b5', category: 'bonus', status: 'start', reward: '$2.00', rewardValue: 2.0, tag: 'High Pay' },
  { id: 'b6', category: 'bonus', status: 'done', reward: '$10.00', rewardValue: 10.0, tag: 'Milestone' },
  { id: 'b7', category: 'bonus', status: 'start', reward: '$5.00', rewardValue: 5.0, tag: 'Limited' },
];

// Get all tasks - grouped by category (requires userId)
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    
    // Validate userId is provided
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'userId query parameter is required',
        statusCode: 400
      });
    }

    // Seed tasks if none exist
    const count = await Task.countDocuments();
    if (count === 0) {
      await Task.insertMany(defaultTasks);
      console.log('✅ Tasks seeded');
    }

    // Get user-specific task progress
    const user = await User.findOne({ userId });
    const userTaskProgress = user?.taskProgress || new Map();

    const tasks = await Task.find().sort({ category: 1, id: 1 });
    
    // Merge task data with user progress
    const tasksWithProgress = tasks.map(task => {
      const progress = userTaskProgress.get(task.id);
      return {
        ...task.toObject(),
        status: progress?.status || task.status,
        progress: progress?.progress || task.progress || 0,
        currentCount: progress?.currentCount || task.currentCount || 0,
        completedAt: progress?.completedAt || null
      };
    });
    
    // Group by category
    const tasksData = {
      daily: tasksWithProgress.filter(t => t.category === 'daily'),
      ads: tasksWithProgress.filter(t => t.category === 'ads'),
      social: tasksWithProgress.filter(t => t.category === 'social'),
      bonus: tasksWithProgress.filter(t => t.category === 'bonus'),
    };

    return successResponse(res, {
      userId,
      tasks: tasksData,
      totalTasks: tasks.length,
      completedTasks: tasksWithProgress.filter(t => t.status === 'done').length
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return serverError(res, 'Failed to fetch tasks');
  }
});

// Claim a task
router.post('/:taskId/claim', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { userId = 'demo-user' } = req.body;

    const task = await Task.findOne({ id: taskId });
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Update task status
    task.status = 'done';
    await task.save();

    // Update user stats
    const user = await User.findOneAndUpdate(
      { userId },
      { 
        $inc: { 
          balance: task.rewardValue, 
          totalEarned: task.rewardValue,
          tasksCompleted: 1 
        } 
      },
      { new: true, upsert: true }
    );

    return successResponse(res, { 
      taskId, 
      reward: task.reward, 
      newBalance: user?.balance || 0,
      claimedAt: new Date().toISOString() 
    }, 'Task claimed successfully');
  } catch (error) {
    console.error('Error claiming task:', error);
    return serverError(res, 'Failed to claim task');
  }
});

// Start or update task progress
router.post('/:taskId/start', async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findOne({ id: taskId });
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    if (task.status === 'done') {
      return res.status(400).json({ success: false, error: 'Task already completed' });
    }

    // Increment count if it's a multi-step task
    if (task.requiredCount && task.requiredCount > 1) {
      task.currentCount = (task.currentCount || 0) + 1;
      task.progress = Math.round((task.currentCount / task.requiredCount) * 100);
      
      if (task.currentCount >= task.requiredCount) {
        task.status = 'claim';
      } else {
        task.status = 'progress';
      }
    } else {
      // For single step tasks, set to claim directly for ads/d1
      const nextStatus = (task.category === 'ads' || task.id === 'd1') ? 'claim' : 'progress';
      task.status = nextStatus;
      task.progress = 100;
    }

    await task.save();

    return successResponse(res, { 
      taskId, 
      status: task.status,
      progress: task.progress,
      currentCount: task.currentCount,
      requiredCount: task.requiredCount,
      updatedAt: new Date().toISOString() 
    }, `Task progress updated: ${task.status}`);
  } catch (error) {
    console.error('Error updating task:', error);
    return serverError(res, 'Failed to update task');
  }
});

// Get daily check-in status
router.get('/checkin/status', async (req, res) => {
  try {
    const userId = req.query.userId as string || 'demo-user';

    const user = await User.findOne({ userId });

    if (!user || !user.lastCheckIn) {
      return res.json({
        success: true,
        data: {
          claimed: false,
          remainingTime: 0
        }
      });
    }

    const lastCheckIn = new Date(user.lastCheckIn);
    const now = new Date();

    const lastDate = new Date(Date.UTC(lastCheckIn.getUTCFullYear(), lastCheckIn.getUTCMonth(), lastCheckIn.getUTCDate()));
    const nowDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const isSameDay = nowDate.getTime() === lastDate.getTime();

    if (isSameDay) {
      const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diffMs = nextMidnight.getTime() - now.getTime();

      return res.json({
        success: true,
        data: {
          claimed: true,
          remainingTime: diffMs
        }
      });
    }

    return successResponse(res, {
      claimed: false,
      remainingTime: 0
    });
  } catch (error) {
    console.error('Error checking check-in status:', error);
    return serverError(res, 'Failed to check status');
  }
});

// Daily check-in
router.post('/checkin', async (req, res) => {
  try {
    const { userId = 'demo-user', reward = 1.00 } = req.body;

    const user = await User.findOne({ userId });
    
    if (user && user.lastCheckIn) {
      const lastCheckIn = new Date(user.lastCheckIn);
      const now = new Date();
      
      // Reset hours to compare dates only (UTC)
      const lastDate = new Date(Date.UTC(lastCheckIn.getUTCFullYear(), lastCheckIn.getUTCMonth(), lastCheckIn.getUTCDate()));
      const nowDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      
      if (nowDate.getTime() === lastDate.getTime()) {
        // Already checked in today
        // Calculate time until next check-in (midnight UTC)
        const nextCheckIn = new Date(nowDate.getTime() + 24 * 60 * 60 * 1000);
        const diffMs = nextCheckIn.getTime() - now.getTime();
        
        return res.status(400).json({ 
          success: false, 
          error: 'Already checked in today',
          remainingTime: diffMs
        });
      }
    }

    const updatedUser = await User.findOneAndUpdate(
      { userId },
      { 
        $inc: { balance: reward, totalEarned: reward },
        $set: { lastCheckIn: new Date() },
      },
      { new: true, upsert: true }
    );

    // Calculate streak (simplified)
    const streak = updatedUser?.streak || 1;

    return successResponse(res, { 
      reward, 
      checkedInAt: new Date().toISOString(),
      streak,
      newBalance: updatedUser?.balance || 0
    }, 'Daily check-in successful');
  } catch (error) {
    console.error('Error check-in:', error);
    return serverError(res, 'Failed to check in');
  }
});

export default router;
