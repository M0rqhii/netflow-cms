import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthModule } from '../../common/auth/auth.module';

/**
 * Webhooks Module - handles webhook management and delivery
 * AI Note: Provides endpoints for managing webhooks and delivers events to registered URLs
 */
@Module({
  imports: [AuthModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, PrismaService],
  exports: [WebhooksService],
})
export class WebhooksModule {}

