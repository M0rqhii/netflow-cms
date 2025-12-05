import { Module } from '@nestjs/common';
import { ContentVersioningService } from './content-versioning.service';
import { ContentVersioningController } from './content-versioning.controller';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  imports: [],
  controllers: [ContentVersioningController],
  providers: [ContentVersioningService, PrismaService],
  exports: [ContentVersioningService],
})
export class ContentVersioningModule {}

