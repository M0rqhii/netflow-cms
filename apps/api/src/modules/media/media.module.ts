import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthModule } from '../../common/auth/auth.module';
import { TenantModule } from '../../common/tenant/tenant.module';

/**
 * Media Module - handles media file management
 * AI Note: Provides endpoints for uploading, retrieving, and managing media files
 */
@Module({
  imports: [AuthModule, TenantModule],
  controllers: [MediaController],
  providers: [MediaService, PrismaService],
  exports: [MediaService],
})
export class MediaModule {}

