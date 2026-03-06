import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { PlatformUsersController } from './platform-users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../../common/auth/auth.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsModule } from '../../common/notifications/notifications.module';

/**
 * UsersModule - user management module
 * AI Note: Provides user endpoints with RBAC protection
 */
@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [UsersController, PlatformUsersController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}


