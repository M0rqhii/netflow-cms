import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DebugLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  module: string;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Debug Logger Service
 * 
 * Simple in-memory debug logger for development.
 * Stores logs in memory (max 1000 entries) and provides structured logging.
 * 
 * Features:
 * - debug.info(), debug.warn(), debug.error()
 * - Timestamp, module name, optional metadata
 * - In-memory storage (development only)
 */
@Injectable()
export class DebugService {
  private readonly logs: DebugLogEntry[] = [];
  private readonly maxLogs = 1000;
  private readonly isProduction: boolean;

  constructor(private configService: ConfigService) {
    const profile = this.configService.get<string>('APP_PROFILE') || 
                   (this.configService.get<string>('NODE_ENV') === 'production' ? 'production' : 'dev');
    this.isProduction = profile === 'production';
  }

  /**
   * Log info message
   */
  info(module: string, message: string, metadata?: Record<string, any>): void {
    this.log('info', module, message, metadata);
  }

  /**
   * Log warning message
   */
  warn(module: string, message: string, metadata?: Record<string, any>): void {
    this.log('warn', module, message, metadata);
  }

  /**
   * Log error message
   */
  error(module: string, message: string, metadata?: Record<string, any>): void {
    this.log('error', module, message, metadata);
  }

  /**
   * Internal log method
   */
  private log(level: 'info' | 'warn' | 'error', module: string, message: string, metadata?: Record<string, any>): void {
    // Skip logging in production
    if (this.isProduction) {
      return;
    }

    const entry: DebugLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      ...(metadata && { metadata }),
    };

    this.logs.push(entry);

    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * Get all logs (for dev endpoint)
   */
  getLogs(limit?: number): DebugLogEntry[] {
    if (this.isProduction) {
      return [];
    }

    const logs = [...this.logs].reverse(); // Most recent first
    return limit ? logs.slice(0, limit) : logs;
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    if (!this.isProduction) {
      this.logs.length = 0;
    }
  }

  /**
   * Get log count
   */
  getLogCount(): number {
    return this.logs.length;
  }
}

