import { Router } from 'express';
import Config from '../models/Config.js';
import { config as staticConfig } from '../config/ads.js';

const router = Router();

// Get current ads configuration
router.get('/', async (req, res) => {
  try {
    const adsConfig = await Config.findOne({ key: 'ads_config' });
    res.json({
      success: true,
      data: adsConfig ? adsConfig.value : staticConfig.ads
    });
  } catch (error) {
    console.error('Error fetching ads config:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch ads configuration' });
  }
});

// Update ads configuration
router.post('/update', async (req, res) => {
  try {
    const newConfig = req.body;
    
    // Validate basic fields
    if (newConfig.dailyLimit === undefined || newConfig.rewardPerAd === undefined) {
      return res.status(400).json({ success: false, error: 'Invalid configuration data' });
    }

    const config = await Config.findOneAndUpdate(
      { key: 'ads_config' },
      { 
        value: newConfig,
        description: 'Global advertisement settings updated via API'
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Ads configuration updated successfully',
      data: config.value
    });
  } catch (error) {
    console.error('Error updating ads config:', error);
    res.status(500).json({ success: false, error: 'Failed to update ads configuration' });
  }
});

export default router;
