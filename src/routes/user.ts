import { Router } from 'express';
import User from '../models/User.js';
import Withdrawal from '../models/Withdrawal.js';
import Activity from '../models/Activity.js';
import Referral from '../models/Referral.js';
import { getConfig } from '../config/manager.js';
import { config as staticConfig } from '../config/ads.js';
import {
  successResponse,
  createdResponse,
  validationError,
  notFoundError,
  serverError,
  validateUserId
} from '../middleware/validate.js';

const router = Router();

// ... existing profile routes ...

// Submit withdrawal request
router.post('/withdraw', async (req, res) => {
  try {
    const { userId = 'demo-user', amount, method, address } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    if (method === 'ton' && (!address || address.length < 10)) {
      return res.status(400).json({ success: false, error: 'Invalid TON wallet address' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.balance < amount) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    // Create withdrawal record
    const withdrawal = await Withdrawal.create({
      userId,
      amount,
      method,
      address,
      status: 'pending'
    });

    // Deduct from user balance
    user.balance -= amount;
    await user.save();

    // Create activity record for the withdrawal
    try {
      await Activity.create({
        userId,
        title: 'Withdrawal Request',
        type: 'withdrawal',
        amount: `-$${amount.toFixed(2)}`,
        status: 'pending',
        isPositive: false
      });
    } catch (actError) {
      console.error('Error creating withdrawal activity:', actError);
    }

    return successResponse(res, {
      id: withdrawal._id,
      amount: withdrawal.amount,
      balance: user.balance,
      status: withdrawal.status
    }, 'Withdrawal request submitted successfully');
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return serverError(res, 'Failed to process withdrawal');
  }
});

// Get withdrawal history
router.get('/withdrawals', async (req, res) => {
  try {
    const userId = req.query.userId as string || 'demo-user';
    const withdrawals = await Withdrawal.find({ userId }).sort({ createdAt: -1 });
    
    return successResponse(res, withdrawals);
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    return serverError(res, 'Failed to fetch withdrawal history');
  }
});

// Get referral list - requires userId
router.get('/referrals', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    
    // Verify userId is provided
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'userId query parameter is required',
        statusCode: 400
      });
    }
    
    // Verify user exists
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found',
        statusCode: 404
      });
    }
    
    const referrals = await Referral.find({ referrerId: userId }).sort({ createdAt: -1 });
    
    return successResponse(res, {
      userId,
      referralCode: user.referralCode,
      count: referrals.length,
      referrals
    });
  } catch (error) {
    console.error('Error fetching referrals:', error);
    return serverError(res, 'Failed to fetch referrals');
  }
});

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const { userId = 'demo-user', first_name, last_name, username } = req.query;
    let user = await User.findOne({ userId });
    
    // Create default user if not exists
    if (!user) {
      const displayName = first_name ? 
        (`${first_name}${last_name ? ' ' + last_name : ''}`) : 
        (username || 'New User');

      user = await User.create({
        userId,
        name: displayName,
        username: username,
        email: `${userId}@t.me`,
        balance: 0,
        totalEarned: 0,
        tasksCompleted: 0,
        level: 1,
        streak: 0,
        adsWatched: { rewarded: 0, banner: 0, lastWatch: null }
      });
    }

    // Reset adsWatched if it's a new day
    if (user.adsWatched?.lastWatch) {
      const lastWatch = new Date(user.adsWatched.lastWatch);
      const now = new Date();
      if (lastWatch.getDate() !== now.getDate() || lastWatch.getMonth() !== now.getMonth() || lastWatch.getFullYear() !== now.getFullYear()) {
        user.adsWatched.rewarded = 0;
        user.adsWatched.banner = 0;
        await user.save();
      }
    }

    const currentAdsConfig = await getConfig('ads_config', staticConfig.ads);
    const adsWatched = user.adsWatched || { rewarded: 0, banner: 0 };
    const totalAdsWatched = adsWatched.rewarded + adsWatched.banner;
    
    return successResponse(res, {
      id: user.userId,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      referralCode: user.referralCode,
      balance: user.balance,
      totalEarned: user.totalEarned,
      tasksCompleted: user.tasksCompleted,
      level: user.level,
      streak: user.streak,
      lastCheckIn: user.lastCheckIn,
      joinedAt: user.joinedAt,
      adsWatched: {
        rewarded: adsWatched.rewarded,
        banner: adsWatched.banner,
        total: totalAdsWatched
      },
      adsLimit: {
        rewarded: currentAdsConfig.rewardedLimit || 20,
        banner: currentAdsConfig.bannerLimit || 20,
        total: (currentAdsConfig.rewardedLimit || 20) + (currentAdsConfig.bannerLimit || 20)
      },
      adsReward: currentAdsConfig.rewardPerAd,
      monetagAppId: currentAdsConfig.monetagAppId
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return serverError(res, 'Failed to fetch profile');
  }
});

