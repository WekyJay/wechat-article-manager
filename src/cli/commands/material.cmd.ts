/**
 * Material Commands
 * 素材管理命令
 */

import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from '../../core/config';
import { TokenManager } from '../../wechat/auth/token-manager';
import { MaterialAPI } from '../../wechat/api/material-api';
import { TokenStore } from '../../wechat/auth/token-store';

async function getMaterialAPI(): Promise<MaterialAPI> {
  const configManager = new ConfigManager();
  const config = configManager.getWeChatConfig();

  if (!config.appId || !config.appSecret) {
    throw new Error('WeChat App ID and App Secret not configured. Run "wam-cli config init" first.');
  }

  const tokenStore = new TokenStore(config.tokenCachePath);
  const tokenManager = new TokenManager(config, tokenStore);

  return new MaterialAPI(config, tokenManager);
}

export async function uploadImage(file: string, options: { type?: string }): Promise<void> {
  const spinner = ora('Uploading image...').start();

  try {
    const api = await getMaterialAPI();
    const uploadType = options.type === 'material' ? 'material' : 'url';

    let result;
    if (uploadType === 'material') {
      result = await api.addMaterial(file, 'image');
    } else {
      result = await api.uploadImage(file);
    }

    spinner.succeed('Image uploaded successfully!');

    console.log(chalk.green('\n✓ Upload successful'));
    console.log(`  URL: ${chalk.cyan(result.url)}`);
    if (result.media_id) {
      console.log(`  Media ID: ${chalk.cyan(result.media_id)}`);
    }
  } catch (error) {
    spinner.fail('Upload failed');
    console.error(chalk.red('Error:'), (error as Error).message);
    process.exit(1);
  }
}

export async function listMaterials(options: {
  type?: string;
  offset?: string;
  count?: string;
}): Promise<void> {
  const spinner = ora('Fetching materials...').start();

  try {
    const api = await getMaterialAPI();
    const type = (options.type || 'image') as 'image' | 'video' | 'voice' | 'news';
    const offset = parseInt(options.offset || '0', 10);
    const count = parseInt(options.count || '20', 10);

    const result = await api.batchGetMaterial(type, offset, count);

    spinner.succeed(`Found ${result.total_count} materials`);

    console.log(chalk.blue(`\nMaterial List (showing ${result.item_count}/${result.total_count}):`));
    console.log(chalk.gray('─'.repeat(80)));

    for (const item of result.item) {
      console.log(`\n${chalk.yellow(item.name || 'Unnamed')}`);
      console.log(`  Media ID: ${chalk.cyan(item.media_id)}`);
      console.log(`  Updated: ${new Date(item.update_time * 1000).toLocaleString()}`);
      if (item.url) {
        console.log(`  URL: ${chalk.cyan(item.url)}`);
      }
    }

    if (result.total_count > offset + result.item_count) {
      console.log(chalk.gray(`\n... and ${result.total_count - offset - result.item_count} more`));
    }
  } catch (error) {
    spinner.fail('Failed to fetch materials');
    console.error(chalk.red('Error:'), (error as Error).message);
    process.exit(1);
  }
}
