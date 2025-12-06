import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { DebugModule } from '../common/debug/debug.module';
import { DevController } from './dev.controller';

@Module({
  imports: [DebugModule],
  controllers: [DevController],
  providers: [PrismaService],
})
export class DevModule {}
