/**
 * Logger Module
 * 日志系统
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';

export class Logger {
  private static instance: winston.Logger;
  private static logDir: string = path.join(process.cwd(), 'logs');

  static getInstance(level: string = 'info'): winston.Logger {
    if (!Logger.instance) {
      // Ensure log directory exists
      if (!fs.existsSync(Logger.logDir)) {
        fs.mkdirSync(Logger.logDir, { recursive: true });
      }

      Logger.instance = winston.createLogger({
        level,
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winston.format.splat(),
          winston.format.json()
        ),
        defaultMeta: { service: 'wechat-article-manager' },
        transports: [
          // Error log
          new winston.transports.File({
            filename: path.join(Logger.logDir, 'error.log'),
            level: 'error',
          }),
          // Combined log
          new winston.transports.File({
            filename: path.join(Logger.logDir, 'combined.log'),
          }),
        ],
      });

      // Console transport for development
      if (process.env.NODE_ENV !== 'production') {
        Logger.instance.add(
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple()
            ),
          })
        );
      }
    }

    return Logger.instance;
  }

  static setLevel(level: string): void {
    if (Logger.instance) {
      Logger.instance.level = level;
    }
  }
}

// Export convenience functions
export const logger = Logger.getInstance();
