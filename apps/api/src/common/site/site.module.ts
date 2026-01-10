import { Module } from '@nestjs/common';
import { SiteService } from './site.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [SiteService, PrismaService],
  exports: [SiteService],
})
export class SiteModule {}
