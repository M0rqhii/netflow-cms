import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SiteSeoController } from './site-seo.controller';
import { SiteSeoService } from './site-seo.service';

@Module({
  controllers: [SiteSeoController],
  providers: [PrismaService, SiteSeoService],
  exports: [SiteSeoService],
})
export class SiteSeoModule {}
