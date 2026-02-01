import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../../../common/auth/guards/auth.guard';
import { RolesGuard } from '../../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../../common/auth/guards/permissions.guard';
import { Permissions } from '../../../common/auth/decorators/permissions.decorator';
import { Permission } from '../../../common/auth/roles.enum';
import { CurrentUser, CurrentUserPayload } from '../../../common/auth/decorators/current-user.decorator';
import { CurrentSite } from '../../../common/decorators/current-site.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { ContentWorkflowService } from '../services/content-workflow.service';
import {
  reviewContentSchema,
  createCommentSchema,
  updateCommentSchema,
} from '../dto';

/**
 * ContentWorkflowController - RESTful API dla workflow treści (review, comments)
 * AI Note: Wszystkie endpointy wymagają autentykacji i X-Site-ID header
 */
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Controller('content/:contentTypeSlug/:entryId')
export class ContentWorkflowController {
  constructor(private readonly workflowService: ContentWorkflowService) {}

  /**
   * POST /api/v1/content/:contentTypeSlug/:entryId/submit
   * Submit content for review
   */
  @Post('submit')
  @Permissions(Permission.CONTENT_WRITE)
  @HttpCode(HttpStatus.OK)
  submitForReview(
    @CurrentSite() siteId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Param('contentTypeSlug') contentTypeSlug: string,
    @Param('entryId') entryId: string,
  ) {
    return this.workflowService.submitForReview(siteId, contentTypeSlug, entryId, user.id);
  }

  /**
   * POST /api/v1/content/:contentTypeSlug/:entryId/review
   * Review content (approve/reject/request changes)
   */
  @Post('review')
  @Permissions(Permission.CONTENT_REVIEW)
  @HttpCode(HttpStatus.OK)
  reviewContent(
    @CurrentSite() siteId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Param('contentTypeSlug') contentTypeSlug: string,
    @Param('entryId') entryId: string,
    @Body(new ZodValidationPipe(reviewContentSchema)) dto: any,
  ) {
    return this.workflowService.reviewContent(
      siteId,
      contentTypeSlug,
      entryId,
      user.id,
      dto as any,
    );
  }

  /**
   * GET /api/v1/content/:contentTypeSlug/:entryId/reviews
   * Get review history
   */
  @Get('reviews')
  @Permissions(Permission.CONTENT_READ)
  getReviewHistory(
    @CurrentSite() siteId: string,
    @Param('contentTypeSlug') contentTypeSlug: string,
    @Param('entryId') entryId: string,
  ) {
    return this.workflowService.getReviewHistory(siteId, contentTypeSlug, entryId);
  }

  /**
   * POST /api/v1/content/:contentTypeSlug/:entryId/comments
   * Create comment
   */
  @Post('comments')
  @Permissions(Permission.CONTENT_COMMENT)
  createComment(
    @CurrentSite() siteId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Param('contentTypeSlug') contentTypeSlug: string,
    @Param('entryId') entryId: string,
    @Body(new ZodValidationPipe(createCommentSchema)) dto: any,
  ) {
    return this.workflowService.createComment(
      siteId,
      contentTypeSlug,
      entryId,
      user.id,
      dto as any,
    );
  }

  /**
   * GET /api/v1/content/:contentTypeSlug/:entryId/comments
   * Get comments
   */
  @Get('comments')
  @Permissions(Permission.CONTENT_READ)
  getComments(
    @CurrentSite() siteId: string,
    @Param('contentTypeSlug') contentTypeSlug: string,
    @Param('entryId') entryId: string,
    @Query('includeResolved') includeResolved?: string,
  ) {
    return this.workflowService.getComments(
      siteId,
      contentTypeSlug,
      entryId,
      includeResolved === 'true',
    );
  }

  /**
   * PATCH /api/v1/content/:contentTypeSlug/:entryId/comments/:commentId
   * Update comment
   */
  @Patch('comments/:commentId')
  @Permissions(Permission.CONTENT_COMMENT)
  updateComment(
    @CurrentSite() siteId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Param('contentTypeSlug') contentTypeSlug: string,
    @Param('entryId') entryId: string,
    @Param('commentId') commentId: string,
    @Body(new ZodValidationPipe(updateCommentSchema)) dto: any,
  ) {
    return this.workflowService.updateComment(
      siteId,
      contentTypeSlug,
      entryId,
      commentId,
      user.id,
      dto as any,
    );
  }

  /**
   * DELETE /api/v1/content/:contentTypeSlug/:entryId/comments/:commentId
   * Delete comment
   */
  @Delete('comments/:commentId')
  @Permissions(Permission.CONTENT_COMMENT)
  @HttpCode(HttpStatus.OK)
  deleteComment(
    @CurrentSite() siteId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Param('contentTypeSlug') contentTypeSlug: string,
    @Param('entryId') entryId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.workflowService.deleteComment(
      siteId,
      contentTypeSlug,
      entryId,
      commentId,
      user.id,
    );
  }
}

