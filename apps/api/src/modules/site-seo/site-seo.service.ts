import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateSeoSettingsDto } from './dto';

@Injectable()
export class SiteSeoService {
  constructor(private readonly prisma: PrismaService) {}

  private defaultSettings(tenantId: string) {
    return {
      tenantId,
      title: 'Site title (coming soon)',
      description: 'Default meta description placeholder',
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      twitterCard: 'summary_large_image',
    };
  }

  async getSettings(tenantId: string) {
    const existing = await this.prisma.seoSettings.findUnique({
      where: { tenantId },
    });

    if (existing) return existing;

    return this.prisma.seoSettings.create({
      data: this.defaultSettings(tenantId),
    });
  }

  async updateSettings(tenantId: string, dto: UpdateSeoSettingsDto) {
    const data = {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.ogTitle !== undefined ? { ogTitle: dto.ogTitle } : {}),
      ...(dto.ogDescription !== undefined ? { ogDescription: dto.ogDescription } : {}),
      ...(dto.ogImage !== undefined ? { ogImage: dto.ogImage } : {}),
      ...(dto.twitterCard !== undefined ? { twitterCard: dto.twitterCard } : {}),
    };

    return this.prisma.seoSettings.upsert({
      where: { tenantId },
      update: data,
      create: { ...this.defaultSettings(tenantId), ...data },
    });
  }
}
