/**
 * HTML Converter
 * HTML 转换器 - 优化 HTML 以适应微信
 */

import * as cheerio from 'cheerio';
import { logger } from '../core/logger';

// WeChat specific styles and constraints
const WECHAT_CONSTRAINTS = {
  maxImageWidth: 900,
  maxImageHeight: 5000,
  supportedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'strike', 'del',
    'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'img', 'a', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tr', 'th', 'td'
  ],
  allowedAttributes: {
    '*': ['class', 'style'],
    'a': ['href', 'target'],
    'img': ['src', 'data-src', 'alt', 'title', 'width', 'height'],
    'p': ['align'],
    'div': ['align'],
    'span': ['data-*'],
  },
};

export class HTMLConverter {
  private customCSS?: string;

  constructor(customCSS?: string) {
    this.customCSS = customCSS;
  }

  /**
   * 转换 HTML 为微信兼容格式
   */
  convert(html: string): string {
    logger.debug('Converting HTML to WeChat compatible format');

    const $ = cheerio.load(html, {
      decodeEntities: false,
    });

    // Apply transformations
    this.cleanTags($);
    this.optimizeImages($);
    this.formatCodeBlocks($);
    this.cleanStyles($);
    this.addWeChatCompatibleClasses($);

    // Apply custom CSS if provided
    if (this.customCSS) {
      this.injectCustomStyles($);
    }

    // Get body HTML
    const bodyHtml = $('body').html() || $.html();

    // Final cleanup
    return this.finalCleanup(bodyHtml);
  }

  /**
   * 清理不支持的标签
   */
  private cleanTags($: cheerio.CheerioAPI): void {
    const { supportedTags } = WECHAT_CONSTRAINTS;

    $('*').each((_, element) => {
      const tagName = element.tagName.toLowerCase();

      if (!supportedTags.includes(tagName)) {
        // Replace unsupported tag with its content
        const $element = $(element);
        const content = $element.html();
        $element.replaceWith(content || '');
      }
    });
  }

  /**
   * 优化图片
   */
  private optimizeImages($: cheerio.CheerioAPI): void {
    $('img').each((_, element) => {
      const $img = $(element);

      // Remove width/height attributes to allow responsive sizing
      $img.removeAttr('width');
      $img.removeAttr('height');

      // Add data-src for lazy loading
      const src = $img.attr('src');
      if (src) {
        $img.attr('data-src', src);
        $img.attr('data-type', 'jpeg');
        $img.attr('data-ratio', '0.75');
      }

      // Add style for proper display
      $img.css({
        'max-width': '100%',
        'height': 'auto',
        'display': 'block',
      });
    });
  }

  /**
   * 格式化代码块
   */
  private formatCodeBlocks($: cheerio.CheerioAPI): void {
    $('pre').each((_, element) => {
      const $pre = $(element);
      $pre.css({
        'background-color': '#f6f8fa',
        'padding': '16px',
        'overflow-x': 'auto',
        'border-radius': '3px',
        'font-family': 'Consolas, Monaco, "Courier New", monospace',
        'font-size': '14px',
        'line-height': '1.5',
      });
    });

    $('code').each((_, element) => {
      const $code = $(element);
      const isInline = $code.parent().is('pre') === false;

      if (isInline) {
        $code.css({
          'background-color': 'rgba(27, 31, 35, 0.05)',
          'padding': '0.2em 0.4em',
          'border-radius': '3px',
          'font-family': 'Consolas, Monaco, "Courier New", monospace',
          'font-size': '85%',
        });
      } else {
        $code.css({
          'font-family': 'Consolas, Monaco, "Courier New", monospace',
          'font-size': '100%',
        });
      }
    });
  }

  /**
   * 清理样式
   */
  private cleanStyles($: cheerio.CheerioAPI): void {
    // Remove dangerous styles
    const dangerousStyles = [
      'position:fixed',
      'position:absolute',
      'z-index',
      'opacity:0',
    ];

    $('[style]').each((_, element) => {
      const $element = $(element);
      const style = $element.attr('style') || '';

      // Check for dangerous styles
      for (const dangerous of dangerousStyles) {
        if (style.toLowerCase().includes(dangerous.toLowerCase())) {
          $element.removeAttr('style');
          break;
        }
      }
    });
  }

  /**
   * 添加微信兼容的 CSS 类
   */
  private addWeChatCompatibleClasses($: cheerio.CheerioAPI): void {
    // Add WeChat specific classes
    $('p').addClass('rich_media_content_p');
    $('img').addClass('rich_media_content_img');
    $('blockquote').addClass('rich_media_content_blockquote');
    $('table').addClass('rich_media_content_table');
  }

  /**
   * 注入自定义样式
   */
  private injectCustomStyles($: cheerio.CheerioAPI): void {
    if (!this.customCSS) return;

    // WeChat doesn't support external CSS, so we need to inline styles
    // For now, just add a style tag at the beginning
    const $style = $('<style></style>').text(this.customCSS);
    $('body').prepend($style);
  }

  /**
   * 最终清理
   */
  private finalCleanup(html: string): string {
    return html
      .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
      .replace(/<p>\s*<\/p>/g, '') // Remove empty paragraphs
      .trim();
  }

  /**
   * 添加微信特定的 HTML 包装
   */
  wrapWithWeChatTemplate(html: string): string {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
/* WeChat Article Base Styles */
.rich_media_content {
  font-size: 16px;
  line-height: 1.75;
  color: #333;
}
.rich_media_content p {
  margin: 0 0 1em 0;
}
.rich_media_content img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1em 0;
}
.rich_media_content h1,
.rich_media_content h2,
.rich_media_content h3 {
  margin: 1.5em 0 0.5em;
  font-weight: bold;
  color: #000;
}
.rich_media_content h1 { font-size: 1.5em; }
.rich_media_content h2 { font-size: 1.3em; }
.rich_media_content h3 { font-size: 1.1em; }
.rich_media_content blockquote {
  margin: 1em 0;
  padding: 0 1em;
  border-left: 4px solid #ddd;
  color: #666;
}
.rich_media_content a {
  color: #576b95;
  text-decoration: none;
}
.rich_media_content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}
.rich_media_content th,
.rich_media_content td {
  padding: 8px;
  border: 1px solid #ddd;
  text-align: left;
}
.rich_media_content th {
  background-color: #f5f5f5;
}
</style>
</head>
<body>
<div class="rich_media_content">
${html}
</div>
</body>
</html>`;
  }
}
