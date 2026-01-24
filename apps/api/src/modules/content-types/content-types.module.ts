import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthModule } from '../../common/auth/auth.module';
import { ContentTypesController } from './controllers/content-types.controller';
import { ContentTypesService } from './services/content-types.service';

/**
 * ContentTypesModule - moduł dla Content Types feature
 * AI Note: Importuj w app.module.ts
 */
@Module({
  imports: [AuthModule],
  providers: [PrismaService, ContentTypesService],
  controllers: [ContentTypesController],
  exports: [ContentTypesService],
})
export class ContentTypesModule {}