// Watch ad and get reward
router.post('/watch-ad', async (req, res) => {
  try {
    const { userId = 'demo-user', adType = 'rewarded' } = req.body;
    const typedAdType = adType as 'rewarded' | 'banner';
    
    // Validate ad type
    if (!['rewarded', 'banner'].includes(adType)) {
      return res.status(400).json({ success: false, error: 'Invalid ad type. Must be "rewarded" or "banner"' });
    }
    
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Initialize adsWatched if not exists
    if (!user.adsWatched) {
      user.adsWatched = { rewarded: 0, banner: 0, lastWatch: null };
    }

    // Check reset condition again just in case
    if (user.adsWatched.lastWatch) {
      const lastWatch = new Date(user.adsWatched.lastWatch);
      const now = new Date();
      if (lastWatch.getDate() !== now.getDate() || lastWatch.getMonth() !== now.getMonth() || lastWatch.getFullYear() !== now.getFullYear()) {
        user.adsWatched.rewarded = 0;
        user.adsWatched.banner = 0;
      }
    }

    const currentAdsConfig = await getConfig('ads_config', staticConfig.ads);
    
    // Get limits for each type (default 20 each, total 40)
    const rewardedLimit = currentAdsConfig.rewardedLimit || 20;
    const bannerLimit = currentAdsConfig.bannerLimit || 20;
    const typeLimit = adType === 'rewarded' ? rewardedLimit : bannerLimit;

    // Check per-type limit
    if (user.adsWatched[typedAdType] >= typeLimit) {
      return res.status(400).json({ 
        success: false, 
        error: `Daily ${adType} ad limit reached`,
        adType,
        limit: typeLimit,
        watched: user.adsWatched[typedAdType]
      });
    }

    // Calculate reward based on ad type
    const baseReward = currentAdsConfig.rewardPerAd || 0.05;
    const reward = adType === 'rewarded' ? baseReward : baseReward * 0.8; // Banner pays 80%

    // Update user's ad watch count
    user.adsWatched[typedAdType] += 1;
    user.adsWatched.lastWatch = new Date();
    user.balance += reward;
    user.totalEarned += reward;
    
    await user.save();

    // Log activity
    await Activity.create({
      userId,
      title: `Watched ${adType === 'rewarded' ? 'Rewarded' : 'Banner'} Ad`,
      type: 'task',
      amount: `+$${reward.toFixed(2)}`,
      status: 'completed',
      isPositive: true
    });

    return successResponse(res, {
      adType,
      adsWatched: user.adsWatched,
      balance: user.balance,
      totalEarned: user.totalEarned,
      reward,
      remaining: {
        rewarded: rewardedLimit - user.adsWatched.rewarded,
        banner: bannerLimit - user.adsWatched.banner
      }
    });
  } catch (error) {
    console.error('Error watching ad:', error);
    return serverError(res, 'Failed to process ad reward');
  }
});

// Get user stats
router.get('/stats', async (req, res) => {
  try {
    const userId = req.query.userId as string || 'demo-user';
    const user = await User.findOne({ userId });
    
    return successResponse(res, {
      todayEarned: 4.35,
      todayCompleted: 7,
      weeklyGrowth: '+23%',
      totalTasks: user?.tasksCompleted || 0,
      streak: user?.streak || 0,
      balance: user?.balance || 0,
      totalEarned: user?.totalEarned || 0
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return serverError(res, 'Failed to fetch stats');
  }
});

// Update user profile
router.patch('/profile', async (req, res) => {
  try {
    const { userId = 'demo-user', ...updates } = req.body;
    
    const user = await User.findOneAndUpdate(
      { userId },
      { ...updates },
      { new: true, upsert: true }
    );
    
    return successResponse(res, { 
      id: user?.userId,
      name: user?.name,
      email: user?.email,
      avatar: user?.avatar,
      updatedAt: new Date().toISOString() 
    }, 'Profile updated');
  } catch (error) {
    console.error('Error updating profile:', error);
    return serverError(res, 'Failed to update profile');
  }
});

// Get user activities - requires userId
router.get('/activities', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    
    // Verify userId is provided
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'userId query parameter is required',
        statusCode: 400
      });
    }
    
    // Verify user exists
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found',
        statusCode: 404
      });
    }
    
    const activities = await Activity.find({ userId }).sort({ createdAt: -1 });
    
    return successResponse(res, {
      userId,
      count: activities.length,
      activities
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return serverError(res, 'Failed to fetch activities');
  }
});

export default router;
