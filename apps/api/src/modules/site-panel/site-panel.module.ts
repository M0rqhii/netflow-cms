import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SiteEnvironmentsController } from './site-environments.controller';
import { SitePagesController } from './site-pages.controller';
import { SiteEnvironmentsService } from './site-environments.service';
import { SitePagesService } from './site-pages.service';
import { SiteMediaController } from './site-media.controller';
import { SiteMediaService } from './site-media.service';
import { SiteDeploymentsController } from './site-deployments.controller';
import { SiteDeploymentsService } from './site-deployments.service';
import { SiteModulesController } from './site-modules.controller';
import { SiteModulesService } from './site-modules.service';
import { SiteEventsModule } from '../site-events/site-events.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';

@Module({
  imports: [SiteEventsModule, FeatureFlagsModule],
  controllers: [
    SiteEnvironmentsController,
    SitePagesController,
    SiteMediaController,
    SiteDeploymentsController,
    SiteModulesController,
  ],
  providers: [
    PrismaService,
    SiteEnvironmentsService,
    SitePagesService,
    SiteMediaService,
    SiteDeploymentsService,
    SiteModulesService,
  ],
  exports: [
    SiteEnvironmentsService,
    SitePagesService,
    SiteMediaService,
    SiteDeploymentsService,
    SiteModulesService,
  ],
})
export class SitePanelModule {}
