import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * OrganizationService - serwis do zarządzania organizacjami
 * AI Note: Używaj do walidacji i pobierania danych organizacji
 */
@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.organization.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.organization.findUnique({
      where: { slug },
    });
  }

  async validateOrganizationExists(orgId: string): Promise<boolean> {
    const org = await this.findById(orgId);
    return !!org;
  }
}
