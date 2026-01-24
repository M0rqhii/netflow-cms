import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, EnvironmentType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSiteEnvironmentDto } from './dto';

type SiteEnvironmentRow = {
  id: string;
  siteId: string;
  type: EnvironmentType;
  createdAt: Date;
  updatedAt: Date;
};

type SiteEnvironmentTableInfo = {
  table: 'site_environments' | 'site_environment';
  siteColumn: string;
  typeColumn: string;
  typeEnumName?: string;
  createdColumn: string;
  updatedColumn: string;
};

@Injectable()
export class SiteEnvironmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private tableInfo?: SiteEnvironmentTableInfo;

  private mapType(type: string): EnvironmentType {
    return type === 'production' ? EnvironmentType.PRODUCTION : EnvironmentType.DRAFT;
  }

  private quoteIdentifier(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }

  private renderTypeValue(type: EnvironmentType, info: SiteEnvironmentTableInfo) {
    if (info.typeEnumName) {
      return Prisma.sql`${type}::${Prisma.raw(this.quoteIdentifier(info.typeEnumName))}`;
    }
    return Prisma.sql`${type}`;
  }

  private pickColumn(columns: Set<string>, candidates: string[]): string | undefined {
    return candidates.find((candidate) => columns.has(candidate));
  }

  private async resolveTableInfo(): Promise<SiteEnvironmentTableInfo> {
    if (this.tableInfo) return this.tableInfo;

    const [row] = await this.prisma.$queryRaw<{
      site_environments: string | null;
      site_environment: string | null;
    }[]>(
      Prisma.sql`SELECT to_regclass('public.site_environments')::text as site_environments, to_regclass('public.site_environment')::text as site_environment`,
    );

    const table = row?.site_environments
      ? 'site_environments'
      : row?.site_environment
        ? 'site_environment'
        : null;

    if (!table) {
      throw new Error('Site environments table not found');
    }

    const columns = await this.prisma.$queryRaw<{ column_name: string; data_type: string; udt_name: string }[]>(
      Prisma.sql`SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${table}`,
    );
    const columnSet = new Set(columns.map((column) => column.column_name));

    const siteColumn = this.pickColumn(
      columnSet,
      ['site_id', 'siteId'],
    );
    if (!siteColumn) {
      throw new Error(`Site environment site column not found in ${table}`);
    }
    const typeColumn = this.pickColumn(columnSet, ['type', 'env']);
    if (!typeColumn) {
      throw new Error(`Site environment type column not found in ${table}`);
    }

    const typeColumnInfo = columns.find((column) => column.column_name === typeColumn);
    const typeEnumName =
      typeColumnInfo?.data_type === 'USER-DEFINED' && typeColumnInfo.udt_name
        ? typeColumnInfo.udt_name
        : undefined;

    const createdColumn =
      this.pickColumn(columnSet, ['created_at', 'createdAt']) || 'id';
    const updatedColumn =
      this.pickColumn(columnSet, ['updated_at', 'updatedAt']) || createdColumn;

    this.tableInfo = {
      table,
      siteColumn,
      typeColumn,
      typeEnumName,
      createdColumn,
      updatedColumn,
    };
    return this.tableInfo;
  }

  private async listRows(siteId: string): Promise<SiteEnvironmentRow[]> {
    const info = await this.resolveTableInfo();
    return this.prisma.$queryRaw<SiteEnvironmentRow[]>(
      Prisma.sql`
        SELECT
          id,
          ${Prisma.raw(this.quoteIdentifier(info.siteColumn))} as "siteId",
          ${Prisma.raw(this.quoteIdentifier(info.typeColumn))} as "type",
          ${Prisma.raw(this.quoteIdentifier(info.createdColumn))} as "createdAt",
          ${Prisma.raw(this.quoteIdentifier(info.updatedColumn))} as "updatedAt"
        FROM ${Prisma.raw(this.quoteIdentifier(info.table))}
        WHERE ${Prisma.raw(this.quoteIdentifier(info.siteColumn))} = ${siteId}
        ORDER BY ${Prisma.raw(this.quoteIdentifier(info.createdColumn))} ASC
      `,
    );
  }

  private async findByType(
    siteId: string,
    type: EnvironmentType,
  ): Promise<SiteEnvironmentRow | null> {
    const info = await this.resolveTableInfo();
    const typeValue = this.renderTypeValue(type, info);
    const rows = await this.prisma.$queryRaw<SiteEnvironmentRow[]>(
      Prisma.sql`
        SELECT
          id,
          ${Prisma.raw(this.quoteIdentifier(info.siteColumn))} as "siteId",
          ${Prisma.raw(this.quoteIdentifier(info.typeColumn))} as "type",
          ${Prisma.raw(this.quoteIdentifier(info.createdColumn))} as "createdAt",
          ${Prisma.raw(this.quoteIdentifier(info.updatedColumn))} as "updatedAt"
        FROM ${Prisma.raw(this.quoteIdentifier(info.table))}
        WHERE ${Prisma.raw(this.quoteIdentifier(info.siteColumn))} = ${siteId}
          AND ${Prisma.raw(this.quoteIdentifier(info.typeColumn))} = ${typeValue}
        LIMIT 1
      `,
    );
    return rows[0] || null;
  }

  private async insertRow(
    siteId: string,
    type: EnvironmentType,
  ): Promise<SiteEnvironmentRow> {
    const info = await this.resolveTableInfo();
    const typeValue = this.renderTypeValue(type, info);
    const id = randomUUID();
    const updatedAt = new Date();
    const rows = await this.prisma.$queryRaw<SiteEnvironmentRow[]>(
      Prisma.sql`
        INSERT INTO ${Prisma.raw(this.quoteIdentifier(info.table))} (
          id,
          ${Prisma.raw(this.quoteIdentifier(info.siteColumn))},
          ${Prisma.raw(this.quoteIdentifier(info.typeColumn))},
          ${Prisma.raw(this.quoteIdentifier(info.updatedColumn))}
        )
        VALUES (${id}, ${siteId}, ${typeValue}, ${updatedAt})
        RETURNING
          id,
          ${Prisma.raw(this.quoteIdentifier(info.siteColumn))} as "siteId",
          ${Prisma.raw(this.quoteIdentifier(info.typeColumn))} as "type",
          ${Prisma.raw(this.quoteIdentifier(info.createdColumn))} as "createdAt",
          ${Prisma.raw(this.quoteIdentifier(info.updatedColumn))} as "updatedAt"
      `,
    );
    if (!rows[0]) {
      throw new Error('Failed to create site environment');
    }
    return rows[0];
  }

  private async ensureDefaults(siteId: string): Promise<void> {
    const existing = await this.listRows(siteId);
    const haveDraft = existing.some((env) => env.type === EnvironmentType.DRAFT);
    const haveProduction = existing.some((env) => env.type === EnvironmentType.PRODUCTION);

    const createOps: Promise<unknown>[] = [];
    if (!haveDraft) {
      createOps.push(this.insertRow(siteId, EnvironmentType.DRAFT));
    }
    if (!haveProduction) {
      createOps.push(this.insertRow(siteId, EnvironmentType.PRODUCTION));
    }

    if (createOps.length) {
      await Promise.all(createOps);
    }
  }

  async list(siteId: string) {
    await this.ensureDefaults(siteId);
    return this.listRows(siteId);
  }

  async create(siteId: string, dto: CreateSiteEnvironmentDto) {
    const type = this.mapType(dto.type);
    const existing = await this.findByType(siteId, type);
    if (existing) {
      throw new ConflictException(`Environment '${dto.type}' already exists for this site.`);
    }
    return this.insertRow(siteId, type);
  }

  async getById(siteId: string, environmentId: string) {
    const info = await this.resolveTableInfo();
    const rows = await this.prisma.$queryRaw<SiteEnvironmentRow[]>(
      Prisma.sql`
        SELECT
          id,
          ${Prisma.raw(this.quoteIdentifier(info.siteColumn))} as "siteId",
          ${Prisma.raw(this.quoteIdentifier(info.typeColumn))} as "type",
          ${Prisma.raw(this.quoteIdentifier(info.createdColumn))} as "createdAt",
          ${Prisma.raw(this.quoteIdentifier(info.updatedColumn))} as "updatedAt"
        FROM ${Prisma.raw(this.quoteIdentifier(info.table))}
        WHERE id = ${environmentId}
          AND ${Prisma.raw(this.quoteIdentifier(info.siteColumn))} = ${siteId}
        LIMIT 1
      `,
    );
    const env = rows[0];
    if (!env) {
      throw new NotFoundException('Environment not found for this site');
    }
    return env;
  }

  async getByTypeOrCreate(siteId: string, type: EnvironmentType) {
    const env = await this.findByType(siteId, type);
    if (env) return env;

    return this.insertRow(siteId, type);
  }
}
