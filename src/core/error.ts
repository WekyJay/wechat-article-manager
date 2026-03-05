/**
 * Error Types
 * 错误类型定义
 */

export class WeChatError extends Error {
  public readonly code: number;
  public readonly details?: unknown;

  constructor(message: string, code: number, details?: unknown) {
    super(message);
    this.name = 'WeChatError';
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class TokenError extends WeChatError {
  constructor(message: string, details?: unknown) {
    super(message, 40001, details);
    this.name = 'TokenError';
  }
}

export class APIError extends WeChatError {
  constructor(message: string, code: number, details?: unknown) {
    super(message, code, details);
    this.name = 'APIError';
  }
}

export class ConfigError extends WeChatError {
  constructor(message: string, details?: unknown) {
    super(message, 10001, details);
    this.name = 'ConfigError';
  }
}

export class ValidationError extends WeChatError {
  constructor(message: string, details?: unknown) {
    super(message, 10002, details);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends WeChatError {
  constructor(message: string, details?: unknown) {
    super(message, 10003, details);
    this.name = 'NetworkError';
  }
}
