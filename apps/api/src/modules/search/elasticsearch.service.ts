import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Elasticsearch Service
 * AI Note: Provides Elasticsearch/OpenSearch integration for advanced search
 * 
 * Features:
 * - Index management
 * - Document indexing and updates
 * - Search with faceting, suggestions, "did you mean"
 * - Sync worker for background indexing
 * - Reindexing support
 */
@Injectable()
export class ElasticsearchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ElasticsearchService.name);
  private client: any; // Elasticsearch client (install @elastic/elasticsearch)
  private readonly enabled: boolean;
  private readonly indexPrefix: string;

  constructor(private configService: ConfigService) {
    this.enabled = this.configService.get<string>('ELASTICSEARCH_ENABLED') === 'true';
    this.indexPrefix = this.configService.get<string>('ELASTICSEARCH_INDEX_PREFIX') || 'netflow-cms';
    
    if (this.enabled) {
      // Initialize Elasticsearch client
      // In production, install: npm install @elastic/elasticsearch
      // const { Client } = require('@elastic/elasticsearch');
      // this.client = new Client({
      //   node: this.configService.get<string>('ELASTICSEARCH_URL') || 'http://localhost:9200',
      // });
      this.logger.warn('Elasticsearch integration requires @elastic/elasticsearch package');
    }
  }

  async onModuleInit() {
    if (this.enabled && this.client) {
      await this.ensureIndices();
    }
  }

  async onModuleDestroy() {
    // Cleanup if needed
  }

  /**
   * Ensure indices exist
   */
  private async ensureIndices() {
    if (!this.client) return;

    const indices = ['content_entries', 'collection_items'];
    
    for (const index of indices) {
      const indexName = `${this.indexPrefix}-${index}`;
      try {
        const exists = await this.client.indices.exists({ index: indexName });
        if (!exists) {
          await this.client.indices.create({
            index: indexName,
            body: {
              mappings: {
                properties: {
                  id: { type: 'keyword' },
                  tenantId: { type: 'keyword' },
                  data: { type: 'text', analyzer: 'standard' },
                  status: { type: 'keyword' },
                  createdAt: { type: 'date' },
                  updatedAt: { type: 'date' },
                  // Add more fields based on schema
                },
              },
              settings: {
                analysis: {
                  analyzer: {
                    custom_analyzer: {
                      type: 'custom',
                      tokenizer: 'standard',
                      filter: ['lowercase', 'stop', 'snowball'],
                    },
                  },
                },
              },
            },
          });
          this.logger.log(`Created Elasticsearch index: ${indexName}`);
        }
      } catch (error) {
        this.logger.error(`Failed to ensure index ${indexName}:`, error);
      }
    }
  }

  /**
   * Index a document
   */
  async indexDocument(
    index: 'content_entries' | 'collection_items',
    id: string,
    document: any,
  ): Promise<void> {
    if (!this.enabled || !this.client) {
      return; // Fallback to database search
    }

    try {
      const indexName = `${this.indexPrefix}-${index}`;
      await this.client.index({
        index: indexName,
        id,
        body: document,
        refresh: 'wait_for', // Wait for index to be searchable
      });
    } catch (error) {
      this.logger.error(`Failed to index document ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update a document
   */
  async updateDocument(
    index: 'content_entries' | 'collection_items',
    id: string,
    document: any,
  ): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      const indexName = `${this.indexPrefix}-${index}`;
      await this.client.update({
        index: indexName,
        id,
        body: {
          doc: document,
        },
        refresh: 'wait_for',
      });
    } catch (error) {
      this.logger.error(`Failed to update document ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(
    index: 'content_entries' | 'collection_items',
    id: string,
  ): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      const indexName = `${this.indexPrefix}-${index}`;
      await this.client.delete({
        index: indexName,
        id,
        refresh: 'wait_for',
      });
    } catch (error) {
      this.logger.error(`Failed to delete document ${id}:`, error);
      // Don't throw - document might not exist
    }
  }

  /**
   * Search with advanced features
   */
  async search(
    index: 'content_entries' | 'collection_items',
    query: string,
    filters?: Record<string, any>,
    facets?: string[],
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{
    hits: any[];
    total: number;
    facets?: Record<string, any>;
    suggestions?: string[];
    didYouMean?: string;
  }> {
    if (!this.enabled || !this.client) {
      return { hits: [], total: 0 };
    }

    try {
      const indexName = `${this.indexPrefix}-${index}`;
      const from = (page - 1) * pageSize;

      const searchBody: any = {
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query,
                  fields: ['data^2', 'title^3'], // Boost title matches
                  type: 'best_fields',
                  fuzziness: 'AUTO',
                },
              },
            ],
          },
        },
        from,
        size: pageSize,
        highlight: {
          fields: {
            data: {},
            title: {},
          },
        },
      };

      // Add filters
      if (filters) {
        const filterClauses: any[] = [];
        if (filters.tenantId) {
          filterClauses.push({ term: { tenantId: filters.tenantId } });
        }
        if (filters.status) {
          filterClauses.push({ term: { status: filters.status } });
        }
        if (filters.dateRange) {
          filterClauses.push({
            range: {
              createdAt: {
                gte: filters.dateRange.from,
                lte: filters.dateRange.to,
              },
            },
          });
        }
        if (filterClauses.length > 0) {
          searchBody.query.bool.filter = filterClauses;
        }
      }

      // Add aggregations for faceting
      if (facets && facets.length > 0) {
        searchBody.aggs = {};
        facets.forEach(facet => {
          searchBody.aggs[facet] = {
            terms: {
              field: facet,
              size: 20,
            },
          };
        });
      }

      // Add suggestions
      searchBody.suggest = {
        text: query,
        suggestion: {
          term: {
            field: 'data',
            suggest_mode: 'popular',
          },
        },
      };

      const result = await this.client.search({
        index: indexName,
        body: searchBody,
      });

      const hits = result.body.hits.hits.map((hit: any) => ({
        ...hit._source,
        _score: hit._score,
        _highlight: hit.highlight,
      }));

      // Extract facets
      const facetResults: Record<string, any> = {};
      if (facets && result.body.aggregations) {
        facets.forEach(facet => {
          if (result.body.aggregations[facet]) {
            facetResults[facet] = result.body.aggregations[facet].buckets.map((bucket: any) => ({
              value: bucket.key,
              count: bucket.doc_count,
            }));
          }
        });
      }

      // Extract suggestions
      const suggestions = result.body.suggest?.suggestion?.[0]?.options?.map((opt: any) => opt.text) || [];
      const didYouMean = suggestions[0] || undefined;

      return {
        hits,
        total: result.body.hits.total.value,
        facets: Object.keys(facetResults).length > 0 ? facetResults : undefined,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        didYouMean,
      };
    } catch (error) {
      this.logger.error('Elasticsearch search failed:', error);
      return { hits: [], total: 0 };
    }
  }

  /**
   * Reindex all documents
   */
  async reindex(
    index: 'content_entries' | 'collection_items',
    documents: Array<{ id: string; document: any }>,
  ): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      const indexName = `${this.indexPrefix}-${index}`;
      const body = documents.flatMap(({ id, document }) => [
        { index: { _index: indexName, _id: id } },
        document,
      ]);

      await this.client.bulk({
        refresh: true,
        body,
      });

      this.logger.log(`Reindexed ${documents.length} documents in ${indexName}`);
    } catch (error) {
      this.logger.error(`Reindexing failed for ${index}:`, error);
      throw error;
    }
  }
}




