import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { SiteGuard } from '../../common/org-site/site.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { Role } from '../../common/auth/roles.enum';
import { SearchService } from './search.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { searchSchema } from './dto/search.dto';
import { Request } from 'express';

/**
 * Search Controller - RESTful API for advanced search
 * AI Note: All endpoints require authentication and site context
 */
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * GET /api/v1/search
   * Unified search across all content
   */
  @Get()
  @Roles(Role.VIEWER, Role.EDITOR, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  async search(
    @Query(new ZodValidationPipe(searchSchema))
    query: any,
    @Req() req: Request & { siteId: string },
  ) {
    return this.searchService.search(req.siteId, query);
  }

  /**
   * GET /api/v1/search/content
   * Search content entries
   */
  @Get('content')
  @Roles(Role.VIEWER, Role.EDITOR, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  async searchContent(
    @Query(new ZodValidationPipe(searchSchema))
    query: any,
    @Req() req: Request & { siteId: string },
  ) {
    return this.searchService.searchContent(req.siteId, query);
  }

  /**
   * GET /api/v1/search/collections
   * Search collection items
   */
  @Get('collections')
  @Roles(Role.VIEWER, Role.EDITOR, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  async searchCollections(
    @Query(new ZodValidationPipe(searchSchema))
    query: any,
    @Req() req: Request & { siteId: string },
  ) {
    return this.searchService.searchCollections(req.siteId, query);
  }

  /**
   * GET /api/v1/search/suggestions
   * Get search suggestions
   */
  @Get('suggestions')
  @Roles(Role.VIEWER, Role.EDITOR, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  async getSuggestions(
    @Query('q') query: string,
    @Req() req: Request & { siteId: string },
  ) {
    return this.searchService.getSuggestions(req.siteId, query);
  }
}

