import { Router } from 'express';
import Config from '../models/Config.js';
import User from '../models/User.js';
import {
  successResponse,
  validationError,
  notFoundError,
  serverError
} from '../middleware/validate.js';

const router = Router();

// Default bot configuration
const defaultBotConfig = {
  botUsername: 'TaskWaveBot',
  botName: 'TaskWave',
  supportUrl: 'https://t.me/TaskWaveSupport',
  channelUrl: 'https://t.me/TaskWaveChannel'
};

// Get bot configuration - optional userId for user-specific data
router.get('/config', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    
    // If userId provided, verify user exists
    if (userId) {
      const user = await User.findOne({ userId });
      if (!user) {
        return notFoundError(res, 'User');
      }
    }
    
    const botConfig = await Config.findOne({ key: 'bot_config' });
    const config = botConfig ? botConfig.value : defaultBotConfig;
    
    return successResponse(res, {
      ...config,
      userId: userId || null
    });
  } catch (error) {
    console.error('Error fetching bot config:', error);
    return serverError(res, 'Failed to fetch bot configuration');
  }
});

// Update bot configuration - requires adminKey or userId for verification
router.post('/config/update', async (req, res) => {
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
    
    // Validate botUsername is present
    if (!newConfig.botUsername) {
      return validationError(res, 'botUsername is required', 'botUsername');
    }

    const config = await Config.findOneAndUpdate(
      { key: 'bot_config' },
      { 
        value: { ...defaultBotConfig, ...newConfig },
        description: 'Bot configuration updated via API'
      },
      { upsert: true, new: true }
    );

    return successResponse(res, config.value, 'Bot configuration updated successfully');
  } catch (error) {
    console.error('Error updating bot config:', error);
    return serverError(res, 'Failed to update bot configuration');
  }
});

export default router;
