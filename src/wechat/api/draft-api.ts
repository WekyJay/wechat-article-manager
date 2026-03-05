/**
 * Draft API
 * 草稿箱管理 API
 */

import { BaseAPI } from './base-api';
import {
  Article,
  Draft,
  DraftAddResponse,
  DraftListResponse,
  DraftCountResponse,
} from '../types/wechat.types';
import { logger } from '../../core/logger';

export class DraftAPI extends BaseAPI {
  /**
   * 新增草稿
   * @param articles 图文消息数组 (1-8 篇)
   */
  async add(articles: Article[]): Promise<DraftAddResponse> {
    if (articles.length === 0 || articles.length > 8) {
      throw new Error('Articles count must be between 1 and 8');
    }

    logger.info(`Creating draft with ${articles.length} article(s)`);

    // Validate required fields
    for (const article of articles) {
      if (!article.title || !article.content || !article.thumb_media_id) {
        throw new Error('Each article must have title, content, and thumb_media_id');
      }
    }

    return this.executeWithRetry(() =>
      this.post('/cgi-bin/draft/add', {
        articles,
      })
    );
  }

  /**
   * 获取草稿
   * @param mediaId 草稿素材 ID
   */
  async get(mediaId: string): Promise<Draft> {
    logger.info(`Getting draft: ${mediaId}`);

    return this.executeWithRetry(() =>
      this.post('/cgi-bin/draft/get', {
        media_id: mediaId,
      })
    );
  }

  /**
   * 更新草稿
   * @param mediaId 草稿素材 ID
   * @param index 要更新的文章在图文消息中的位置（多图文消息时，此字段才有意义），第一篇为 0
   * @param article 文章内容
   */
  async update(mediaId: string, index: number, article: Article): Promise<void> {
    logger.info(`Updating draft: ${mediaId}, index: ${index}`);

    if (!article.title || !article.content || !article.thumb_media_id) {
      throw new Error('Article must have title, content, and thumb_media_id');
    }

    await this.executeWithRetry(() =>
      this.post('/cgi-bin/draft/update', {
        media_id: mediaId,
        index,
        articles: article,
      })
    );

    logger.info(`Draft updated: ${mediaId}`);
  }

  /**
   * 删除草稿
   * @param mediaId 草稿素材 ID
   */
  async delete(mediaId: string): Promise<void> {
    logger.info(`Deleting draft: ${mediaId}`);

    await this.executeWithRetry(() =>
      this.post('/cgi-bin/draft/delete', {
        media_id: mediaId,
      })
    );

    logger.info(`Draft deleted: ${mediaId}`);
  }

  /**
   * 获取草稿总数
   */
  async count(): Promise<DraftCountResponse> {
    return this.executeWithRetry(() =>
      this.get('/cgi-bin/draft/count')
    );
  }

  /**
   * 获取草稿列表
   * @param offset 偏移量
   * @param count 返回数量 (1-20)
   * @param noContent 是否返回 content 字段 (1=不返回，0=返回)
   */
  async batchGet(
    offset: number = 0,
    count: number = 20,
    noContent: boolean = true
  ): Promise<DraftListResponse> {
    const effectiveCount = Math.min(Math.max(count, 1), 20);

    logger.info(`Getting draft list: offset=${offset}, count=${effectiveCount}`);

    return this.executeWithRetry(() =>
      this.post('/cgi-bin/draft/batchget', {
        offset,
        count: effectiveCount,
        no_content: noContent ? 1 : 0,
      })
    );
  }

  /**
   * 开关评论
   * @param mediaId 草稿素材 ID
   * @param enable 是否开启评论
   * @param onlyFans 是否只有粉丝可以评论
   */
  async switchComment(
    mediaId: string,
    enable: boolean,
    onlyFans: boolean = false
  ): Promise<void> {
    await this.executeWithRetry(() =>
      this.post('/cgi-bin/comment/switch', {
        msg_data_id: mediaId,
        index: 0,
        switch: enable ? 1 : 0,
      })
    );
  }
}
