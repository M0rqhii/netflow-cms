import { Module } from '@nestjs/common';
import { HooksService } from './hooks.service';
import { HooksController } from './hooks.controller';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  imports: [],
  controllers: [HooksController],
  providers: [HooksService, PrismaService],
  exports: [HooksService],
})
export class HooksModule {}

