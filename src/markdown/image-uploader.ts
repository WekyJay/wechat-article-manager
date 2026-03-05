//**
 * Image Uploader
 * 图片批量上传处理器
 */

import fs from 'fs';
import path from 'path';
import { MaterialAPI } from '../wechat/api/material-api';
import { ImageInfo } from '../wechat/types/wechat.types';
import { logger } from '../core/logger';

export class ImageUploader {
  private materialAPI: MaterialAPI;
  private basePath?: string;

  constructor(materialAPI: MaterialAPI, basePath?: string) {
    this.materialAPI = materialAPI;
    this.basePath = basePath;
  }

  /**
   * 批量上传图片
   * @param images 图片信息数组
   * @param uploadType 上传类型: 'url' 只获取 URL, 'material' 上传为永久素材
   */
  async uploadImages(
    images: ImageInfo[],
    uploadType: 'url' | 'material' = 'url'
  ): Promise<ImageInfo[]> {
    logger.info(`Uploading ${images.length} images (type: ${uploadType})`);

    const results: ImageInfo[] = [];

    for (const image of images) {
      if (!image.isLocal) {
        // Remote URL, keep as is
        results.push({
          ...image,
          status: 'success',
          uploadedUrl: image.originalPath,
        });
        continue;
      }

      try {
        const uploaded = await this.uploadSingleImage(image, uploadType);
        results.push(uploaded);
      } catch (error) {
        logger.error(`Failed to upload image ${image.originalPath}: ${(error as Error).message}`);
        results.push({
          ...image,
          status: 'failed',
          error: (error as Error).message,
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    logger.info(`Image upload completed: ${successCount}/${images.length} succeeded`);

    return results;
  }

  /**
   * 上传单张图片
   */
  private async uploadSingleImage(
    image: ImageInfo,
    uploadType: 'url' | 'material'
  ): Promise<ImageInfo> {
    const localPath = this.resolvePath(image.originalPath);

    if (!fs.existsSync(localPath)) {
      throw new Error(`Image file not found: ${localPath}`);
    }

    logger.debug(`Uploading image: ${localPath}`);

    if (uploadType === 'material') {
      const result = await this.materialAPI.addMaterial(localPath, 'image');
      return {
        ...image,
        uploadedUrl: result.url,
        mediaId: result.media_id,
        status: 'success',
      };
    } else {
      const result = await this.materialAPI.uploadImage(localPath);
      return {
        ...image,
        uploadedUrl: result.url,
        status: 'success',
      };
    }
  }

  /**
   * 上传封面图片
   * @param imagePath 封面图片路径
   */
  async uploadCover(imagePath: string): Promise<{ url: string; mediaId: string }> {
    const localPath = this.resolvePath(imagePath);

    if (!fs.existsSync(localPath)) {
      throw new Error(`Cover image not found: ${localPath}`);
    }

    logger.info(`Uploading cover image: ${localPath}`);

    // Cover needs to be uploaded as material to get media_id
    const result = await this.materialAPI.addMaterial(localPath, 'thumb');

    return {
      url: result.url || '',
      mediaId: result.media_id || '',
    };
  }

  /**
   * 解析图片路径
   */
  private resolvePath(imagePath: string): string {
    if (path.isAbsolute(imagePath)) {
      return imagePath;
    }

    if (this.basePath) {
      return path.resolve(path.dirname(this.basePath), imagePath);
    }

    return path.resolve(imagePath);
  }

  /**
   * 替换 HTML 中的图片 URL
   */
  replaceImageUrls(html: string, images: ImageInfo[]): string {
    let result = html;

    for (const image of images) {
      if (image.status === 'success' && image.uploadedUrl) {
        // Replace original path with uploaded URL
        const escapedPath = image.originalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedPath, 'g');
        result = result.replace(regex, image.uploadedUrl);
      }
    }

    return result;
  }
}
