/**
 * WeChat Official Account API Types
 * 微信公众号 API 类型定义
 */

// ==================== Configuration ====================
export interface WeChatConfig {
  appId: string;
  appSecret: string;
  baseUrl?: string;
  tokenCachePath?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface AppConfig {
  wechat: WeChatConfig;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  cacheDir: string;
}

// ==================== Access Token ====================
export interface AccessToken {
  access_token: string;
  expires_in: number;
  expires_at: number;
}

export interface TokenStoreData {
  token: AccessToken;
  createdAt: number;
}

// ==================== API Response ====================
export interface WeChatAPIResponse<T = unknown> {
  errcode?: number;
  errmsg?: string;
  data?: T;
}

// ==================== Material (素材) ====================
export interface MaterialUploadResponse {
  url: string;
  media_id?: string;
  created_at?: number;
}

export interface MaterialListItem {
  media_id: string;
  name: string;
  update_time: number;
  url: string;
}

export interface MaterialListResponse {
  total_count: number;
  item_count: number;
  item: MaterialListItem[];
}

// ==================== Draft (草稿箱) ====================
export interface Article {
  title: string;
  author?: string;
  digest?: string;
  content: string;
  content_source_url?: string;
  thumb_media_id: string;
  show_cover_pic?: number;
  need_open_comment?: number;
  only_fans_can_comment?: number;
  pic_crop_235_1?: string;
  pic_crop_1_1?: string;
}

export interface DraftNewsItem extends Article {
  url?: string;
  thumb_url?: string;
}

export interface Draft {
  media_id: string;
  content: {
    news_item: DraftNewsItem[];
    create_time: number;
    update_time: number;
  };
}

export interface DraftAddResponse {
  media_id: string;
}

export interface DraftListResponse {
  total_count: number;
  item_count: number;
  item: Draft[];
}

export interface DraftCountResponse {
  total_count: number;
}

// ==================== Publish (发布) ====================
export interface PublishSubmitResponse {
  publish_id: string;
  msg_data_id?: string;
}

export interface PublishStatus {
  publish_id: string;
  publish_status: PublishStatusCode;
  article_id?: string;
  article_detail?: {
    count: number;
    item: Array<{
      idx: number;
      article_url: string;
    }>;
  };
  fail_idx?: number[];
}

export enum PublishStatusCode {
  SUCCESS = 0,
  PUBLISHING = 1,
  ORIGINAL_FAILED = 2,
  FAILED = 3,
}

export interface PublishListItem {
  article_id: string;
  content?: {
    news_item: DraftNewsItem[];
  };
  update_time: number;
}

export interface PublishListResponse {
  total_count: number;
  item_count: number;
  item: PublishListItem[];
}

// ==================== Markdown Processing ====================
export interface ImageInfo {
  originalPath: string;
  fileName: string;
  isLocal: boolean;
  mimeType?: string;
  size?: number;
  uploadedUrl?: string;
  mediaId?: string;
  status: 'pending' | 'uploading' | 'success' | 'failed';
  error?: string;
}

export interface ArticleMetadata {
  title?: string;
  author?: string;
  digest?: string;
  sourceUrl?: string;
  thumbImage?: string;
  tags?: string[];
  date?: string;
  [key: string]: unknown;
}

export interface MarkdownParseResult {
  title: string;
  content: string;
  html: string;
  images: ImageInfo[];
  metadata: ArticleMetadata;
}

// ==================== Error Handling ====================
export interface ErrorStrategy {
  action: 'retry' | 'refresh_token' | 'throw';
  delay?: number;
  message?: string;
}

export interface APIErrorInfo {
  code: number;
  message: string;
  strategy: ErrorStrategy;
}
