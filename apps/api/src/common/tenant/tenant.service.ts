import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * TenantService - serwis do zarządzania tenantami
 * AI Note: Używaj do walidacji i pobierania danych tenantów
 */
@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.tenant.findUnique({
      where: { slug },
    });
  }

  async validateTenantExists(tenantId: string): Promise<boolean> {
    const tenant = await this.findById(tenantId);
    return !!tenant;
  }
}

