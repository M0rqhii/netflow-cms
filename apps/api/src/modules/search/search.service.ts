import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PrismaOptimizationService } from '../../common/prisma/prisma-optimization.service';
import { ElasticsearchService } from './elasticsearch.service';
import { SearchDto } from './dto/search.dto';
import { ConfigService } from '@nestjs/config';

/**
 * Search Service - handles advanced search with Elasticsearch
 * AI Note: Provides full-text search, faceted search, and search suggestions
 * 
 * For MVP, uses Prisma full-text search
 * In production, integrate with Elasticsearch
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private prisma: PrismaService,
    private prismaOptimization: PrismaOptimizationService,
    private elasticsearch: ElasticsearchService,
    private configService: ConfigService,
  ) {}

  /**
   * Search content entries with advanced filtering and faceting
   * AI Note: Uses Elasticsearch if enabled, otherwise falls back to PostgreSQL tsvector
   */
  async searchContent(tenantId: string, dto: SearchDto) {
    // Try Elasticsearch first if enabled
    const elasticsearchEnabled = this.configService.get<string>('ELASTICSEARCH_ENABLED') === 'true';
    if (elasticsearchEnabled && dto.query) {
      try {
        const esResult = await this.elasticsearch.search(
          'content_entries',
          dto.query,
          {
            tenantId,
            status: dto.filters?.status,
            dateRange: dto.filters?.dateRange,
          },
          dto.facets,
          dto.page,
          dto.pageSize,
        );

        if (esResult.hits.length > 0) {
          // Enrich with content types
          const contentTypeIds = [...new Set(esResult.hits.map((h: any) => h.contentTypeId))];
          const contentTypes = await this.prisma.contentType.findMany({
            where: { id: { in: contentTypeIds } },
            select: { id: true, name: true, slug: true },
          });
          const contentTypeMap = new Map(contentTypes.map(ct => [ct.id, ct]));

          const enrichedItems = esResult.hits.map((hit: any) => ({
            ...hit,
            contentType: contentTypeMap.get(hit.contentTypeId),
          }));

          return {
            items: enrichedItems,
            pagination: {
              page: dto.page,
              pageSize: dto.pageSize,
              total: esResult.total,
              totalPages: Math.ceil(esResult.total / dto.pageSize),
            },
            query: dto.query,
            facets: esResult.facets,
            suggestions: esResult.suggestions,
            didYouMean: esResult.didYouMean,
          };
        }
      } catch (error) {
        // Fallback to database search on error
        this.logger.warn('Elasticsearch search failed, falling back to database:', error instanceof Error ? error.stack : String(error));
      }
    }

    // Fallback to database search (existing implementation)
    const { query, contentTypeSlug, page, pageSize, sortBy, sortOrder, filters, facets } = dto;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId,
    };

    if (contentTypeSlug) {
      const contentType = await this.prisma.contentType.findFirst({
        where: { siteId: tenantId, slug: contentTypeSlug },
      });
      if (contentType) {
        where.contentTypeId = contentType.id;
      }
    }

    // Apply filters
    if (filters) {
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.dateRange) {
        if (filters.dateRange.from) {
          where.createdAt = { ...where.createdAt, gte: new Date(filters.dateRange.from) };
        }
        if (filters.dateRange.to) {
          where.createdAt = { ...where.createdAt, lte: new Date(filters.dateRange.to) };
        }
      }
    }

    // Build orderBy from sortBy
    let orderBy: any = { createdAt: 'desc' };
    if (sortBy) {
      const desc = sortBy.startsWith('-');
      const fieldName = desc ? sortBy.slice(1) : sortBy;
      const validFields = ['createdAt', 'updatedAt', 'status', 'publishedAt'];
      if (validFields.includes(fieldName)) {
        orderBy = { [fieldName]: desc ? 'desc' : 'asc' };
      }
    } else if (sortOrder) {
      orderBy = { createdAt: sortOrder };
    }

    // Use PrismaOptimizationService for optimized select-only query
    const selectFields = {
      id: true,
      tenantId: true,
      contentTypeId: true,
      data: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
    };

    // For full-text search, use raw SQL with tsvector if searchVector column exists
    // Otherwise fall back to Prisma filtering
    let items: any[];
    let total: number;

    if (query && query.trim()) {
      // Use raw SQL for full-text search with tsvector
      // Sanitize search query to prevent SQL injection
      const searchTerms = query
        .trim()
        .split(/\s+/)
        .map(term => term.replace(/[^\w]/g, ''))
        .filter(term => term.length > 0)
        .join(' & ');

      if (searchTerms) {
        // Build WHERE conditions with proper parameter indexing
        const conditions: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        // Always include tenantId
        conditions.push(`"tenantId" = $${paramIndex}`);
        params.push(tenantId);
        paramIndex++;

        // Add other filters with proper parameter indexing
        if (where.contentTypeId) {
          conditions.push(`"contentTypeId" = $${paramIndex}`);
          params.push(where.contentTypeId);
          paramIndex++;
        }
        if (where.status) {
          conditions.push(`"status" = $${paramIndex}`);
          params.push(where.status);
          paramIndex++;
        }
        if (where.createdAt) {
          if (where.createdAt.gte) {
            conditions.push(`"createdAt" >= $${paramIndex}`);
            params.push(where.createdAt.gte);
            paramIndex++;
          }
          if (where.createdAt.lte) {
            conditions.push(`"createdAt" <= $${paramIndex}`);
            params.push(where.createdAt.lte);
            paramIndex++;
          }
        }

        // Add search conditions - searchTerms is sanitized above
        const searchParamIndex = paramIndex;
        params.push(searchTerms);
        paramIndex++;
        
        // ILIKE search parameter
        const ilikeParamIndex = paramIndex;
        params.push(`%${query.replace(/'/g, "''")}%`); // Escape single quotes for SQL
        paramIndex++;

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const searchClause = `AND ("searchVector" @@ to_tsquery('english', $${searchParamIndex}) OR "data"::text ILIKE $${ilikeParamIndex})`;

        // Validate orderBy to prevent SQL injection
        const orderByClause = orderBy.createdAt && ['asc', 'desc'].includes(orderBy.createdAt.toLowerCase())
          ? `"createdAt" ${orderBy.createdAt.toUpperCase()}`
          : '"createdAt" DESC';

        // Add pagination parameters
        const limitParamIndex = paramIndex;
        const offsetParamIndex = paramIndex + 1;
        params.push(pageSize, skip);

        // Explicitly select columns to avoid tsvector deserialization issues
        const [results, countResult] = await Promise.all([
          this.prisma.$queryRawUnsafe<any[]>(
            `SELECT 
              id,
              "tenantId",
              "contentTypeId",
              data,
              status,
              "createdAt",
              "updatedAt",
              "publishedAt",
              "reviewedAt",
              "reviewedById",
              "createdById",
              "updatedById"
            FROM "content_entries" ${whereClause} ${searchClause} ORDER BY ${orderByClause} LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`,
            ...params,
          ),
          this.prisma.$queryRawUnsafe<[{ count: bigint }]>(
            `SELECT COUNT(*) as count FROM "content_entries" ${whereClause} ${searchClause}`,
            ...params.slice(0, -2), // Remove LIMIT/OFFSET params
          ),
        ]);

        items = results;
        total = Number(countResult[0]?.count || 0);
      } else {
        // Fallback to Prisma
        [items, total] = await Promise.all([
          this.prismaOptimization.findManyOptimized('contentEntry', where, selectFields, {
            skip,
            take: pageSize,
            orderBy,
          }),
          this.prismaOptimization.countOptimized('contentEntry', where),
        ]);
      }
    } else {
      // No query, just filtering
      [items, total] = await Promise.all([
        this.prismaOptimization.findManyOptimized('contentEntry', where, selectFields, {
          skip,
          take: pageSize,
          orderBy,
        }),
        this.prismaOptimization.countOptimized('contentEntry', where),
      ]);
    }

    // Load content types for items
    const contentTypeIds = [...new Set(items.map((item: any) => item.contentTypeId))];
    const contentTypes = await this.prisma.contentType.findMany({
      where: { id: { in: contentTypeIds } },
      select: { id: true, name: true, slug: true },
    });
    const contentTypeMap = new Map(contentTypes.map(ct => [ct.id, ct]));

    const enrichedItems = items.map((item: any) => ({
      ...item,
      contentType: contentTypeMap.get(item.contentTypeId),
    }));

    // Generate facets if requested
    const facetResults: Record<string, any> = {};
    if (facets && facets.length > 0) {
      for (const facetField of facets) {
        if (facetField === 'status') {
          const statusFacet = await this.prisma.$queryRawUnsafe<Array<{ status: string; count: bigint }>>(
            `SELECT "status", COUNT(*) as count FROM "content_entries" WHERE "tenantId" = $1 GROUP BY "status"`,
            tenantId,
          );
          facetResults.status = statusFacet.map(f => ({ value: f.status, count: Number(f.count) }));
        } else if (facetField === 'contentType') {
          const contentTypeFacet = await this.prisma.$queryRawUnsafe<Array<{ contentTypeId: string; count: bigint }>>(
            `SELECT "contentTypeId", COUNT(*) as count FROM "content_entries" WHERE "tenantId" = $1 GROUP BY "contentTypeId"`,
            tenantId,
          );
          const contentTypeIds = contentTypeFacet.map(f => f.contentTypeId);
          const contentTypeNames = await this.prisma.contentType.findMany({
            where: { id: { in: contentTypeIds } },
            select: { id: true, name: true, slug: true },
          });
          const nameMap = new Map(contentTypeNames.map(ct => [ct.id, ct]));
          facetResults.contentType = contentTypeFacet.map(f => ({
            value: nameMap.get(f.contentTypeId)?.slug || f.contentTypeId,
            label: nameMap.get(f.contentTypeId)?.name || f.contentTypeId,
            count: Number(f.count),
          }));
        }
      }
    }

    return {
      items: enrichedItems,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      query,
      facets: Object.keys(facetResults).length > 0 ? facetResults : undefined,
    };
  }

  /**
   * Search collection items
   * AI Note: Full-text search across collection items
   */
  async searchCollections(tenantId: string, dto: SearchDto) {
    const { query, collectionSlug, page, pageSize, sortBy, sortOrder } = dto;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId,
      status: 'PUBLISHED', // Only search published items
    };

    if (collectionSlug) {
      const collection = await this.prisma.collection.findFirst({
        where: { siteId: tenantId, slug: collectionSlug },
      });
      if (collection) {
        where.collectionId = collection.id;
      }
    }

    const [items] = await Promise.all([
      this.prisma.collectionItem.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
        include: {
          collection: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
    ]);

    // Filter by query (simple contains search for MVP)
    const filtered = items.filter((item: any) => {
      const data = item.data as any;
      const searchableText = JSON.stringify(data).toLowerCase();
      return searchableText.includes(query.toLowerCase());
    });

    return {
      items: filtered,
      pagination: {
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize),
      },
      query,
    };
  }

  /**
   * Unified search
   * AI Note: Search across all content types and collections
   */
  async search(tenantId: string, dto: SearchDto) {
    const [contentResults, collectionResults] = await Promise.all([
      this.searchContent(tenantId, dto),
      this.searchCollections(tenantId, dto),
    ]);

    return {
      content: contentResults,
      collections: collectionResults,
      total: contentResults.pagination.total + collectionResults.pagination.total,
    };
  }

  /**
   * Search suggestions
   * AI Note: Provides search suggestions based on query
   */
  async getSuggestions(_tenantId: string, query: string) {
    // For MVP, return empty suggestions
    // In production, use Elasticsearch completion suggester
    return {
      suggestions: [],
      query,
    };
  }

  /**
   * Index content for search
   * AI Note: Indexes content in Elasticsearch (for production)
   */
  async indexContent(_tenantId: string, _contentId: string) {
    // For MVP, no indexing
    // In production, index content in Elasticsearch
    return { success: true, indexed: false };
  }

  /**
   * Remove content from search index
   * AI Note: Removes content from Elasticsearch index (for production)
   */
  async removeFromIndex(_tenantId: string, _contentId: string) {
    // For MVP, no indexing
    // In production, remove from Elasticsearch index
    return { success: true, removed: false };
  }
}

