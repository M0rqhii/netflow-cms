import { Module } from '@nestjs/common';
import { OrgDashboardController } from './org-dashboard.controller';
import { OrgDashboardService } from './org-dashboard.service';
import { RbacModule } from '../rbac/rbac.module';
import { BillingModule } from '../billing/billing.module';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  imports: [RbacModule, BillingModule],
  controllers: [OrgDashboardController],
  providers: [OrgDashboardService, PrismaService],
  exports: [OrgDashboardService],
})
export class OrgDashboardModule {}





