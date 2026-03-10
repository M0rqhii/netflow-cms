import { Module } from '@nestjs/common';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthModule } from '../../common/auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';

/**
 * ActivityModule - provides activity feed endpoints
 */
@Module({
  imports: [AuthModule, RbacModule],
  controllers: [ActivityController],
  providers: [ActivityService, PrismaService],
  exports: [ActivityService],
})
export class ActivityModule {}









