import { Module } from '@nestjs/common';
import { SitesController } from './sites.controller';
import { SiteModule } from '../../common/site/site.module';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * SitesModule - Module for site management endpoints
 * AI Note: Provides REST API for creating, reading, updating, and deleting sites
 * PrismaService is provided here for controller-level access
 */
@Module({
  imports: [SiteModule],
  controllers: [SitesController],
  providers: [PrismaService],
})
export class SitesModule {}
