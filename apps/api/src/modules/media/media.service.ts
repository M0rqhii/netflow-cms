import { Injectable, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FileStorage } from '../../common/providers/interfaces/file-storage.interface';
import { UploadMediaDto } from './dto/upload-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';
import { Prisma } from '@prisma/client';
import { SiteEventsService } from '../site-events/site-events.service';

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
  ) {}

  /**
   * Upload a media file
   * Uses FileStorage provider to handle file upload
   */
  async upload(
    tenantId: string,
    uploadedById: string,
    file: Express.Multer.File,
    dto: UploadMediaDto,
  ) {
    // Validate file size (max 50MB for MVP)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new BadRequestException(`File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`);
    }

    // Validate MIME type
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

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`MIME type ${file.mimetype} is not allowed`);
    }

    // Use FileStorage provider to upload file
    const uploadResult = await this.fileStorage.uploadFile({
      file: file.buffer,
      filename: dto.filename || file.originalname,
      contentType: dto.mimeType || file.mimetype,
      tenantId,
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
        siteId: tenantId,
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
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    await this.siteEvents.recordEvent(
      tenantId,
      uploadedById ?? null,
      'media_uploaded',
      `Media "${media.fileName}" uploaded`,
      { mediaId: media.id, mimeType: media.mimeType, size: media.size },
    );

    return media;
  }

  /**
   * Get all media files for a tenant
   */
  async findAll(tenantId: string, query: QueryMediaDto) {
    const { page, pageSize, mimeType, search, sortBy, sortOrder } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      siteId: tenantId,
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
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
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
   * AI Note: Returns statistics about media files for a tenant
   */
  async getLibraryStats(tenantId: string) {
    const [total, byMimeType, totalSize] = await Promise.all([
      this.prisma.mediaItem.count({ where: { siteId: tenantId } }),
      this.prisma.mediaItem.groupBy({
        by: ['mimeType'],
        where: { siteId: tenantId },
        _count: true,
      }),
      this.prisma.mediaItem.aggregate({
        where: { siteId: tenantId },
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
  async findOne(tenantId: string, id: string) {
    const mediaFile = await this.prisma.mediaItem.findFirst({
      where: {
        id,
        siteId: tenantId,
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
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
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
  async update(tenantId: string, id: string, data: { filename?: string; alt?: string; metadata?: Record<string, any> }) {
    const mediaFile = await this.findOne(tenantId, id);

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
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  /**
   * Delete a media file
   * Uses FileStorage provider to delete the file, then removes DB record
   */
  async remove(tenantId: string, id: string, userId?: string) {
    const mediaFile = await this.findOne(tenantId, id);

    // Extract storage key from metadata if available
    const metadata = mediaFile.metadata as any;
    const storageKey = metadata?.storageKey;

    // Delete from storage if key is available
    if (storageKey) {
      try {
        await this.fileStorage.deleteFile({
          key: storageKey,
          tenantId,
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
      tenantId,
      userId ?? mediaFile.uploadedById ?? null,
      'media_deleted',
      `Media "${mediaFile.fileName}" deleted`,
      { mediaId: mediaFile.id },
    );

    return { success: true, deleted: mediaFile };
  }
}
