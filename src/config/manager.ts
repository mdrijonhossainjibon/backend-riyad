import { IConfig } from '../models/Config.js';
import Config from '../models/Config.js';
import { config as staticConfig } from './ads.js';

/**
 * Initializes database configuration with default values from static config if they don't exist
 */
export const initializeConfig = async () => {
  try {
    const defaultConfigs = [
      {
        key: 'ads_config',
        value: staticConfig.ads,
        description: 'Global advertisement settings including daily limits and rewards'
      },
      {
        key: 'app_settings',
        value: {
          maintenanceMode: false,
          minWithdrawal: 10,
          referralBonusPercent: 10
        },
        description: 'General application settings'
      }
    ];

    for (const conf of defaultConfigs) {
      const exists = await Config.findOne({ key: conf.key });
      if (!exists) {
        await Config.create(conf);
        console.log(`✅ Config [${conf.key}] initialized in database`);
      }
    }
  } catch (error) {
    console.error('❌ Error initializing database config:', error);
  }
};

/**
 * Helper to get a config value by key
 */
export const getConfig = async <T>(key: string, defaultValue: T): Promise<T> => {
  try {
    const config = await Config.findOne({ key });
    return config ? (config.value as T) : defaultValue;
  } catch (error) {
    return defaultValue;
  }
};
