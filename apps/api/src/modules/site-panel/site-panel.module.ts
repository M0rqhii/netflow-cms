import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SiteEnvironmentsController } from './site-environments.controller';
import { SitePagesController } from './site-pages.controller';
import { SiteEnvironmentsService } from './site-environments.service';
import { SitePagesService } from './site-pages.service';

@Module({
  controllers: [SiteEnvironmentsController, SitePagesController],
  providers: [PrismaService, SiteEnvironmentsService, SitePagesService],
  exports: [SiteEnvironmentsService, SitePagesService],
})
export class SitePanelModule {}
