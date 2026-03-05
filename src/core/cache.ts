/**
 * File Cache System
 * 文件缓存系统
 */

import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export class Cache {
  private cacheDir: string;

  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir || path.join(process.cwd(), '.cache');
    this.ensureCacheDir();
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      logger.debug(`Cache directory created: ${this.cacheDir}`);
    }
  }

  get<T>(key: string): T | null {
    const filePath = this.getFilePath(key);

    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);

      // Check expiration
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        this.delete(key);
        return null;
      }

      return parsed.value as T;
    } catch (error) {
      logger.error(`Failed to read cache for key ${key}: ${(error as Error).message}`);
      return null;
    }
  }

  set<T>(key: string, value: T, ttlSeconds?: number): void {
    const filePath = this.getFilePath(key);

    try {
      const data: CacheEntry<T> = {
        value,
        createdAt: Date.now(),
        expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
      };

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      logger.debug(`Cache set for key: ${key}`);
    } catch (error) {
      logger.error(`Failed to write cache for key ${key}: ${(error as Error).message}`);
    }
  }

  delete(key: string): void {
    const filePath = this.getFilePath(key);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.debug(`Cache deleted for key: ${key}`);
      }
    } catch (error) {
      logger.error(`Failed to delete cache for key ${key}: ${(error as Error).message}`);
    }
  }

  clear(): void {
    try {
      if (fs.existsSync(this.cacheDir)) {
        const files = fs.readdirSync(this.cacheDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this.cacheDir, file));
        }
        logger.info('Cache cleared');
      }
    } catch (error) {
      logger.error(`Failed to clear cache: ${(error as Error).message}`);
    }
  }

  private getFilePath(key: string): string {
    // Sanitize key for filename
    const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.cacheDir, `${sanitizedKey}.json`);
  }
}

interface CacheEntry<T> {
  value: T;
  createdAt: number;
  expiresAt?: number;
}
