import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { OrgSiteContextMiddleware } from './org-site-context.middleware';
import { OrgGuard } from './org.guard';
import { SiteGuard } from './site.guard';
import { OrganizationModule } from '../organization/organization.module';
import { SiteModule } from '../site/site.module';
import { PrismaService } from '../prisma/prisma.service';

@Global()
@Module({
  imports: [OrganizationModule, SiteModule],
  providers: [OrgSiteContextMiddleware, OrgGuard, SiteGuard, PrismaService],
  exports: [OrgSiteContextMiddleware, OrgGuard, SiteGuard],
})
export class OrgSiteModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(OrgSiteContextMiddleware).forRoutes('*');
  }
}
