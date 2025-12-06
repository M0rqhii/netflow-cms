import { Module, Global } from '@nestjs/common';
import { DebugService } from './debug.service';

/**
 * Debug Module
 * 
 * Provides debug logging functionality for development.
 * Global module - can be injected anywhere.
 */
@Global()
@Module({
  providers: [DebugService],
  exports: [DebugService],
})
export class DebugModule {}

