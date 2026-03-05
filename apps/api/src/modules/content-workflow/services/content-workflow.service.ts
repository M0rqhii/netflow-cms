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
 * AI Note: Zawsze filtruj po siteId i waliduj orgId - site isolation
 */
@Injectable()
export class ContentWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentTypesService: ContentTypesService,
  ) {}

  /**
   * Validates that the site belongs to the organization
   * @throws ForbiddenException if site doesn't belong to org
   */
  private async validateSiteBelongsToOrg(siteId: string, orgId: string): Promise<void> {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: { orgId: true },
    });
    if (!site) {
      throw new NotFoundException('Site not found');
    }
    if (site.orgId !== orgId) {
      throw new ForbiddenException('Site does not belong to this organization');
    }
  }

  /**
   * Submit content for review
   */
  async submitForReview(
    siteId: string,
    orgId: string,
    contentTypeSlug: string,
    entryId: string,
    userId: string,
  ) {
    await this.validateSiteBelongsToOrg(siteId, orgId);
    const contentType = await this.contentTypesService.getBySlug(siteId, orgId, contentTypeSlug);
    
    const entry = await this.prisma.contentEntry.findFirst({
      where: {
        id: entryId,
        siteId: siteId,
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
    siteId: string,
    orgId: string,
    contentTypeSlug: string,
    entryId: string,
    reviewerId: string,
    dto: ReviewContentDto,
  ) {
    await this.validateSiteBelongsToOrg(siteId, orgId);
    const contentType = await this.contentTypesService.getBySlug(siteId, orgId, contentTypeSlug);
    
    const entry = await this.prisma.contentEntry.findFirst({
      where: {
        id: entryId,
        siteId: siteId,
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
        siteId: siteId,
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
    siteId: string,
    orgId: string,
    contentTypeSlug: string,
    entryId: string,
  ) {
    await this.validateSiteBelongsToOrg(siteId, orgId);
    const contentType = await this.contentTypesService.getBySlug(siteId, orgId, contentTypeSlug);
    
    const entry = await this.prisma.contentEntry.findFirst({
      where: {
        id: entryId,
        siteId: siteId,
        contentTypeId: contentType.id,
      },
    });

    if (!entry) {
      throw new NotFoundException('Content entry not found');
    }

    return this.prisma.contentReview.findMany({
      where: {
        contentEntryId: entryId,
        siteId: siteId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create comment on content entry
   */
  async createComment(
    siteId: string,
    orgId: string,
    contentTypeSlug: string,
    entryId: string,
    authorId: string,
    dto: CreateCommentDto,
  ) {
    await this.validateSiteBelongsToOrg(siteId, orgId);
    const contentType = await this.contentTypesService.getBySlug(siteId, orgId, contentTypeSlug);
    
    const entry = await this.prisma.contentEntry.findFirst({
      where: {
        id: entryId,
        siteId: siteId,
        contentTypeId: contentType.id,
      },
    });

    if (!entry) {
      throw new NotFoundException('Content entry not found');
    }

    return this.prisma.contentComment.create({
      data: {
        contentEntryId: entryId,
        siteId: siteId,
        authorId,
        content: dto.content,
      },
    });
  }

  /**
   * Get comments for content entry
   */
  async getComments(
    siteId: string,
    orgId: string,
    contentTypeSlug: string,
    entryId: string,
    includeResolved: boolean = false,
  ) {
    await this.validateSiteBelongsToOrg(siteId, orgId);
    const contentType = await this.contentTypesService.getBySlug(siteId, orgId, contentTypeSlug);
    
    const entry = await this.prisma.contentEntry.findFirst({
      where: {
        id: entryId,
        siteId: siteId,
        contentTypeId: contentType.id,
      },
    });

    if (!entry) {
      throw new NotFoundException('Content entry not found');
    }

    return this.prisma.contentComment.findMany({
      where: {
        contentEntryId: entryId,
        siteId: siteId,
        ...(includeResolved ? {} : { resolved: false }),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Update comment
   */
  async updateComment(
    siteId: string,
    orgId: string,
    contentTypeSlug: string,
    entryId: string,
    commentId: string,
    authorId: string,
    dto: UpdateCommentDto,
  ) {
    await this.validateSiteBelongsToOrg(siteId, orgId);
    const contentType = await this.contentTypesService.getBySlug(siteId, orgId, contentTypeSlug);
    
    const entry = await this.prisma.contentEntry.findFirst({
      where: {
        id: entryId,
        siteId: siteId,
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
        siteId: siteId,
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
    siteId: string,
    orgId: string,
    contentTypeSlug: string,
    entryId: string,
    commentId: string,
    userId: string,
  ) {
    await this.validateSiteBelongsToOrg(siteId, orgId);
    const contentType = await this.contentTypesService.getBySlug(siteId, orgId, contentTypeSlug);
    
    const entry = await this.prisma.contentEntry.findFirst({
      where: {
        id: entryId,
        siteId: siteId,
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
        siteId: siteId,
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

