import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthModule } from '../../common/auth/auth.module';

/**
 * StatsModule - provides statistics endpoints
 */
@Module({
  imports: [AuthModule],
  controllers: [StatsController],
  providers: [StatsService, PrismaService],
  exports: [StatsService],
})
export class StatsModule {}

