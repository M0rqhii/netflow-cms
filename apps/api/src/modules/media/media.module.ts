import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { UploadsController } from './uploads.controller';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthModule } from '../../common/auth/auth.module';
import { TenantModule } from '../../common/tenant/tenant.module';
import { SiteEventsModule } from '../site-events/site-events.module';
import { SecurityModule } from '../../common/security/security.module';

/**
 * Media Module - handles media file management
 * AI Note: Provides endpoints for uploading, retrieving, and managing media files
 */
@Module({
  imports: [AuthModule, TenantModule, SiteEventsModule, SecurityModule],
  controllers: [MediaController, UploadsController],
  providers: [MediaService, PrismaService],
  exports: [MediaService],
})
export class MediaModule {}
