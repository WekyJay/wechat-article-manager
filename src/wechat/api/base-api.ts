/**
 * Base API Class
 * API 基础类 - 封装请求、错误处理、重试逻辑
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { WeChatConfig } from '../types/wechat.types';
import { TokenManager } from '../auth/token-manager';
import { APIError, NetworkError } from '../../core/error';
import { logger } from '../../core/logger';

// 微信 API 错误码处理策略
const ERROR_STRATEGIES: Record<number, { action: 'retry' | 'refresh_token' | 'throw'; delay?: number; message?: string }> = {
  [-1]: { action: 'retry', delay: 1000, message: '系统繁忙' },
  [40001]: { action: 'refresh_token', message: 'Token 过期' },
  [40014]: { action: 'refresh_token', message: 'Token 无效' },
  [40013]: { action: 'throw', message: 'AppID 无效' },
  [40164]: { action: 'throw', message: 'IP 未在白名单' },
  [45009]: { action: 'throw', message: '接口调用超过频率限制' },
  [48001]: { action: 'throw', message: 'API 未授权' },
  [50002]: { action: 'retry', delay: 2000, message: '用户受限' },
  [61451]: { action: 'throw', message: '参数错误' },
  [61452]: { action: 'throw', message: '无效的操作' },
};

export abstract class BaseAPI {
  protected http: AxiosInstance;
  protected config: WeChatConfig;
  protected tokenManager: TokenManager;

  constructor(config: WeChatConfig, tokenManager: TokenManager) {
    this.config = config;
    this.tokenManager = tokenManager;

    this.http = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.http.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    );
  }

  /**
   * 带 Token 的 GET 请求
   */
  protected async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const token = await this.tokenManager.getToken();
    const response = await this.http.get<T>(url, {
      params: {
        ...params,
        access_token: token,
      },
    });
    return this.handleResponse(response);
  }

  /**
   * 带 Token 的 POST 请求
   */
  protected async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const token = await this.tokenManager.getToken();
    const response = await this.http.post<T>(url, data, {
      ...config,
      params: {
        ...config?.params,
        access_token: token,
      },
    });
    return this.handleResponse(response);
  }

  /**
   * 带 Token 的文件上传
   */
  protected async upload<T>(url: string, formData: FormData, params?: Record<string, unknown>): Promise<T> {
    const token = await this.tokenManager.getToken();
    const response = await this.http.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      params: {
        ...params,
        access_token: token,
      },
    });
    return this.handleResponse(response);
  }

  /**
   * 处理响应数据
   */
  private handleResponse<T>(response: AxiosResponse<T>): T {
    const data = response.data as Record<string, unknown>;

    // Check for WeChat API error
    if (data.errcode !== undefined && data.errcode !== 0) {
      const errcode = data.errcode as number;
      const errmsg = (data.errmsg as string) || 'Unknown error';

      const strategy = ERROR_STRATEGIES[errcode] || { action: 'throw' };

      if (strategy.action === 'refresh_token' && (errcode === 40001 || errcode === 40014)) {
        // Token error will be handled by retry mechanism
        throw new APIError(`${strategy.message}: ${errmsg}`, errcode, data);
      }

      throw new APIError(`${strategy.message || errmsg} (code: ${errcode})`, errcode, data);
    }

    return response.data;
  }

  /**
   * 错误处理
   */
  private handleError(error: unknown): Promise<never> {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const data = error.response.data as Record<string, unknown>;
        if (data.errcode) {
          return Promise.reject(new APIError(
            data.errmsg as string || 'API Error',
            data.errcode as number,
            data
          ));
        }
      }
      return Promise.reject(new NetworkError(`Network error: ${error.message}`));
    }

    return Promise.reject(error);
  }

  /**
   * 带重试的请求执行
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.maxRetries || 3
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (error instanceof APIError) {
          const strategy = ERROR_STRATEGIES[error.code];

          // Don't retry on certain errors
          if (strategy?.action === 'throw') {
            throw error;
          }

          // Handle token refresh
          if (strategy?.action === 'refresh_token') {
            logger.warn(`Token error (code: ${error.code}), refreshing...`);
            await this.tokenManager.refreshToken();
            continue; // Retry with new token
          }

          // Handle retry with delay
          if (strategy?.action === 'retry' && attempt < maxRetries) {
            const delay = strategy.delay || 1000 * Math.pow(2, attempt);
            logger.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
            await this.sleep(delay);
            continue;
          }
        }

        // For non-API errors or exhausted retries
        if (attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt);
          logger.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
