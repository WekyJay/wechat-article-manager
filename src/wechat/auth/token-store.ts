/**
 * Token Store
 * Token 持久化存储
 */

import fs from 'fs';
import path from 'path';
import { TokenStoreData } from '../types/wechat.types';
import { logger } from '../../core/logger';

export class TokenStore {
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), '.cache', 'token.json');
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  save(data: TokenStoreData): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
      logger.debug('Token saved to file');
    } catch (error) {
      logger.error(`Failed to save token: ${(error as Error).message}`);
    }
  }

  load(): TokenStoreData | null {
    try {
      if (!fs.existsSync(this.filePath)) {
        return null;
      }

      const raw = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(raw) as TokenStoreData;
    } catch (error) {
      logger.error(`Failed to load token: ${(error as Error).message}`);
      return null;
    }
  }

  clear(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        fs.unlinkSync(this.filePath);
        logger.debug('Token file cleared');
      }
    } catch (error) {
      logger.error(`Failed to clear token: ${(error as Error).message}`);
    }
  }

  exists(): boolean {
    return fs.existsSync(this.filePath);
  }
}
