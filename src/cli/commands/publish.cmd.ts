/**
 * Publish Commands
 * 发布管理命令
 */

import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from '../../core/config';
import { TokenManager } from '../../wechat/auth/token-manager';
import { PublishAPI } from '../../wechat/api/publish-api';
import { DraftAPI } from '../../wechat/api/draft-api';
import { MaterialAPI } from '../../wechat/api/material-api';
import { WeChatFormatter } from '../../markdown/wechat-formatter';
import { TokenStore } from '../../wechat/auth/token-store';
import { PublishStatusCode } from '../../wechat/types/wechat.types';

async function getPublishAPI(): Promise<PublishAPI> {
  const configManager = new ConfigManager();
  const config = configManager.getWeChatConfig();

  if (!config.appId || !config.appSecret) {
    throw new Error('WeChat App ID and App Secret not configured. Run "wam-cli config init" first.');
  }

  const tokenStore = new TokenStore(config.tokenCachePath);
  const tokenManager = new TokenManager(config, tokenStore);

  return new PublishAPI(config, tokenManager);
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

export async function publishDraft(
  mediaId: string,
  options: { wait?: boolean }
): Promise<void> {
  const spinner = ora('Submitting draft for publishing...').start();

  try {
    const api = await getPublishAPI();
    const result = await api.submit(mediaId);

    spinner.succeed('Draft submitted for publishing');

    console.log(chalk.green('\n✓ Publish submitted'));
    console.log(`  Publish ID: ${chalk.cyan(result.publish_id)}`);

    if (options.wait) {
      const waitSpinner = ora('Waiting for publish to complete...').start();

      try {
        const status = await api.waitForPublish(result.publish_id);
        waitSpinner.succeed('Publish completed!');

        console.log(chalk.green('\n✓ Article published successfully'));
        if (status.article_detail?.item[0]) {
          console.log(`  Article URL: ${chalk.cyan(status.article_detail.item[0].article_url)}`);
        }
      } catch (error) {
        waitSpinner.fail('Publish failed or timed out');
        console.error(chalk.red('Error:'), (error as Error).message);
        process.exit(1);
      }
    } else {
      console.log(chalk.gray('\nUse "wam-cli publish status ' + result.publish_id + '" to check status'));
    }
  } catch (error) {
    spinner.fail('Failed to submit publish');
    console.error(chalk.red('Error:'), (error as Error).message);
    process.exit(1);
  }
}

export async function publishMarkdown(
  file: string,
  options: { cover?: string; wait?: boolean }
): Promise<void> {
  // Step 1: Create draft
  const draftSpinner = ora('Creating draft from markdown...').start();

  let mediaId: string;
  try {
    const formatter = await getFormatter();
    const fs = await import('fs');

    // Handle cover image
    let content = fs.readFileSync(file, 'utf-8');
    if (options.cover && !content.includes('cover:') && !content.includes('thumbnail:')) {
      const coverLine = `cover: ${options.cover}\n`;
      if (content.startsWith('---')) {
        content = content.replace('---\n', `---\n${coverLine}`);
      } else {
        content = `---\n${coverLine}---\n\n${content}`;
      }
      const tmpFile = file + '.tmp';
      fs.writeFileSync(tmpFile, content);
      const result = await formatter.process(tmpFile, true);
      fs.unlinkSync(tmpFile);
      mediaId = result.draftResponse?.media_id || '';
    } else {
      const result = await formatter.process(file, true);
      mediaId = result.draftResponse?.media_id || '';
    }

    if (!mediaId) {
      throw new Error('Failed to create draft');
    }

    draftSpinner.succeed('Draft created');
  } catch (error) {
    draftSpinner.fail('Failed to create draft');
    console.error(chalk.red('Error:'), (error as Error).message);
    process.exit(1);
  }

  // Step 2: Publish
  const publishSpinner = ora('Publishing article...').start();

  try {
    const api = await getPublishAPI();
    const result = await api.submit(mediaId);

    publishSpinner.succeed('Article submitted for publishing');

    console.log(chalk.green('\n✓ Article publish initiated'));
    console.log(`  Draft Media ID: ${chalk.cyan(mediaId)}`);
    console.log(`  Publish ID: ${chalk.cyan(result.publish_id)}`);

    if (options.wait) {
      const waitSpinner = ora('Waiting for publish to complete...').start();

      try {
        const status = await api.waitForPublish(result.publish_id);
        waitSpinner.succeed('Article published successfully!');

        if (status.article_detail?.item[0]) {
          console.log(`\n  Article URL: ${chalk.cyan(status.article_detail.item[0].article_url)}`);
        }
      } catch (error) {
        waitSpinner.fail('Publish failed or timed out');
        console.error(chalk.red('Error:'), (error as Error).message);
        process.exit(1);
      }
    } else {
      console.log(chalk.gray('\nUse "wam-cli publish status ' + result.publish_id + '" to check status'));
    }
  } catch (error) {
    publishSpinner.fail('Failed to publish article');
    console.error(chalk.red('Error:'), (error as Error).message);
    process.exit(1);
  }
}

export async function listPublished(options: {
  offset?: string;
  count?: string;
}): Promise<void> {
  const spinner = ora('Fetching published articles...').start();

  try {
    const api = await getPublishAPI();
    const offset = parseInt(options.offset || '0', 10);
    const count = parseInt(options.count || '20', 10);

    const result = await api.batchGet(offset, count, true);

    spinner.succeed(`Found ${result.total_count} published articles`);

    console.log(chalk.blue(`\nPublished Articles (showing ${result.item_count}/${result.total_count}):`));
    console.log(chalk.gray('─'.repeat(80)));

    for (const item of result.item) {
      const article = item.content?.news_item?.[0];
      if (article) {
        console.log(`\n${chalk.yellow(article.title || 'Untitled')}`);
        console.log(`  Article ID: ${chalk.cyan(item.article_id)}`);
        console.log(`  Author: ${article.author || 'N/A'}`);
        console.log(`  Published: ${new Date(item.update_time * 1000).toLocaleString()}`);
      }
    }
  } catch (error) {
    spinner.fail('Failed to fetch published articles');
    console.error(chalk.red('Error:'), (error as Error).message);
    process.exit(1);
  }
}

export async function getPublishStatus(publishId: string): Promise<void> {
  const spinner = ora('Fetching publish status...').start();

  try {
    const api = await getPublishAPI();
    const status = await api.getStatus(publishId);

    spinner.succeed('Status fetched');

    console.log(chalk.blue('\nPublish Status:'));
    console.log(chalk.gray('─'.repeat(80)));
    console.log(`Publish ID: ${chalk.cyan(publishId)}`);

    const statusText = {
      [PublishStatusCode.SUCCESS]: chalk.green('Published (成功)'),
      [PublishStatusCode.PUBLISHING]: chalk.yellow('Publishing (发布中)'),
      [PublishStatusCode.ORIGINAL_FAILED]: chalk.yellow('Original Check Failed (原创校验失败)'),
      [PublishStatusCode.FAILED]: chalk.red('Failed (失败)'),
    }[status.publish_status] || chalk.gray('Unknown');

    console.log(`Status: ${statusText}`);

    if (status.article_id) {
      console.log(`Article ID: ${chalk.cyan(status.article_id)}`);
    }

    if (status.article_detail?.item) {
      console.log(chalk.blue('\nArticles:'));
      for (const article of status.article_detail.item) {
        console.log(`  [${article.idx}] ${chalk.cyan(article.article_url)}`);
      }
    }

    if (status.fail_idx && status.fail_idx.length > 0) {
      console.log(chalk.red(`\nFailed Articles: ${status.fail_idx.join(', ')}`));
    }
  } catch (error) {
    spinner.fail('Failed to fetch status');
    console.error(chalk.red('Error:'), (error as Error).message);
    process.exit(1);
  }
}
