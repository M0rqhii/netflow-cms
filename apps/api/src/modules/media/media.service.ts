import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';
import { ConfigService } from '@nestjs/config';

/**
 * Media Service - handles media file operations
 * AI Note: Manages media files (upload, retrieval, deletion)
 * 
 * For MVP, files are stored with URLs (S3/CDN integration is future)
 */
@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Upload a media file
   * AI Note: Creates a MediaFile record in the database
   * The actual file upload should be handled by a file storage service (S3, etc.)
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
      throw new BadRequestException(`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`);
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

    // Generate URL (for MVP, use a placeholder - in production, upload to S3/CDN)
    const baseUrl = this.configService.get<string>('MEDIA_BASE_URL') || 'https://cdn.example.com';
    const fileUrl = `${baseUrl}/media/${tenantId}/${file.filename}`;

    // Create media file record
    return this.prisma.mediaFile.create({
      data: {
        tenantId,
        filename: dto.filename || file.originalname,
        url: fileUrl,
        mimeType: dto.mimeType || file.mimetype,
        size: dto.size || file.size,
        width: dto.width,
        height: dto.height,
        alt: dto.alt,
        metadata: dto.metadata || {},
        uploadedById,
      },
      include: {
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
   * Get all media files for a tenant
   */
  async findAll(tenantId: string, query: QueryMediaDto) {
    const { page, pageSize, mimeType, search, sortBy, sortOrder } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId,
    };

    if (mimeType) {
      where.mimeType = mimeType;
    }

    if (search) {
      where.OR = [
        { filename: { contains: search, mode: 'insensitive' } },
        { alt: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.mediaFile.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      this.prisma.mediaFile.count({ where }),
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
      this.prisma.mediaFile.count({ where: { tenantId } }),
      this.prisma.mediaFile.groupBy({
        by: ['mimeType'],
        where: { tenantId },
        _count: true,
      }),
      this.prisma.mediaFile.aggregate({
        where: { tenantId },
        _sum: { size: true },
      }),
    ]);

    return {
      total,
      totalSize: totalSize._sum.size || 0,
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
    const mediaFile = await this.prisma.mediaFile.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
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

    return this.prisma.mediaFile.update({
      where: { id: mediaFile.id },
      data: {
        filename: data.filename || mediaFile.filename,
        alt: data.alt !== undefined ? data.alt : mediaFile.alt,
        metadata: data.metadata !== undefined ? data.metadata : mediaFile.metadata,
      },
      include: {
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
   */
  async remove(tenantId: string, id: string) {
    const mediaFile = await this.findOne(tenantId, id);

    await this.prisma.mediaFile.delete({
      where: { id: mediaFile.id },
    });

    return { success: true, deleted: mediaFile };
  }
}

