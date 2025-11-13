import { Module } from '@nestjs/common';
import { UserTenantsService } from './user-tenants.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  providers: [UserTenantsService, PrismaService],
  exports: [UserTenantsService],
})
export class UserTenantsModule {}

