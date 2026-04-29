import { Router } from 'express';
import Config from '../models/Config.js';

const router = Router();

// Default bot configuration
const defaultBotConfig = {
  botUsername: 'TaskWaveBot',
  botName: 'TaskWave',
  supportUrl: 'https://t.me/TaskWaveSupport',
  channelUrl: 'https://t.me/TaskWaveChannel'
};

// Get bot configuration
router.get('/config', async (req, res) => {
  try {
    const botConfig = await Config.findOne({ key: 'bot_config' });
    res.json({
      success: true,
      data: botConfig ? botConfig.value : defaultBotConfig
    });
  } catch (error) {
    console.error('Error fetching bot config:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch bot configuration' });
  }
});

// Update bot configuration
router.post('/config/update', async (req, res) => {
  try {
    const newConfig = req.body;
    
    // Validate botUsername is present
    if (!newConfig.botUsername) {
      return res.status(400).json({ success: false, error: 'botUsername is required' });
    }

    const config = await Config.findOneAndUpdate(
      { key: 'bot_config' },
      { 
        value: { ...defaultBotConfig, ...newConfig },
        description: 'Bot configuration updated via API'
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Bot configuration updated successfully',
      data: config.value
    });
  } catch (error) {
    console.error('Error updating bot config:', error);
    res.status(500).json({ success: false, error: 'Failed to update bot configuration' });
  }
});

export default router;
