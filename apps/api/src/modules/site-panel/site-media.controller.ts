import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/auth/decorators/current-user.decorator';
import { SiteMediaService } from './site-media.service';

@UseGuards(AuthGuard)
@Controller('site-panel/:siteId/media')
export class SiteMediaController {
  constructor(private readonly siteMediaService: SiteMediaService) {}

  @Get()
  async list(@Param('siteId') siteId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.siteMediaService.list(siteId, user.id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('siteId') siteId: string,
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp|svg|mp4|webm|pdf|doc|docx|txt)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.siteMediaService.upload({ siteId, userId: user.id, file });
  }

  @Delete(':mediaId')
  async delete(
    @Param('siteId') siteId: string,
    @Param('mediaId') mediaId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.siteMediaService.delete(siteId, user.id, mediaId);
  }
}
