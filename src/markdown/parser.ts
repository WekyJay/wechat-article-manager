/**
 * Markdown Parser
 * Markdown 解析器
 */

import MarkdownIt from 'markdown-it';
import * as cheerio from 'cheerio';
import { MarkdownParseResult, ArticleMetadata, ImageInfo } from '../wechat/types/wechat.types';
import { logger } from '../core/logger';

// Front matter regex
const FRONT_MATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n?/;

// Image regex: ![alt](path) or <img src="path">
const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;
const HTML_IMAGE_REGEX = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;

export class MarkdownParser {
  private md: MarkdownIt;

  constructor() {
    this.md = new MarkdownIt({
      html: true,
      breaks: true,
      linkify: true,
      typographer: true,
    });

    // Add custom rules if needed
    this.configureRenderer();
  }

  /**
   * 解析 Markdown 文件内容
   */
  parse(content: string, filePath?: string): MarkdownParseResult {
    logger.debug('Parsing markdown content');

    // Extract front matter
    const { frontMatter, body } = this.extractFrontMatter(content);
    const metadata = this.parseFrontMatter(frontMatter);

    // Extract images before converting to HTML
    const images = this.extractImages(body, filePath);

    // Convert to HTML
    const html = this.md.render(body);

    // Determine title
    const title = metadata.title || this.extractTitle(body) || 'Untitled';

    return {
      title,
      content: body,
      html,
      images,
      metadata,
    };
  }

  /**
   * 提取 front matter
   */
  private extractFrontMatter(content: string): { frontMatter: string; body: string } {
    const match = content.match(FRONT_MATTER_REGEX);

    if (match) {
      return {
        frontMatter: match[1],
        body: content.slice(match[0].length),
      };
    }

    return {
      frontMatter: '',
      body: content,
    };
  }

  /**
   * 解析 front matter 为元数据
   */
  private parseFrontMatter(frontMatter: string): ArticleMetadata {
    const metadata: ArticleMetadata = {};

    if (!frontMatter.trim()) {
      return metadata;
    }

    const lines = frontMatter.split('\n');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.slice(0, colonIndex).trim();
      let value: string | string[] = line.slice(colonIndex + 1).trim();

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Handle arrays (comma-separated)
      if (value.includes(',')) {
        value = value.split(',').map(v => v.trim());
      }

      // Map common keys
      switch (key.toLowerCase()) {
        case 'title':
          metadata.title = value as string;
          break;
        case 'author':
          metadata.author = value as string;
          break;
        case 'summary':
        case 'description':
        case 'digest':
          metadata.digest = value as string;
          break;
        case 'source':
        case 'source_url':
        case 'original_url':
          metadata.sourceUrl = value as string;
          break;
        case 'cover':
        case 'thumbnail':
        case 'thumb_image':
          metadata.thumbImage = value as string;
          break;
        case 'tags':
        case 'categories':
          metadata.tags = Array.isArray(value) ? value : [value];
          break;
        case 'date':
          metadata.date = value as string;
          break;
        default:
          metadata[key] = value;
      }
    }

    return metadata;
  }

  /**
   * 从 Markdown 中提取图片
   */
  private extractImages(content: string, basePath?: string): ImageInfo[] {
    const images: ImageInfo[] = [];
    const seen = new Set<string>();

    // Match markdown images: ![alt](path)
    let match;
    while ((match = MARKDOWN_IMAGE_REGEX.exec(content)) !== null) {
      const imagePath = match[2].trim();
      if (!seen.has(imagePath)) {
        seen.add(imagePath);
        images.push(this.createImageInfo(imagePath, basePath));
      }
    }

    // Match HTML images: <img src="path">
    while ((match = HTML_IMAGE_REGEX.exec(content)) !== null) {
      const imagePath = match[1].trim();
      if (!seen.has(imagePath)) {
        seen.add(imagePath);
        images.push(this.createImageInfo(imagePath, basePath));
      }
    }

    return images;
  }

  /**
   * 创建图片信息对象
   */
  private createImageInfo(imagePath: string, basePath?: string): ImageInfo {
    const isLocal = !/^https?:\/\//i.test(imagePath);
    const fileName = imagePath.split('/').pop() || 'image';

    return {
      originalPath: imagePath,
      fileName,
      isLocal,
      status: 'pending',
    };
  }

  /**
   * 从内容中提取标题（第一个 # 开头的行）
   */
  private extractTitle(content: string): string | undefined {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    return titleMatch ? titleMatch[1].trim() : undefined;
  }

  /**
   * 配置 Markdown 渲染器
   */
  private configureRenderer(): void {
    // Customize link rendering (open in new tab)
    const defaultLinkOpen = this.md.renderer.rules.link_open || ((tokens, idx, options, env, self) => {
      return self.renderToken(tokens, idx, options);
    });

    this.md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      token.attrSet('target', '_blank');
      return defaultLinkOpen(tokens, idx, options, env, self);
    };
  }

  /**
   * 纯文本提取（用于生成摘要）
   */
  extractText(html: string): string {
    const $ = cheerio.load(html);
    return $.text().trim();
  }

  /**
   * 生成摘要
   */
  generateDigest(html: string, maxLength: number = 120): string {
    const text = this.extractText(html);
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength) + '...';
  }
}
