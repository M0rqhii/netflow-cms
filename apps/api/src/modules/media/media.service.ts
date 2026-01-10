import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FileStorage } from '../../common/providers/interfaces/file-storage.interface';
import { UploadMediaDto } from './dto/upload-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';
import { Prisma } from '@prisma/client';
import { SiteEventsService } from '../site-events/site-events.service';
import { FileValidatorService } from '../../common/security/file-validator.service';

/**
 * Media Service - handles media file operations
 * AI Note: Manages media files (upload, retrieval, deletion)
 * 
 * For MVP, files are stored with URLs (S3/CDN integration is future)
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private prisma: PrismaService,
    @Inject('FileStorage') private readonly fileStorage: FileStorage,
    private readonly siteEvents: SiteEventsService,
    private readonly fileValidator: FileValidatorService,
  ) {}

  /**
   * Upload a media file
   * Uses FileStorage provider to handle file upload
   */
  async upload(
    siteId: string,
    uploadedById: string,
    file: Express.Multer.File,
    dto: UploadMediaDto,
  ) {
    // Comprehensive file validation
    const allowedMimeTypes = [
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      // Videos
      'video/mp4',
      'video/webm',
      'video/ogg',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    const maxSize = 50 * 1024 * 1024; // 50MB
    this.fileValidator.validateFile(file, allowedMimeTypes, maxSize);

    // Use FileStorage provider to upload file
    const uploadResult = await this.fileStorage.uploadFile({
      file: file.buffer,
      filename: dto.filename || file.originalname,
      contentType: dto.mimeType || file.mimetype,
      tenantId: siteId, // FileStorage still uses tenantId internally (backward compatibility)
      folder: 'media',
      metadata: {
        ...(dto.metadata || {}),
        originalName: file.originalname,
      },
      public: true,
    });

    // Create media file record in database
    const media = await this.prisma.mediaItem.create({
      data: {
        siteId,
        fileName: dto.filename || file.originalname,
        path: uploadResult.key,
        url: uploadResult.url,
        mimeType: dto.mimeType || file.mimetype,
        size: dto.size || uploadResult.size,
        width: dto.width,
        height: dto.height,
        alt: dto.alt,
        metadata: {
          ...(dto.metadata || {}),
          storageKey: uploadResult.key,
          ...uploadResult.metadata,
        },
        uploadedById,
      },
      select: {
        id: true,
        siteId: true,
        fileName: true,
        url: true,
        mimeType: true,
        size: true,
        width: true,
        height: true,
        alt: true,
        metadata: true,
        uploadedById: true,
        createdAt: true,
        updatedAt: true,
        // NO tenant/site relation - Site has no access to org data
      },
    });

    await this.siteEvents.recordEvent(
      siteId,
      uploadedById ?? null,
      'media_uploaded',
      `Media "${media.fileName}" uploaded`,
      { mediaId: media.id, mimeType: media.mimeType, size: media.size },
    );

    return media;
  }

  /**
   * Get all media files for a site
   */
  async findAll(siteId: string, query: QueryMediaDto) {
    const { page, pageSize, mimeType, search, sortBy, sortOrder } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      siteId,
    };

    if (mimeType) {
      where.mimeType = mimeType;
    }

    if (search) {
      where.OR = [
        { fileName: { contains: search, mode: 'insensitive' } },
        { alt: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.mediaItem.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          id: true,
          siteId: true,
          fileName: true,
          url: true,
          mimeType: true,
          size: true,
          width: true,
          height: true,
          alt: true,
          metadata: true,
          uploadedById: true,
          createdAt: true,
          updatedAt: true,
          // NO tenant/site relation - Site has no access to org data
        },
      }),
      this.prisma.mediaItem.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get media library statistics
   * AI Note: Returns statistics about media files for a site
   */
  async getLibraryStats(siteId: string) {
    const [total, byMimeType, totalSize] = await Promise.all([
      this.prisma.mediaItem.count({ where: { siteId } }),
      this.prisma.mediaItem.groupBy({
        by: ['mimeType'],
        where: { siteId },
        _count: true,
      }),
      this.prisma.mediaItem.aggregate({
        where: { siteId },
        _sum: { size: true },
      }),
    ]);

    return {
      total,
      totalSize: totalSize._sum?.size || 0,
      byMimeType: byMimeType.map((item: any) => ({
        mimeType: item.mimeType,
        count: item._count,
      })),
    };
  }

  /**
   * Get a single media file by ID
   */
  async findOne(siteId: string, id: string) {
    const mediaFile = await this.prisma.mediaItem.findFirst({
      where: {
        id,
        siteId,
      },
      select: {
        id: true,
        siteId: true,
        fileName: true,
        url: true,
        mimeType: true,
        size: true,
        width: true,
        height: true,
        alt: true,
        metadata: true,
        uploadedById: true,
        createdAt: true,
        updatedAt: true,
        // NO tenant/site relation - Site has no access to org data
      },
    });

    if (!mediaFile) {
      throw new NotFoundException(`Media file with ID ${id} not found`);
    }

    return mediaFile;
  }

  /**
   * Update a media file
   */
  async update(siteId: string, id: string, data: { filename?: string; alt?: string; metadata?: Record<string, any> }) {
    const mediaFile = await this.findOne(siteId, id);

    const metadataValue = data.metadata !== undefined 
      ? (data.metadata === null ? Prisma.JsonNull : data.metadata)
      : (mediaFile.metadata === null ? Prisma.JsonNull : mediaFile.metadata);

    return this.prisma.mediaItem.update({
      where: { id: mediaFile.id },
      data: {
        fileName: data.filename || mediaFile.fileName,
        alt: data.alt !== undefined ? data.alt : mediaFile.alt,
        metadata: metadataValue,
      },
      select: {
        id: true,
        siteId: true,
        fileName: true,
        url: true,
        mimeType: true,
        size: true,
        width: true,
        height: true,
        alt: true,
        metadata: true,
        uploadedById: true,
        createdAt: true,
        updatedAt: true,
        // NO tenant/site relation - Site has no access to org data
      },
    });
  }

  /**
   * Delete a media file
   * Uses FileStorage provider to delete the file, then removes DB record
   */
  async remove(siteId: string, id: string, userId?: string) {
    const mediaFile = await this.findOne(siteId, id);

    // Extract storage key from metadata if available
    const metadata = mediaFile.metadata as any;
    const storageKey = metadata?.storageKey;

    // Delete from storage if key is available
    if (storageKey) {
      try {
        await this.fileStorage.deleteFile({
          key: storageKey,
          tenantId: siteId, // FileStorage still uses tenantId internally (backward compatibility)
        });
      } catch (error) {
        // Log error but continue with DB deletion
        this.logger.warn(
          `Failed to delete file from storage: ${storageKey}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    // Delete database record
    await this.prisma.mediaItem.delete({
      where: { id: mediaFile.id },
    });

    await this.siteEvents.recordEvent(
      siteId,
      userId ?? mediaFile.uploadedById ?? null,
      'media_deleted',
      `Media "${mediaFile.fileName}" deleted`,
      { mediaId: mediaFile.id },
    );

    return { success: true, deleted: mediaFile };
  }
}
