import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { AuthModule } from '../../common/auth/auth.module';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * TenantsModule - tenant management module
 * AI Note: Provides tenant CRUD endpoints with SUPER_ADMIN protection
 */
@Module({
  imports: [AuthModule],
  controllers: [TenantsController],
  providers: [TenantsService, PrismaService],
  exports: [TenantsService],
})
export class TenantsModule {}


