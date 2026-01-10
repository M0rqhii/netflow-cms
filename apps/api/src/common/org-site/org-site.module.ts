import { Module } from '@nestjs/common';
import { OrgSiteContextMiddleware } from './org-site-context.middleware';
import { OrganizationModule } from '../organization/organization.module';
import { SiteModule } from '../site/site.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [OrganizationModule, SiteModule],
  providers: [OrgSiteContextMiddleware, PrismaService],
  exports: [OrgSiteContextMiddleware],
})
export class OrgSiteModule {}
