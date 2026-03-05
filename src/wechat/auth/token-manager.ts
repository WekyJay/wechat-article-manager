/**
 * Access Token Manager
 * AccessToken 管理器 - 自动获取和刷新
 */

import axios from 'axios';
import { WeChatConfig, AccessToken, TokenStoreData } from '../types/wechat.types';
import { TokenStore } from './token-store';
import { TokenError, NetworkError } from '../../core/error';
import { logger } from '../../core/logger';

// Token 提前刷新的时间（秒）
const TOKEN_REFRESH_BUFFER = 300; // 5 minutes before expiration

export class TokenManager {
  private config: WeChatConfig;
  private store: TokenStore;
  private currentToken: AccessToken | null = null;

  constructor(config: WeChatConfig, store?: TokenStore) {
    this.config = config;
    this.store = store || new TokenStore(config.tokenCachePath);
    this.loadStoredToken();
  }

  /**
   * 获取有效的 AccessToken
   * 如果 Token 即将过期，会自动刷新
   */
  async getToken(): Promise<string> {
    // Check if current token is valid
    if (this.currentToken && !this.isExpired(this.currentToken)) {
      return this.currentToken.access_token;
    }

    // Try to load from store
    this.loadStoredToken();
    if (this.currentToken && !this.isExpired(this.currentToken)) {
      return this.currentToken.access_token;
    }

    // Fetch new token
    await this.refreshToken();
    if (!this.currentToken) {
      throw new TokenError('Failed to obtain access token');
    }

    return this.currentToken.access_token;
  }

  /**
   * 强制刷新 AccessToken
   */
  async refreshToken(): Promise<AccessToken> {
    try {
      logger.info('Fetching new access token...');

      const url = `${this.config.baseUrl}/cgi-bin/token`;
      const response = await axios.get(url, {
        params: {
          grant_type: 'client_credential',
          appid: this.config.appId,
          secret: this.config.appSecret,
        },
        timeout: this.config.timeout || 30000,
      });

      const data = response.data;

      if (data.errcode) {
        throw new TokenError(
          `Token fetch failed: ${data.errmsg} (code: ${data.errcode})`,
          data
        );
      }

      if (!data.access_token || !data.expires_in) {
        throw new TokenError('Invalid token response from WeChat API', data);
      }

      // Calculate expiration time
      const token: AccessToken = {
        access_token: data.access_token,
        expires_in: data.expires_in,
        expires_at: Date.now() + data.expires_in * 1000,
      };

      this.currentToken = token;
      this.saveToken(token);

      logger.info(`Access token obtained, expires in ${data.expires_in} seconds`);

      return token;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new NetworkError(
          `Network error while fetching token: ${error.message}`,
          error.response?.data
        );
      }
      throw error;
    }
  }

  /**
   * 清除当前 Token
   */
  clearToken(): void {
    this.currentToken = null;
    this.store.clear();
    logger.info('Access token cleared');
  }

  /**
   * 获取 Token 过期时间
   */
  getTokenExpiry(): number | null {
    return this.currentToken?.expires_at || null;
  }

  /**
   * 检查 Token 是否有效
   */
  isTokenValid(): boolean {
    if (!this.currentToken) {
      this.loadStoredToken();
    }
    return this.currentToken ? !this.isExpired(this.currentToken) : false;
  }

  private isExpired(token: AccessToken): boolean {
    // Consider token expired 5 minutes before actual expiration
    return Date.now() >= (token.expires_at - TOKEN_REFRESH_BUFFER * 1000);
  }

  private loadStoredToken(): void {
    const stored = this.store.load();
    if (stored && stored.token) {
      this.currentToken = stored.token;
      logger.debug('Token loaded from store');
    }
  }

  private saveToken(token: AccessToken): void {
    const data: TokenStoreData = {
      token,
      createdAt: Date.now(),
    };
    this.store.save(data);
    logger.debug('Token saved to store');
  }
}
