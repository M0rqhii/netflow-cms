import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SiteSeoController } from './site-seo.controller';
import { SiteSeoService } from './site-seo.service';
import { SiteEventsModule } from '../site-events/site-events.module';

@Module({
  imports: [SiteEventsModule],
  controllers: [SiteSeoController],
  providers: [PrismaService, SiteSeoService],
  exports: [SiteSeoService],
})
export class SiteSeoModule {}
