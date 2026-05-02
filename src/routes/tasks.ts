import { Router } from 'express';
import TelegramBot from 'node-telegram-bot-api';
import Task from '../models/Task.js';
import User from '../models/User.js';
import {
  successResponse,
  validationError,
  notFoundError,
  serverError
} from '../middleware/validate.js';

const router = Router();

// Initialize Telegram Bot
const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
if (!botToken) {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN is not defined in .env file. TG verification will use dev-mode fallback.');
}
const bot = botToken ? new TelegramBot(botToken, { polling: false }) : null;

// Default tasks to seed
const defaultTasks = [
  // Daily tasks
  { id: 'd1', category: 'daily', status: 'start', reward: '$0.50', rewardValue: 0.5, tag: 'Quick', taskType: 'ads' },
  { id: 'd2', category: 'daily', status: 'start', reward: '$1.00', rewardValue: 1.0, tag: 'High Pay', taskType: 'ads' },
  { id: 'd3', category: 'daily', status: 'start', reward: '$0.25', rewardValue: 0.25, tag: 'Fun', taskType: 'task' },
  { id: 'd4', category: 'daily', status: 'start', reward: '$0.75', rewardValue: 0.75, tag: 'Auto', taskType: 'task' },
  { id: 'd5', category: 'daily', status: 'start', reward: '$0.30', rewardValue: 0.3, tag: 'Quick', taskType: 'task' },
  { id: 'd6', category: 'daily', status: 'start', reward: '$0.40', rewardValue: 0.4, tag: 'Challenge', taskType: 'task' },
  { id: 'd7', category: 'daily', status: 'start', reward: '$2.00', rewardValue: 2.0, tag: 'High Pay', taskType: 'task' },
  { id: 'd8', category: 'daily', status: 'start', reward: '$0.10', rewardValue: 0.1, tag: 'Quick', taskType: 'task' },
  // Social tasks
  { id: 's1', category: 'social', status: 'start', reward: '$0.25', rewardValue: 0.25, tag: 'Quick', taskType: 'link', link: 'https://taskwave.app' },
  { id: 's2', category: 'social', status: 'start', reward: '$2.50', rewardValue: 2.5, tag: 'High Pay', taskType: 'invite', requiredCount: 3 },
  { id: 's3', category: 'social', status: 'start', reward: '$0.15', rewardValue: 0.15, tag: 'Quick', taskType: 'link', link: 'https://t.me/taskwave' },
  { id: 's4', category: 'social', status: 'start', reward: '$0.30', rewardValue: 0.3, tag: 'Fun', taskType: 'link', link: 'https://t.me/taskwave' },
  { id: 's5', category: 'social', status: 'start', reward: '$0.50', rewardValue: 0.5, tag: 'Auto', taskType: 'tg', link: 'https://t.me/taskwave' },
  { id: 's6', category: 'social', status: 'start', reward: '$0.20', rewardValue: 0.2, tag: 'Quick', taskType: 'tg', link: 'https://t.me/taskwavegroup' },
  // Ads tasks
  { id: 'a1', category: 'ads', status: 'start', reward: '$1.00', rewardValue: 1.0, tag: 'Auto', taskType: 'ads', requiredCount: 10 },
  // Bonus tasks
  { id: 'b1', category: 'bonus', status: 'start', reward: '$5.00', rewardValue: 5.0, tag: 'Milestone', taskType: 'task' },
  { id: 'b2', category: 'bonus', status: 'start', reward: '$3.00', rewardValue: 3.0, tag: 'Lucky', taskType: 'task' },
  { id: 'b3', category: 'bonus', status: 'start', reward: '$1.00', rewardValue: 1.0, tag: 'Challenge', taskType: 'task' },
  { id: 'b4', category: 'bonus', status: 'start', reward: '$0.50', rewardValue: 0.5, tag: 'Lucky', taskType: 'task' },
  { id: 'b5', category: 'bonus', status: 'start', reward: '$2.00', rewardValue: 2.0, tag: 'High Pay', taskType: 'task' },
  { id: 'b6', category: 'bonus', status: 'start', reward: '$10.00', rewardValue: 10.0, tag: 'Milestone', taskType: 'task' },
  { id: 'b7', category: 'bonus', status: 'start', reward: '$5.00', rewardValue: 5.0, tag: 'Limited', taskType: 'task' },
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

// Verify Telegram join status
router.post('/:taskId/verify-tg', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { userId = 'demo-user' } = req.body;

    const task = await Task.findOne({ id: taskId });
    if (!task || task.taskType !== 'tg') {
      return notFoundError(res, 'Telegram task');
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return notFoundError(res, 'User');
    }

    if (!bot) {
      if (process.env.NODE_ENV === 'development' || !process.env.TELEGRAM_BOT_TOKEN) {
        const taskProgress = user.taskProgress || new Map();
        taskProgress.set(taskId, {
          status: 'claim',
          progress: 100,
          currentCount: 1,
          completedAt: new Date()
        });
        user.taskProgress = taskProgress;
        await user.save();
        
        return successResponse(res, {
          taskId,
          status: 'claim',
          isMember: true,
          note: 'Dev mode: automatic verification (No Bot Token)'
        }, 'Verified (Dev mode)');
      }
      return serverError(res, 'Telegram bot not configured');
    }

    // Parse channel ID from link (e.g., https://t.me/taskwave -> @taskwave)
    const channelUsername = task.link?.split('t.me/')[1]?.replace('/', '');
    if (!channelUsername) {
      return validationError(res, 'Invalid channel link', 'link');
    }

    const chatId = channelUsername.startsWith('@') ? channelUsername : `@${channelUsername}`;

    try {
      // Check chat member status
      const chatMember = await bot!.getChatMember(chatId, parseInt(userId) || 0); // Assuming userId is TG ID
      
      const isMember = ['member', 'administrator', 'creator'].includes(chatMember.status);

      if (!isMember) {
        return res.status(400).json({
          success: false,
          error: 'Not a member',
          message: 'Please join the channel before confirming'
        });
      }

      // Update progress to claim
      const taskProgress = user.taskProgress || new Map();
      taskProgress.set(taskId, {
        status: 'claim',
        progress: 100,
        currentCount: 1,
        completedAt: new Date()
      });
      user.taskProgress = taskProgress;
      await user.save();

      return successResponse(res, {
        taskId,
        status: 'claim',
        isMember: true
      }, 'Channel join verified successfully');

    } catch (botError: any) {
      console.error('Telegram Bot Error:', botError.message);
      
      // Fallback for development if bot can't reach API or chat not found
      if (process.env.NODE_ENV === 'development') {
        const taskProgress = user.taskProgress || new Map();
        taskProgress.set(taskId, {
          status: 'claim',
          progress: 100,
          currentCount: 1,
          completedAt: new Date()
        });
        user.taskProgress = taskProgress;
        await user.save();
        
        return successResponse(res, {
          taskId,
          status: 'claim',
          isMember: true,
          note: 'Dev mode: automatic verification'
        }, 'Verified (Dev mode)');
      }

      return res.status(400).json({
        success: false,
        error: 'Verification failed',
        message: 'Could not verify channel membership. Please try again later.'
      });
    }
  } catch (error) {
    console.error('Error verifying TG join:', error);
    return serverError(res, 'Failed to verify Telegram join');
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

    // Update user's specific task progress to "done"
    if (user) {
      const taskProgress = user.taskProgress || new Map();
      taskProgress.set(taskId, {
        status: 'done',
        progress: 100,
        currentCount: task.requiredCount || 1,
        completedAt: new Date()
      });
      user.taskProgress = taskProgress;
      await user.save();
    }

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
    const { userId = 'demo-user' } = req.body;

    const task = await Task.findOne({ id: taskId });
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const taskProgress = user.taskProgress || new Map();
    let currentProgress = taskProgress.get(taskId) || {
      status: 'start',
      progress: 0,
      currentCount: 0
    };

    if (currentProgress.status === 'done') {
      return res.status(400).json({ success: false, error: 'Task already completed' });
    }

    // Increment count if it's a multi-step task (like ads or invite)
    const requiredCount = task.requiredCount || 1;
    
    if (requiredCount > 1) {
      currentProgress.currentCount = (currentProgress.currentCount || 0) + 1;
      currentProgress.progress = Math.min(Math.round((currentProgress.currentCount / requiredCount) * 100), 100);
      
      if (currentProgress.currentCount >= requiredCount) {
        currentProgress.status = 'claim';
      } else {
        currentProgress.status = 'progress';
      }
    } else {
      // For single step tasks
      currentProgress.status = 'claim';
      currentProgress.progress = 100;
      currentProgress.currentCount = 1;
    }

    taskProgress.set(taskId, currentProgress);
    user.taskProgress = taskProgress;
    await user.save();

    return successResponse(res, { 
      taskId, 
      status: currentProgress.status,
      progress: currentProgress.progress,
      currentCount: currentProgress.currentCount,
      requiredCount: requiredCount,
      updatedAt: new Date().toISOString() 
    }, `Task progress updated: ${currentProgress.status}`);
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

// Reset all tasks - remove old data and set defaults (admin only)
router.post('/reset', async (req, res) => {
  try {
    const { confirm } = req.body;

    if (confirm !== 'RESET_ALL_TASKS') {
      return res.status(400).json({
        success: false,
        error: 'Invalid confirmation code. Use "RESET_ALL_TASKS" to confirm.'
      });
    }

    // Delete all existing tasks
    await Task.deleteMany({});
    
    // Clear user task progress
    await User.updateMany({}, { $set: { taskProgress: new Map(), tasksCompleted: 0 } });
    
    console.log('✅ All old tasks and user progress deleted');

    // Insert default tasks
    await Task.insertMany(defaultTasks);
    console.log('✅ Default tasks seeded');

    return successResponse(res, {
      message: 'All tasks have been reset to default state',
      taskCount: defaultTasks.length,
      tasks: defaultTasks
    }, 'Tasks reset successfully');
  } catch (error) {
    console.error('Error resetting tasks:', error);
    return serverError(res, 'Failed to reset tasks');
  }
});

export default router;
