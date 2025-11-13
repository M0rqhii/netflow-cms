import { PrismaClient } from '@prisma/client';
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * PrismaService - rozszerzony Prisma Client z middleware dla multi-tenant
 * AI Note: Zawsze używaj tego serwisu zamiast bezpośrednio PrismaClient
 * 
 * Connection Pooling Configuration:
 * - connection_limit: Maximum number of connections in the pool (default: 10)
 * - pool_timeout: Maximum time to wait for a connection (default: 10s)
 * Configure via DATABASE_URL query parameters:
 * ?connection_limit=20&pool_timeout=20
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      // Connection pooling is configured via DATABASE_URL query parameters
      // Example: postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=20
      // Prisma automatically uses these parameters for connection pooling
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma Client connected to database');

    // Automatic ETag computation for CollectionItem without recursive updates
    this.$use(async (params: any, next: (params: any) => Promise<any>) => {
      // Helper to compute a stable ETag string
      const computeEtag = (data: unknown, version: number | undefined) =>
        crypto
          .createHash('sha1')
          .update(
            JSON.stringify({
              data,
              version: typeof version === 'number' ? version : 1,
            })
          )
          .digest('hex');

      if (params.model === 'CollectionItem') {
        if (params.action === 'create') {
          const incoming = (params.args?.data ?? {}) as {
            data?: unknown;
            version?: number;
            etag?: string;
          };
          const etag = computeEtag(incoming.data, incoming.version);
          params.args.data = { ...incoming, etag };
        } else if (params.action === 'update') {
          const where = (params.args?.where ?? {}) as { id?: string };
          const patch = (params.args?.data ?? {}) as {
            data?: unknown;
            version?: number;
            etag?: string;
          };

          let baseData: unknown | undefined = undefined;
          let baseVersion: number | undefined = undefined;

          if (where.id) {
            const existing = await this.collectionItem.findUnique({
              where: { id: where.id },
            });
            if (existing) {
              baseData = (existing as unknown as { data?: unknown }).data;
              baseVersion = (existing as unknown as { version?: number }).version;
            }
          }

          const nextData = patch.data ?? baseData;
          const nextVersion = patch.version ?? baseVersion;
          const etag = computeEtag(nextData, nextVersion);
          params.args.data = { ...patch, etag };
        } else if (params.action === 'upsert') {
          const upWhere = (params.args?.where ?? {}) as { id?: string };
          const create = (params.args?.create ?? {}) as {
            data?: unknown;
            version?: number;
            etag?: string;
          };
          const update = (params.args?.update ?? {}) as {
            data?: unknown;
            version?: number;
            etag?: string;
          };

          // Prepare create etag
          const createEtag = computeEtag(create.data, create.version);
          params.args.create = { ...create, etag: createEtag };

          // Prepare update etag using existing state if needed
          let baseData: unknown | undefined = undefined;
          let baseVersion: number | undefined = undefined;
          if (upWhere.id) {
            const existing = await this.collectionItem.findUnique({
              where: { id: upWhere.id },
            });
            if (existing) {
              baseData = (existing as unknown as { data?: unknown }).data;
              baseVersion = (existing as unknown as { version?: number }).version;
            }
          }
          const upNextData = update.data ?? baseData;
          const upNextVersion = update.version ?? baseVersion;
          const updateEtag = computeEtag(upNextData, upNextVersion);
          params.args.update = { ...update, etag: updateEtag };
        }
      }

      return next(params);
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma Client disconnected from database');
  }
}

