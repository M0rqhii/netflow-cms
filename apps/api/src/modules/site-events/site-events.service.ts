import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SiteEventsService {
  private readonly logger = new Logger(SiteEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordEvent(
    siteId: string,
    userId: string | null,
    type: string,
    message: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    try {
      return await this.prisma.siteEvent.create({
        data: {
          siteId,
          userId: userId ?? null,
          type,
          message,
          metadata,
        },
      });
    } catch (error) {
      this.logger.warn('Failed to record site event');
      this.logger.debug(error instanceof Error ? error.stack : String(error));
      return null;
    }
  }

  async list(siteId: string, limit: number = 100) {
    const take = Math.min(Math.max(limit, 1), 200);
    return this.prisma.siteEvent.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
