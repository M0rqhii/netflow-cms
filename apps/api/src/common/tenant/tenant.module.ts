import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';
import { TenantService } from './tenant.service';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { PrismaService } from '../prisma/prisma.service';

/**
 * TenantModule - globalny moduł dla funkcjonalności multi-tenant
 * AI Note: Importuj w modułach wymagających tenant isolation
 */
@Global()
@Module({
  providers: [TenantService, TenantGuard, TenantContextMiddleware, PrismaService],
  // Export PrismaService so middleware resolved in AppModule context has access
  exports: [TenantService, TenantGuard, TenantContextMiddleware, PrismaService],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
