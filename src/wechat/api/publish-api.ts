/**
 * Publish API
 * 发布管理 API
 */

import { BaseAPI } from './base-api';
import {
  PublishSubmitResponse,
  PublishStatus,
  PublishListResponse,
  PublishStatusCode,
} from '../types/wechat.types';
import { logger } from '../../core/logger';

export class PublishAPI extends BaseAPI {
  /**
   * 发布草稿
   * @param mediaId 草稿素材 ID
   */
  async submit(mediaId: string): Promise<PublishSubmitResponse> {
    logger.info(`Submitting draft for publish: ${mediaId}`);

    const result = await this.executeWithRetry(() =>
      this.post('/cgi-bin/freepublish/submit', {
        media_id: mediaId,
      })
    );

    logger.info(`Publish submitted, publish_id: ${result.publish_id}`);

    return result;
  }

  /**
   * 查询发布状态
   * @param publishId 发布任务 ID
   */
  async getStatus(publishId: string): Promise<PublishStatus> {
    return this.executeWithRetry(() =>
      this.post('/cgi-bin/freepublish/get', {
        publish_id: publishId,
      })
    );
  }

  /**
   * 查询发布状态（带重试直到完成或失败）
   * @param publishId 发布任务 ID
   * @param maxWaitTime 最大等待时间（毫秒）
   * @param checkInterval 检查间隔（毫秒）
   */
  async waitForPublish(
    publishId: string,
    maxWaitTime: number = 60000,
    checkInterval: number = 3000
  ): Promise<PublishStatus> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getStatus(publishId);

      if (status.publish_status === PublishStatusCode.SUCCESS) {
        logger.info(`Publish completed successfully: ${publishId}`);
        return status;
      }

      if (status.publish_status === PublishStatusCode.FAILED) {
        throw new Error(`Publish failed: ${publishId}`);
      }

      if (status.publish_status === PublishStatusCode.ORIGINAL_FAILED) {
        logger.warn(`Publish completed but originality check failed: ${publishId}`);
        return status;
      }

      // Still publishing, wait and retry
      logger.info(`Publishing in progress, waiting... (${publishId})`);
      await this.sleep(checkInterval);
    }

    throw new Error(`Publish timeout after ${maxWaitTime}ms: ${publishId}`);
  }

  /**
   * 获取已发布列表
   * @param offset 偏移量
   * @param count 返回数量 (1-20)
   * @param noContent 是否返回 content 字段
   */
  async batchGet(
    offset: number = 0,
    count: number = 20,
    noContent: boolean = true
  ): Promise<PublishListResponse> {
    const effectiveCount = Math.min(Math.max(count, 1), 20);

    logger.info(`Getting publish list: offset=${offset}, count=${effectiveCount}`);

    return this.executeWithRetry(() =>
      this.post('/cgi-bin/freepublish/batchget', {
        offset,
        count: effectiveCount,
        no_content: noContent ? 1 : 0,
      })
    );
  }

  /**
   * 删除已发布图文
   * @param articleId 图文消息 ID
   * @param index 要删除的文章在图文消息中的位置
   */
  async delete(articleId: string, index: number = 0): Promise<void> {
    logger.info(`Deleting published article: ${articleId}, index: ${index}`);

    await this.executeWithRetry(() =>
      this.post('/cgi-bin/freepublish/delete', {
        article_id: articleId,
        index,
      })
    );

    logger.info(`Published article deleted: ${articleId}`);
  }

  /**
   * 获取已发布图文信息
   * @param articleId 图文消息 ID
   */
  async getArticle(articleId: string): Promise<{ news_item: unknown[] }> {
    return this.executeWithRetry(() =>
      this.post('/cgi-bin/freepublish/getarticle', {
        article_id: articleId,
      })
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
