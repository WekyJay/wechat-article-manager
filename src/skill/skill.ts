/**
 * OpenClaw Skill Integration
 * OpenClaw Skill 集成
 */

import { WeChatFormatter } from '../markdown/wechat-formatter';
import { ConfigManager } from '../core/config';
import { TokenManager } from '../wechat/auth/token-manager';
import { MaterialAPI } from '../wechat/api/material-api';
import { DraftAPI } from '../wechat/api/draft-api';
import { PublishAPI } from '../wechat/api/publish-api';
import { TokenStore } from '../wechat/auth/token-store';
import { logger } from '../core/logger';

export class WeChatSkill {
  private configManager: ConfigManager;
  private formatter?: WeChatFormatter;
  private materialAPI?: MaterialAPI;
  private draftAPI?: DraftAPI;
  private publishAPI?: PublishAPI;

  constructor(configPath?: string) {
    this.configManager = new ConfigManager(configPath);
  }

  private async initAPIs(): Promise<void> {
    if (this.formatter) return;

    const config = this.configManager.getWeChatConfig();

    if (!config.appId || !config.appSecret) {
      throw new Error(
        'WeChat not configured. Please run: /wechat-init'
      );
    }

    const tokenStore = new TokenStore(config.tokenCachePath);
    const tokenManager = new TokenManager(config, tokenStore);

    this.materialAPI = new MaterialAPI(config, tokenManager);
    this.draftAPI = new DraftAPI(config, tokenManager);
    this.publishAPI = new PublishAPI(config, tokenManager);

    const appConfig = this.configManager.getConfig();
    this.formatter = new WeChatFormatter(this.materialAPI, this.draftAPI, {
      defaultAuthor: appConfig.defaultAuthor,
    });
  }

  /**
   * Initialize WeChat configuration
   */
  async init(appId: string, appSecret: string, defaultAuthor?: string): Promise<void> {
    this.configManager.updateWeChatConfig({ appId, appSecret });

    if (defaultAuthor) {
      const config = this.configManager.getConfig();
      this.configManager.saveConfig({
        ...config,
        defaultAuthor,
      });
    }

    // Test connection
    await this.initAPIs();
    const token = await this.materialAPI!.tokenManager.getToken();

    logger.info('WeChat configuration initialized successfully');
  }

  /**
   * Upload image
   */
  async uploadImage(imagePath: string): Promise<{ url: string; mediaId?: string }> {
    await this.initAPIs();
    const result = await this.materialAPI!.uploadImage(imagePath);
    return { url: result.url, mediaId: result.media_id };
  }

  /**
   * Create draft from markdown
   */
  async createDraft(markdownPath: string, coverPath?: string): Promise<{ mediaId: string; title: string }> {
    await this.initAPIs();

    const fs = await import('fs');
    let content = fs.readFileSync(markdownPath, 'utf-8');

    // Inject cover if provided
    if (coverPath && !content.includes('cover:') && !content.includes('thumbnail:')) {
      const coverLine = `cover: ${coverPath}\n`;
      if (content.startsWith('---')) {
        content = content.replace('---\n', `---\n${coverLine}`);
      } else {
        content = `---\n${coverLine}---\n\n${content}`;
      }
      const tmpFile = markdownPath + '.tmp';
      fs.writeFileSync(tmpFile, content);
      const result = await this.formatter!.process(tmpFile, true);
      fs.unlinkSync(tmpFile);
      return { mediaId: result.draftResponse!.media_id, title: result.title };
    }

    const result = await this.formatter!.process(markdownPath, true);
    return { mediaId: result.draftResponse!.media_id, title: result.title };
  }

  /**
   * List drafts
   */
  async listDrafts(offset: number = 0, count: number = 20): Promise<Array<{
    mediaId: string;
    title: string;
    author?: string;
    updateTime: Date;
  }>> {
    await this.initAPIs();
    const result = await this.draftAPI!.batchGet(offset, count, true);

    return result.item.map(draft => ({
      mediaId: draft.media_id,
      title: draft.content.news_item[0]?.title || 'Untitled',
      author: draft.content.news_item[0]?.author,
      updateTime: new Date(draft.content.update_time * 1000),
    }));
  }

  /**
   * Publish draft
   */
  async publish(mediaId: string, wait: boolean = false): Promise<{
    publishId: string;
    status?: string;
    articleUrl?: string;
  }> {
    await this.initAPIs();
    const result = await this.publishAPI!.submit(mediaId);

    if (wait) {
      const status = await this.publishAPI!.waitForPublish(result.publish_id);
      return {
        publishId: result.publish_id,
        status: status.publish_status.toString(),
        articleUrl: status.article_detail?.item[0]?.article_url,
      };
    }

    return { publishId: result.publish_id };
  }

  /**
   * Publish markdown directly
   */
  async publishMarkdown(markdownPath: string, coverPath?: string, wait: boolean = false): Promise<{
    draftMediaId: string;
    publishId: string;
    status?: string;
    articleUrl?: string;
  }> {
    const { mediaId } = await this.createDraft(markdownPath, coverPath);
    const publishResult = await this.publish(mediaId, wait);

    return {
      draftMediaId: mediaId,
      ...publishResult,
    };
  }

  /**
   * Process markdown and return HTML preview
   */
  async preview(markdownPath: string): Promise<{
    title: string;
    html: string;
    text: string;
    images: string[];
  }> {
    await this.initAPIs();
    const result = await this.formatter!.process(markdownPath, false);

    return {
      title: result.title,
      html: result.html,
      text: result.article.digest || '',
      images: result.images.filter(i => i.uploadedUrl).map(i => i.uploadedUrl!),
    };
  }
}

// Export singleton instance
export const wechatSkill = new WeChatSkill();
