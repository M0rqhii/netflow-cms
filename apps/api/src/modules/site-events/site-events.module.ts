import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SiteEventsController } from './site-events.controller';
import { SiteEventsService } from './site-events.service';

@Module({
  controllers: [SiteEventsController],
  providers: [PrismaService, SiteEventsService],
  exports: [SiteEventsService],
})
export class SiteEventsModule {}
