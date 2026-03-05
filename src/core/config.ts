/**
 * Configuration Manager
 * 配置管理器
 */

import fs from 'fs';
import path from 'path';
import { AppConfig, WeChatConfig } from '../wechat/types/wechat.types';
import { ConfigError } from './error';
import { logger } from './logger';

const DEFAULT_CONFIG: Partial<AppConfig> = {
  logLevel: 'info',
  cacheDir: path.join(process.cwd(), '.cache'),
};

const DEFAULT_WECHAT_CONFIG: Partial<WeChatConfig> = {
  baseUrl: 'https://api.weixin.qq.com',
  timeout: 30000,
  maxRetries: 3,
  tokenCachePath: path.join(process.cwd(), '.cache', 'token.json'),
};

export class ConfigManager {
  private configPath: string;
  private config: AppConfig;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'config', 'wechat.config.json');
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    try {
      if (!fs.existsSync(this.configPath)) {
        logger.warn(`Config file not found: ${this.configPath}`);
        return this.createDefaultConfig();
      }

      const rawConfig = fs.readFileSync(this.configPath, 'utf-8');
      const userConfig = JSON.parse(rawConfig);

      return {
        ...DEFAULT_CONFIG,
        ...userConfig,
        wechat: {
          ...DEFAULT_WECHAT_CONFIG,
          ...userConfig.wechat,
        },
      } as AppConfig;
    } catch (error) {
      throw new ConfigError(`Failed to load config: ${(error as Error).message}`);
    }
  }

  private createDefaultConfig(): AppConfig {
    const config: AppConfig = {
      ...DEFAULT_CONFIG,
      wechat: DEFAULT_WECHAT_CONFIG as WeChatConfig,
    };

    // Create config directory
    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Save default config template
    this.saveConfig(config);

    return config;
  }

  saveConfig(config: AppConfig): void {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
      logger.info(`Config saved to: ${this.configPath}`);
    } catch (error) {
      throw new ConfigError(`Failed to save config: ${(error as Error).message}`);
    }
  }

  getConfig(): AppConfig {
    return this.config;
  }

  getWeChatConfig(): WeChatConfig {
    return this.config.wechat;
  }

  updateWeChatConfig(wechatConfig: Partial<WeChatConfig>): void {
    this.config.wechat = {
      ...this.config.wechat,
      ...wechatConfig,
    };
    this.saveConfig(this.config);
  }

  validateConfig(): boolean {
    const { appId, appSecret } = this.config.wechat;

    if (!appId || appId.length !== 18) {
      throw new ConfigError('Invalid appId: must be 18 characters');
    }

    if (!appSecret || appSecret.length !== 32) {
      throw new ConfigError('Invalid appSecret: must be 32 characters');
    }

    return true;
  }

  getConfigPath(): string {
    return this.configPath;
  }
}

// Singleton instance
let configManagerInstance: ConfigManager | null = null;

export function getConfigManager(configPath?: string): ConfigManager {
  if (!configManagerInstance) {
    configManagerInstance = new ConfigManager(configPath);
  }
  return configManagerInstance;
}
