/**
 * WeChat Formatter
 * 微信格式器 - 整合 Markdown → 微信图文消息的完整流程
 */

import fs from 'fs';
import path from 'path';
import { MarkdownParser } from './parser';
import { ImageUploader } from './image-uploader';
import { HTMLConverter } from './html-converter';
import { MaterialAPI } from '../wechat/api/material-api';
import { DraftAPI } from '../wechat/api/draft-api';
import {
  MarkdownParseResult,
  Article,
  ImageInfo,
  DraftAddResponse,
} from '../wechat/types/wechat.types';
import { logger } from '../core/logger';

export interface FormatterOptions {
  customCSS?: string;
  generateDigest?: boolean;
  defaultAuthor?: string;
}

export interface ProcessResult extends MarkdownParseResult {
  article: Article;
  draftResponse?: DraftAddResponse;
}

export class WeChatFormatter {
  private parser: MarkdownParser;
  private htmlConverter: HTMLConverter;
  private materialAPI: MaterialAPI;
  private draftAPI: DraftAPI;
  private options: FormatterOptions;

  constructor(
    materialAPI: MaterialAPI,
    draftAPI: DraftAPI,
    options: FormatterOptions = {}
  ) {
    this.materialAPI = materialAPI;
    this.draftAPI = draftAPI;
    this.options = options;
    this.parser = new MarkdownParser();
    this.htmlConverter = new HTMLConverter(options.customCSS);
  }

  /**
   * 处理 Markdown 文件
   * 完整流程: 解析 → 上传图片 → 转换 HTML → 创建草稿
   */
  async process(markdownPath: string, createDraft: boolean = false): Promise<ProcessResult> {
    logger.info(`Processing markdown file: ${markdownPath}`);

    // 1. 读取并解析 Markdown
    const content = fs.readFileSync(markdownPath, 'utf-8');
    const parseResult = this.parser.parse(content, markdownPath);

    // 2. 上传图片
    const uploader = new ImageUploader(this.materialAPI, markdownPath);
    const uploadedImages = await uploader.uploadImages(parseResult.images, 'url');

    // 3. 替换 HTML 中的图片 URL
    let html = uploader.replaceImageUrls(parseResult.html, uploadedImages);

    // 4. 转换为微信兼容的 HTML
    html = this.htmlConverter.convert(html);

    // 5. 上传封面图片
    let thumbMediaId = '';
    if (parseResult.metadata.thumbImage) {
      try {
        const coverResult = await uploader.uploadCover(parseResult.metadata.thumbImage);
        thumbMediaId = coverResult.mediaId;
      } catch (error) {
        logger.warn(`Failed to upload cover image: ${(error as Error).message}`);
      }
    }

    // 6. 生成摘要
    let digest = parseResult.metadata.digest;
    if (!digest && this.options.generateDigest !== false) {
      digest = this.parser.generateDigest(parseResult.html, 120);
    }

    // 7. 构建 Article 对象
    const article: Article = {
      title: parseResult.title,
      author: parseResult.metadata.author || this.options.defaultAuthor || '',
      digest: digest || '',
      content: html,
      content_source_url: parseResult.metadata.sourceUrl || '',
      thumb_media_id: thumbMediaId,
      show_cover_pic: thumbMediaId ? 1 : 0,
      need_open_comment: 0,
      only_fans_can_comment: 0,
    };

    let draftResponse: DraftAddResponse | undefined;

    // 8. 创建草稿（可选）
    if (createDraft) {
      if (!thumbMediaId) {
        logger.warn('Creating draft without cover image is not recommended');
      }
      draftResponse = await this.draftAPI.add([article]);
      logger.info(`Draft created: ${draftResponse.media_id}`);
    }

    return {
      ...parseResult,
      images: uploadedImages,
      html,
      article,
      draftResponse,
    };
  }

  /**
   * 批量处理多个 Markdown 文件
   */
  async processBatch(
    markdownPaths: string[],
    createDraft: boolean = false
  ): Promise<ProcessResult[]> {
    logger.info(`Batch processing ${markdownPaths.length} files`);

    const results: ProcessResult[] = [];

    for (const path of markdownPaths) {
      try {
        const result = await this.process(path, createDraft);
        results.push(result);
      } catch (error) {
        logger.error(`Failed to process ${path}: ${(error as Error).message}`);
        throw error;
      }
    }

    return results;
  }

  /**
   * 从 Markdown 内容直接处理（不读取文件）
   */
  async processContent(
    markdownContent: string,
    basePath?: string,
    createDraft: boolean = false
  ): Promise<ProcessResult> {
    logger.info('Processing markdown content');

    // 1. 解析 Markdown
    const parseResult = this.parser.parse(markdownContent, basePath);

    // 2. 上传图片
    const uploader = new ImageUploader(this.materialAPI, basePath);
    const uploadedImages = await uploader.uploadImages(parseResult.images, 'url');

    // 3. 替换 HTML 中的图片 URL
    let html = uploader.replaceImageUrls(parseResult.html, uploadedImages);

    // 4. 转换为微信兼容的 HTML
    html = this.htmlConverter.convert(html);

    // 5. 上传封面图片
    let thumbMediaId = '';
    if (parseResult.metadata.thumbImage) {
      try {
        const coverResult = await uploader.uploadCover(parseResult.metadata.thumbImage);
        thumbMediaId = coverResult.mediaId;
      } catch (error) {
        logger.warn(`Failed to upload cover image: ${(error as Error).message}`);
      }
    }

    // 6. 生成摘要
    let digest = parseResult.metadata.digest;
    if (!digest && this.options.generateDigest !== false) {
      digest = this.parser.generateDigest(parseResult.html, 120);
    }

    // 7. 构建 Article 对象
    const article: Article = {
      title: parseResult.title,
      author: parseResult.metadata.author || this.options.defaultAuthor || '',
      digest: digest || '',
      content: html,
      content_source_url: parseResult.metadata.sourceUrl || '',
      thumb_media_id: thumbMediaId,
      show_cover_pic: thumbMediaId ? 1 : 0,
      need_open_comment: 0,
      only_fans_can_comment: 0,
    };

    let draftResponse: DraftAddResponse | undefined;

    // 8. 创建草稿（可选）
    if (createDraft) {
      draftResponse = await this.draftAPI.add([article]);
      logger.info(`Draft created: ${draftResponse.media_id}`);
    }

    return {
      ...parseResult,
      images: uploadedImages,
      html,
      article,
      draftResponse,
    };
  }

  /**
   * 获取处理后的 HTML（用于预览）
   */
  getPreviewHtml(result: ProcessResult): string {
    return this.htmlConverter.wrapWithWeChatTemplate(result.html);
  }
}
