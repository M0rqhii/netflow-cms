import { BadRequestException, Inject, Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FileStorage } from '../../common/providers/interfaces/file-storage.interface';
import { SiteEventsService } from '../site-events/site-events.service';

type UploadOptions = {
  siteId: string;
  userId: string;
  file: Express.Multer.File;
};

@Injectable()
export class SiteMediaService {
  private readonly logger = new Logger(SiteMediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('FileStorage') private readonly fileStorage: FileStorage,
    private readonly siteEvents: SiteEventsService,
  ) {}

  private async ensureMembership(siteId: string, userId: string) {
    // Check UserTenant membership (new multi-tenant model)
    const membership = await this.prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId: siteId } },
    });

    if (membership) {
      return; // User has membership via UserTenant
    }

    // Fallback to legacy User.tenantId check for backward compatibility
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { orgId: true },
      });

      // Check if user's organization has access to this site
      const site = await this.prisma.site.findFirst({
        where: { id: siteId, orgId: user?.orgId },
      });

      if (site) {
        return; // User has access via organization
      }
    } catch (error) {
      // If query fails, log and continue to throw ForbiddenException
      this.logger.warn(
        `Failed to check legacy tenantId for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    throw new ForbiddenException('You do not have access to this site');
  }

  private validateFile(file: Express.Multer.File) {
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(`File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`);
    }
  }

  async list(siteId: string, userId: string) {
    await this.ensureMembership(siteId, userId);

    return this.prisma.mediaItem.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        siteId: true,
        fileName: true,
        url: true,
        mimeType: true,
        size: true,
        alt: true,
        metadata: true,
        createdAt: true,
      },
    });
  }

  async upload({ siteId, userId, file }: UploadOptions) {
    await this.ensureMembership(siteId, userId);
    this.validateFile(file);

    const uploadResult = await this.fileStorage.uploadFile({
      file: file.buffer,
      filename: file.originalname,
      contentType: file.mimetype,
      tenantId: siteId,
      folder: 'site-panel/media',
      metadata: { originalName: file.originalname },
      public: true,
    });

    const media = await this.prisma.mediaItem.create({
      data: {
        siteId,
        fileName: file.originalname,
        path: uploadResult.key,
        url: uploadResult.url,
        mimeType: file.mimetype,
        size: uploadResult.size,
        metadata: { storageKey: uploadResult.key, ...uploadResult.metadata },
        uploadedById: userId,
      },
      select: {
        id: true,
        siteId: true,
        fileName: true,
        url: true,
        mimeType: true,
        size: true,
        metadata: true,
        createdAt: true,
      },
    });

    await this.siteEvents.recordEvent(
      siteId,
      userId,
      'media_uploaded',
      `Media "${media.fileName}" uploaded`,
      { mediaId: media.id, mimeType: media.mimeType, size: media.size },
    );

    return media;
  }

  async delete(siteId: string, userId: string, mediaId: string) {
    await this.ensureMembership(siteId, userId);

    const media = await this.prisma.mediaItem.findFirst({
      where: { id: mediaId, siteId },
      select: { id: true, fileName: true, metadata: true },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    const storageKey = (media.metadata as any)?.storageKey;
    if (storageKey) {
      try {
        await this.fileStorage.deleteFile({ key: storageKey, tenantId: siteId });
      } catch (error) {
        this.logger.warn(`Failed to delete file from storage: ${error instanceof Error ? error.stack : String(error)}`);
      }
    }

    await this.prisma.mediaItem.delete({ where: { id: media.id } });

    await this.siteEvents.recordEvent(
      siteId,
      userId,
      'media_deleted',
      `Media "${media.fileName}" deleted`,
      { mediaId: media.id },
    );

    return { success: true };
  }
}
