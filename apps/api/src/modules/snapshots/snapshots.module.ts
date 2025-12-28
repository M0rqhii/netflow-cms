import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SiteEventsModule } from '../site-events/site-events.module';
import { SnapshotsController } from './snapshots.controller';
import { SnapshotsService } from './snapshots.service';

@Module({
  imports: [SiteEventsModule],
  controllers: [SnapshotsController],
  providers: [PrismaService, SnapshotsService],
  exports: [SnapshotsService],
})
export class SnapshotsModule {}
