/**
 * Material API
 * 素材管理 API
 */

import fs from 'fs';
import FormData from 'form-data';
import { BaseAPI } from './base-api';
import {
  MaterialUploadResponse,
  MaterialListResponse,
  MaterialListItem,
} from '../types/wechat.types';
import { logger } from '../../core/logger';

export class MaterialAPI extends BaseAPI {
  /**
   * 上传图文消息内的图片获取 URL
   * 图片仅支持 JPG、PNG 格式，大小必须在 10MB 以下
   */
  async uploadImage(imagePath: string): Promise<MaterialUploadResponse> {
    logger.info(`Uploading image: ${imagePath}`);

    // Validate file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Validate file size (10MB limit)
    const stats = fs.statSync(imagePath);
    if (stats.size > 10 * 1024 * 1024) {
      throw new Error(`Image size exceeds 10MB limit: ${imagePath}`);
    }

    const formData = new FormData();
    formData.append('media', fs.createReadStream(imagePath));

    return this.executeWithRetry(async () => {
      const result = await this.upload<{ url: string }>(
        '/cgi-bin/media/uploadimg',
        formData
      );

      logger.info(`Image uploaded successfully: ${result.url}`);

      return {
        url: result.url,
        created_at: Math.floor(Date.now() / 1000),
      };
    });
  }

  /**
   * 上传永久图片素材
   * 返回 media_id，可用于图文消息的封面
   */
  async addMaterial(imagePath: string, type: 'image' | 'thumb' = 'image'): Promise<MaterialUploadResponse> {
    logger.info(`Adding material: ${imagePath} (type: ${type})`);

    if (!fs.existsSync(imagePath)) {
      throw new Error(`File not found: ${imagePath}`);
    }

    const formData = new FormData();
    formData.append('media', fs.createReadStream(imagePath));
    formData.append('type', type);

    return this.executeWithRetry(async () => {
      const result = await this.upload<{
        media_id: string;
        url: string;
      }>('/cgi-bin/material/add_material', formData, { type });

      logger.info(`Material added: ${result.media_id}`);

      return {
        media_id: result.media_id,
        url: result.url,
        created_at: Math.floor(Date.now() / 1000),
      };
    });
  }

  /**
   * 获取永久素材总数
   */
  async getMaterialCount(): Promise<{
    voice_count: number;
    video_count: number;
    image_count: number;
    news_count: number;
  }> {
    return this.executeWithRetry(() =>
      this.get('/cgi-bin/material/get_materialcount')
    );
  }

  /**
   * 获取永久素材列表
   * @param type 素材类型: image, video, voice, news
   * @param offset 偏移位置
   * @param count 返回数量 (1-20)
   */
  async batchGetMaterial(
    type: 'image' | 'video' | 'voice' | 'news',
    offset: number = 0,
    count: number = 20
  ): Promise<MaterialListResponse> {
    const effectiveCount = Math.min(Math.max(count, 1), 20);

    return this.executeWithRetry(() =>
      this.post('/cgi-bin/material/batchget_material', {
        type,
        offset,
        count: effectiveCount,
      })
    );
  }

  /**
   * 获取永久素材
   * @param mediaId 素材 ID
   * @param isVideo 是否为视频素材（视频需要单独处理）
   */
  async getMaterial(mediaId: string, isVideo: boolean = false): Promise<Buffer | { title: string; description: string; down_url: string }> {
    if (isVideo) {
      return this.executeWithRetry(() =>
        this.post('/cgi-bin/material/get_material', {
          media_id: mediaId,
        })
      );
    }

    // For non-video materials, we get binary data
    const token = await this.tokenManager.getToken();
    const response = await this.http.post(
      '/cgi-bin/material/get_material',
      { media_id: mediaId },
      {
        params: { access_token: token },
        responseType: 'arraybuffer',
      }
    );

    return Buffer.from(response.data);
  }

  /**
   * 删除永久素材
   */
  async deleteMaterial(mediaId: string): Promise<void> {
    logger.info(`Deleting material: ${mediaId}`);

    await this.executeWithRetry(() =>
      this.post('/cgi-bin/material/del_material', {
        media_id: mediaId,
      })
    );

    logger.info(`Material deleted: ${mediaId}`);
  }

  /**
   * 上传临时素材
   * 临时素材 3 天后自动删除
   */
  async uploadTempMedia(
    filePath: string,
    type: 'image' | 'voice' | 'video' | 'thumb'
  ): Promise<{ media_id: string; type: string; created_at: number }> {
    logger.info(`Uploading temp media: ${filePath} (type: ${type})`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const formData = new FormData();
    formData.append('media', fs.createReadStream(filePath));
    formData.append('type', type);

    return this.executeWithRetry(() =>
      this.upload('/cgi-bin/media/upload', formData, { type })
    );
  }
}
