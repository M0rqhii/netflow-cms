import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { AuthModule } from '../../common/auth/auth.module';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * AccountModule - Account management module
 * AI Note: Provides account endpoints without org/site context
 */
@Module({
  imports: [AuthModule],
  controllers: [AccountController],
  providers: [AccountService, PrismaService],
  exports: [AccountService],
})
export class AccountModule {}

