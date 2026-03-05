/**
 * Draft Commands
 * 草稿管理命令
 */

import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from '../../core/config';
import { TokenManager } from '../../wechat/auth/token-manager';
import { DraftAPI } from '../../wechat/api/draft-api';
import { MaterialAPI } from '../../wechat/api/material-api';
import { WeChatFormatter } from '../../markdown/wechat-formatter';
import { TokenStore } from '../../wechat/auth/token-store';

async function getDraftAPI(): Promise<DraftAPI> {
  const configManager = new ConfigManager();
  const config = configManager.getWeChatConfig();

  if (!config.appId || !config.appSecret) {
    throw new Error('WeChat App ID and App Secret not configured. Run "wam-cli config init" first.');
  }

  const tokenStore = new TokenStore(config.tokenCachePath);
  const tokenManager = new TokenManager(config, tokenStore);

  return new DraftAPI(config, tokenManager);
}

async function getFormatter(): Promise<WeChatFormatter> {
  const configManager = new ConfigManager();
  const config = configManager.getWeChatConfig();
  const appConfig = configManager.getConfig();

  if (!config.appId || !config.appSecret) {
    throw new Error('WeChat App ID and App Secret not configured.');
  }

  const tokenStore = new TokenStore(config.tokenCachePath);
  const tokenManager = new TokenManager(config, tokenStore);
  const materialAPI = new MaterialAPI(config, tokenManager);
  const draftAPI = new DraftAPI(config, tokenManager);

  return new WeChatFormatter(materialAPI, draftAPI, {
    defaultAuthor: appConfig.defaultAuthor,
  });
}

export async function createDraft(
  file: string,
  options: { cover?: string }
): Promise<void> {
  const spinner = ora('Processing markdown and creating draft...').start();

  try {
    const formatter = await getFormatter();

    // Read markdown file and inject cover if provided
    let result;
    if (options.cover) {
      const fs = await import('fs');
      let content = fs.readFileSync(file, 'utf-8');

      // Add cover image to front matter if not already present
      if (!content.includes('cover:') && !content.includes('thumbnail:')) {
        const coverLine = `cover: ${options.cover}\n`;
        if (content.startsWith('---')) {
          // Insert into existing front matter
          content = content.replace('---\n', `---\n${coverLine}`);
        } else {
          // Create new front matter
          content = `---\n${coverLine}---\n\n${content}`;
        }
        // Write temporary file
        const tmpFile = file + '.tmp';
        fs.writeFileSync(tmpFile, content);
        result = await formatter.process(tmpFile, true);
        fs.unlinkSync(tmpFile);
      } else {
        result = await formatter.process(file, true);
      }
    } else {
      result = await formatter.process(file, true);
    }

    spinner.succeed('Draft created successfully!');

    console.log(chalk.green('\n✓ Draft created'));
    console.log(`  Media ID: ${chalk.cyan(result.draftResponse?.media_id || 'N/A')}`);
    console.log(`  Title: ${chalk.bold(result.title)}`);
    console.log(`  Images: ${result.images.length} (${result.images.filter(i => i.status === 'success').length} uploaded)`);

    if (!options.cover && !result.metadata.thumbImage) {
      console.log(chalk.yellow('\n⚠ Warning: No cover image specified. Draft may not display properly.'));
    }
  } catch (error) {
    spinner.fail('Failed to create draft');
    console.error(chalk.red('Error:'), (error as Error).message);
    process.exit(1);
  }
}

export async function listDrafts(options: {
  offset?: string;
  count?: string;
}): Promise<void> {
  const spinner = ora('Fetching drafts...').start();

  try {
    const api = await getDraftAPI();
    const offset = parseInt(options.offset || '0', 10);
    const count = parseInt(options.count || '20', 10);

    const result = await api.batchGet(offset, count, true);

    spinner.succeed(`Found ${result.total_count} drafts`);

    console.log(chalk.blue(`\nDraft List (showing ${result.item_count}/${result.total_count}):`));
    console.log(chalk.gray('─'.repeat(80)));

    for (const draft of result.item) {
      const item = draft.content.news_item[0];
      console.log(`\n${chalk.yellow(item.title || 'Untitled')}`);
      console.log(`  Media ID: ${chalk.cyan(draft.media_id)}`);
      console.log(`  Author: ${item.author || 'N/A'}`);
      console.log(`  Updated: ${new Date(draft.content.update_time * 1000).toLocaleString()}`);
      if (item.digest) {
        console.log(`  Digest: ${item.digest.substring(0, 50)}${item.digest.length > 50 ? '...' : ''}`);
      }
    }
  } catch (error) {
    spinner.fail('Failed to fetch drafts');
    console.error(chalk.red('Error:'), (error as Error).message);
    process.exit(1);
  }
}

export async function getDraft(mediaId: string): Promise<void> {
  const spinner = ora('Fetching draft details...').start();

  try {
    const api = await getDraftAPI();
    const draft = await api.get(mediaId);

    spinner.succeed('Draft details fetched');

    const item = draft.content.news_item[0];

    console.log(chalk.blue('\nDraft Details:'));
    console.log(chalk.gray('─'.repeat(80)));
    console.log(`Title:    ${chalk.bold(item.title)}`);
    console.log(`Author:   ${item.author || 'N/A'}`);
    console.log(`Media ID: ${chalk.cyan(mediaId)}`);
    console.log(`Created:  ${new Date(draft.content.create_time * 1000).toLocaleString()}`);
    console.log(`Updated:  ${new Date(draft.content.update_time * 1000).toLocaleString()}`);

    if (item.digest) {
      console.log(`\nDigest:\n${item.digest}`);
    }

    if (item.content_source_url) {
      console.log(`\nSource URL: ${chalk.cyan(item.content_source_url)}`);
    }

    console.log(`\nContent length: ${item.content.length} characters`);
  } catch (error) {
    spinner.fail('Failed to fetch draft');
    console.error(chalk.red('Error:'), (error as Error).message);
    process.exit(1);
  }
}

export async function deleteDraft(mediaId: string): Promise<void> {
  const spinner = ora('Deleting draft...').start();

  try {
    const api = await getDraftAPI();
    await api.delete(mediaId);

    spinner.succeed('Draft deleted successfully');
    console.log(chalk.green(`\n✓ Draft ${chalk.cyan(mediaId)} deleted`));
  } catch (error) {
    spinner.fail('Failed to delete draft');
    console.error(chalk.red('Error:'), (error as Error).message);
    process.exit(1);
  }
}
