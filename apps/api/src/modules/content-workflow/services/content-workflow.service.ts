import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ContentTypesService } from '../../content-types/services/content-types.service';
import { ReviewContentDto, CreateCommentDto, UpdateCommentDto } from '../dto';

/**
 * ContentWorkflowService - business logic dla workflow treści (review, comments)
 * AI Note: Zawsze filtruj po tenantId - multi-tenant isolation
 */
@Injectable()
export class ContentWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentTypesService: ContentTypesService,
  ) {}

  /**
   * Submit content for review
   */
  async submitForReview(
    tenantId: string,
    contentTypeSlug: string,
    entryId: string,
    userId: string,
  ) {
    const contentType = await this.contentTypesService.getBySlug(tenantId, contentTypeSlug);
    
    const entry = await this.prisma.contentEntry.findFirst({
      where: {
        id: entryId,
        tenantId,
        contentTypeId: contentType.id,
      },
    });

    if (!entry) {
      throw new NotFoundException('Content entry not found');
    }

    if (entry.status === 'review') {
      throw new BadRequestException('Content is already in review');
    }

    if (entry.status === 'published') {
      throw new BadRequestException('Published content cannot be submitted for review');
    }

    return this.prisma.contentEntry.update({
      where: { id: entryId },
      data: {
        status: 'review',
        updatedById: userId,
      },
      include: {
        contentType: {
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
   * Review content (approve/reject/request changes)
   */
  async reviewContent(
    tenantId: string,
    contentTypeSlug: string,
    entryId: string,
    reviewerId: string,
    dto: ReviewContentDto,
  ) {
    const contentType = await this.contentTypesService.getBySlug(tenantId, contentTypeSlug);
    
    const entry = await this.prisma.contentEntry.findFirst({
      where: {
        id: entryId,
        tenantId,
        contentTypeId: contentType.id,
      },
    });

    if (!entry) {
      throw new NotFoundException('Content entry not found');
    }

    if (entry.status !== 'review') {
      throw new BadRequestException('Content must be in review status');
    }

    // Create review record
    await this.prisma.contentReview.create({
      data: {
        contentEntryId: entryId,
        tenantId,
        reviewerId,
        status: dto.status,
        comment: dto.comment,
      },
    });

    // Update entry based on review status
    const updateData: {
      status: string;
      reviewedAt: Date;
      reviewedById: string;
      publishedAt?: Date;
      updatedById: string;
    } = {
      status: dto.status === 'approved' ? 'published' : dto.status === 'rejected' ? 'draft' : 'draft',
      reviewedAt: new Date(),
      reviewedById: reviewerId,
      updatedById: reviewerId,
    };

    if (dto.status === 'approved') {
      updateData.publishedAt = new Date();
    }

    return this.prisma.contentEntry.update({
      where: { id: entryId },
      data: updateData,
      include: {
        contentType: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  /**
   * Get review history for content entry
   */
  async getReviewHistory(
    tenantId: string,
    contentTypeSlug: string,
    entryId: string,
  ) {
    const contentType = await this.contentTypesService.getBySlug(tenantId, contentTypeSlug);
    
    const entry = await this.prisma.contentEntry.findFirst({
      where: {
        id: entryId,
        tenantId,
        contentTypeId: contentType.id,
      },
    });

    if (!entry) {
      throw new NotFoundException('Content entry not found');
    }

    return this.prisma.contentReview.findMany({
      where: {
        contentEntryId: entryId,
        tenantId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create comment on content entry
   */
  async createComment(
    tenantId: string,
    contentTypeSlug: string,
    entryId: string,
    authorId: string,
    dto: CreateCommentDto,
  ) {
    const contentType = await this.contentTypesService.getBySlug(tenantId, contentTypeSlug);
    
    const entry = await this.prisma.contentEntry.findFirst({
      where: {
        id: entryId,
        tenantId,
        contentTypeId: contentType.id,
      },
    });

    if (!entry) {
      throw new NotFoundException('Content entry not found');
    }

    return this.prisma.contentComment.create({
      data: {
        contentEntryId: entryId,
        tenantId,
        authorId,
        content: dto.content,
      },
    });
  }

  /**
   * Get comments for content entry
   */
  async getComments(
    tenantId: string,
    contentTypeSlug: string,
    entryId: string,
    includeResolved: boolean = false,
  ) {
    const contentType = await this.contentTypesService.getBySlug(tenantId, contentTypeSlug);
    
    const entry = await this.prisma.contentEntry.findFirst({
      where: {
        id: entryId,
        tenantId,
        contentTypeId: contentType.id,
      },
    });

    if (!entry) {
      throw new NotFoundException('Content entry not found');
    }

    return this.prisma.contentComment.findMany({
      where: {
        contentEntryId: entryId,
        tenantId,
        ...(includeResolved ? {} : { resolved: false }),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Update comment
   */
  async updateComment(
    tenantId: string,
    contentTypeSlug: string,
    entryId: string,
    commentId: string,
    authorId: string,
    dto: UpdateCommentDto,
  ) {
    const contentType = await this.contentTypesService.getBySlug(tenantId, contentTypeSlug);
    
    const entry = await this.prisma.contentEntry.findFirst({
      where: {
        id: entryId,
        tenantId,
        contentTypeId: contentType.id,
      },
    });

    if (!entry) {
      throw new NotFoundException('Content entry not found');
    }

    const comment = await this.prisma.contentComment.findFirst({
      where: {
        id: commentId,
        contentEntryId: entryId,
        tenantId,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only author can update their comment
    if (comment.authorId !== authorId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    return this.prisma.contentComment.update({
      where: { id: commentId },
      data: {
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.resolved !== undefined && { resolved: dto.resolved }),
      },
    });
  }

  /**
   * Delete comment
   */
  async deleteComment(
    tenantId: string,
    contentTypeSlug: string,
    entryId: string,
    commentId: string,
    userId: string,
  ) {
    const contentType = await this.contentTypesService.getBySlug(tenantId, contentTypeSlug);
    
    const entry = await this.prisma.contentEntry.findFirst({
      where: {
        id: entryId,
        tenantId,
        contentTypeId: contentType.id,
      },
    });

    if (!entry) {
      throw new NotFoundException('Content entry not found');
    }

    const comment = await this.prisma.contentComment.findFirst({
      where: {
        id: commentId,
        contentEntryId: entryId,
        tenantId,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only author or admin can delete
    if (comment.authorId !== userId) {
      // Check if user is admin (would need to check role, simplified here)
      // For now, only author can delete
      throw new ForbiddenException('You can only delete your own comments');
    }

    return this.prisma.contentComment.delete({
      where: { id: commentId },
    });
  }
}

