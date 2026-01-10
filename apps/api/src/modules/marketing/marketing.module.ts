import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantModule } from '../../common/tenant/tenant.module';
import { AuthModule } from '../../common/auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';

/**
 * MarketingModule - moduł dla Marketing & Distribution
 * 
 * Flow:
 * 1. Editor tworzy content (draft)
 * 2. Marketing Editor tworzy wersje postów (draft)
 * 3. Marketing Manager lub Publisher publikuje (strona / social / ads)
 */
@Module({
  imports: [TenantModule, AuthModule, RbacModule],
  controllers: [MarketingController],
  providers: [MarketingService, PrismaService],
  exports: [MarketingService],
})
export class MarketingModule {}





