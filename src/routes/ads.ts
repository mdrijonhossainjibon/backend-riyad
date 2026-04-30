import { Router } from 'express';
import Config from '../models/Config.js';
import User from '../models/User.js';
import { config as staticConfig } from '../config/ads.js';
import {
  successResponse,
  validationError,
  notFoundError,
  serverError
} from '../middleware/validate.js';

const router = Router();

// Get current ads configuration - optional userId for user-specific limits
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    
    // If userId provided, verify user exists
    if (userId) {
      const user = await User.findOne({ userId });
      if (!user) {
        return notFoundError(res, 'User');
      }
    }
    
    const adsConfig = await Config.findOne({ key: 'ads_config' });
    const config = adsConfig ? adsConfig.value : staticConfig.ads;
    
    return successResponse(res, {
      ...config,
      userId: userId || null
    });
  } catch (error) {
    console.error('Error fetching ads config:', error);
    return serverError(res, 'Failed to fetch ads configuration');
  }
});

// Update ads configuration - requires adminKey or userId for verification
router.post('/update', async (req, res) => {
  try {
    const { adminKey, userId, ...newConfig } = req.body;
    
    // Verify authorization
    if (!adminKey && !userId) {
      return validationError(res, 'adminKey or userId is required for authorization', 'authorization');
    }
    
    // If using userId, verify user exists
    if (userId) {
      const user = await User.findOne({ userId });
      if (!user) {
        return notFoundError(res, 'User');
      }
    }
    
    // Validate basic fields
    if (newConfig.dailyLimit === undefined || newConfig.rewardPerAd === undefined) {
      return validationError(res, 'dailyLimit and rewardPerAd are required', 'config');
    }

    const config = await Config.findOneAndUpdate(
      { key: 'ads_config' },
      { 
        value: newConfig,
        description: 'Global advertisement settings updated via API'
      },
      { upsert: true, new: true }
    );

    return successResponse(res, config.value, 'Ads configuration updated successfully');
  } catch (error) {
    console.error('Error updating ads config:', error);
    return serverError(res, 'Failed to update ads configuration');
  }
});

export default router;
