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
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { CurrentSite } from '../../common/decorators/current-site.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/auth/decorators/current-user.decorator';
import { SiteMediaService } from './site-media.service';

type UploadedFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@UseGuards(AuthGuard)
@Controller('site-panel/:siteId/media')
export class SiteMediaController {
  constructor(private readonly siteMediaService: SiteMediaService) {}

  @Get()
  @Throttle(1000, 60) // 1000 requests per minute - high limit for media operations
  async list(
    @Param('siteId') siteId: string,
    @CurrentSite() _: string, // Validated by middleware
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.siteMediaService.list(siteId, user.id);
  }

  @Post()
  @Throttle(500, 60) // 500 requests per minute - high limit for uploads
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('siteId') siteId: string,
    @CurrentSite() _: string, // Validated by middleware
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp|svg|mp4|webm|pdf|doc|docx|txt)/ }),
        ],
      }),
    )
    file: UploadedFile,
  ) {
    // siteId is validated by middleware to match currentSiteId
    return this.siteMediaService.upload({ siteId, userId: user.id, file });
  }

  @Delete(':mediaId')
  @Throttle(500, 60) // 500 requests per minute - high limit for deletes
  async delete(
    @Param('siteId') siteId: string,
    @Param('mediaId') mediaId: string,
    @CurrentSite() _: string, // Validated by middleware
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.siteMediaService.delete(siteId, user.id, mediaId);
  }
}
