/**
 * Config Commands
 * 配置管理命令
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { ConfigManager } from '../../core/config';

const configManager = new ConfigManager();

export async function initConfig(): Promise<void> {
  console.log(chalk.blue('Initializing WeChat Article Manager configuration...'));
  console.log(chalk.gray('初始化微信公众号文章管理器配置...\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'appId',
      message: 'Enter WeChat App ID (18 characters):',
      validate: (input: string) => {
        if (input.length !== 18) {
          return 'App ID must be exactly 18 characters';
        }
        return true;
      },
    },
    {
      type: 'password',
      name: 'appSecret',
      message: 'Enter WeChat App Secret (32 characters):',
      mask: '*',
      validate: (input: string) => {
        if (input.length !== 32) {
          return 'App Secret must be exactly 32 characters';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'defaultAuthor',
      message: 'Default article author (optional):',
      default: '',
    },
  ]);

  try {
    configManager.updateWeChatConfig({
      appId: answers.appId,
      appSecret: answers.appSecret,
    });

    // Save default author to config if provided
    const config = configManager.getConfig();
    configManager.saveConfig({
      ...config,
      wechat: {
        ...config.wechat,
        appId: answers.appId,
        appSecret: answers.appSecret,
      },
      defaultAuthor: answers.defaultAuthor || undefined,
    });

    console.log(chalk.green('\n✓ Configuration saved successfully!'));
    console.log(chalk.gray(`  Config file: ${configManager.getConfigPath()}`));
  } catch (error) {
    console.error(chalk.red('\n✗ Failed to save configuration:'), (error as Error).message);
    process.exit(1);
  }
}

export function showConfig(): void {
  try {
    const config = configManager.getConfig();
    const wechat = config.wechat;

    console.log(chalk.blue('Current Configuration:'));
    console.log(chalk.blue('当前配置:\n'));

    console.log(chalk.yellow('WeChat Settings:'));
    console.log(`  App ID:     ${wechat.appId ? wechat.appId.substring(0, 6) + '****' : chalk.red('Not set')}`);
    console.log(`  App Secret: ${wechat.appSecret ? wechat.appSecret.substring(0, 6) + '****' : chalk.red('Not set')}`);
    console.log(`  Base URL:   ${wechat.baseUrl}`);
    console.log(`  Timeout:    ${wechat.timeout}ms`);
    console.log(`  Max Retries: ${wechat.maxRetries}`);

    console.log(chalk.yellow('\nGeneral Settings:'));
    console.log(`  Log Level:   ${config.logLevel}`);
    console.log(`  Cache Dir:   ${config.cacheDir}`);

    if (config.defaultAuthor) {
      console.log(`  Default Author: ${config.defaultAuthor}`);
    }

    console.log(chalk.gray(`\nConfig file: ${configManager.getConfigPath()}`));
  } catch (error) {
    console.error(chalk.red('Failed to read configuration:'), (error as Error).message);
    process.exit(1);
  }
}

export function setConfig(key: string, value: string): void {
  const validKeys = ['appId', 'appSecret', 'baseUrl', 'timeout', 'maxRetries', 'logLevel'];

  if (!validKeys.includes(key)) {
    console.error(chalk.red(`Invalid key: ${key}`));
    console.log(chalk.yellow(`Valid keys: ${validKeys.join(', ')}`));
    process.exit(1);
  }

  try {
    if (key === 'appId' || key === 'appSecret') {
      configManager.updateWeChatConfig({ [key]: value });
    } else {
      const config = configManager.getConfig();
      (config as Record<string, unknown>)[key] = value;
      configManager.saveConfig(config);
    }

    console.log(chalk.green(`✓ Configuration updated: ${key}`));
  } catch (error) {
    console.error(chalk.red('Failed to update configuration:'), (error as Error).message);
    process.exit(1);
  }
}
