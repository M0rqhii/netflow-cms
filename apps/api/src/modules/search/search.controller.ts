import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { TenantGuard } from '../../common/tenant/tenant.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { Role } from '../../common/auth/roles.enum';
import { SearchService } from './search.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { searchSchema } from './dto/search.dto';
import { Request } from 'express';

/**
 * Search Controller - RESTful API for advanced search
 * AI Note: All endpoints require authentication and tenant context
 */
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * GET /api/v1/search
   * Unified search across all content
   */
  @Get()
  @Roles(Role.VIEWER, Role.EDITOR, Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  async search(
    @Query(new ZodValidationPipe(searchSchema))
    query: any,
    @Req() req: Request & { tenantId: string },
  ) {
    return this.searchService.search(req.tenantId, query);
  }

  /**
   * GET /api/v1/search/content
   * Search content entries
   */
  @Get('content')
  @Roles(Role.VIEWER, Role.EDITOR, Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  async searchContent(
    @Query(new ZodValidationPipe(searchSchema))
    query: any,
    @Req() req: Request & { tenantId: string },
  ) {
    return this.searchService.searchContent(req.tenantId, query);
  }

  /**
   * GET /api/v1/search/collections
   * Search collection items
   */
  @Get('collections')
  @Roles(Role.VIEWER, Role.EDITOR, Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  async searchCollections(
    @Query(new ZodValidationPipe(searchSchema))
    query: any,
    @Req() req: Request & { tenantId: string },
  ) {
    return this.searchService.searchCollections(req.tenantId, query);
  }

  /**
   * GET /api/v1/search/suggestions
   * Get search suggestions
   */
  @Get('suggestions')
  @Roles(Role.VIEWER, Role.EDITOR, Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  async getSuggestions(
    @Query('q') query: string,
    @Req() req: Request & { tenantId: string },
  ) {
    return this.searchService.getSuggestions(req.tenantId, query);
  }
}

