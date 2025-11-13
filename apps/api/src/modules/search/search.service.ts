import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
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
  constructor(
    private prisma: PrismaService,
    // @ts-ignore - Reserved for future use
    private _configService: ConfigService,
  ) {}

  /**
   * Search content entries
   * AI Note: Full-text search across content entries
   */
  async searchContent(tenantId: string, dto: SearchDto) {
    const { query, contentTypeSlug, page, pageSize, sortBy, sortOrder } = dto;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId,
    };

    if (contentTypeSlug) {
      const contentType = await this.prisma.contentType.findFirst({
        where: { tenantId, slug: contentTypeSlug },
      });
      if (contentType) {
        where.contentTypeId = contentType.id;
      }
    }

    // For MVP, use Prisma's contains search
    // In production, use Elasticsearch for full-text search
    const [items] = await Promise.all([
      this.prisma.contentEntry.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
        include: {
          contentType: {
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
        where: { tenantId, slug: collectionSlug },
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

