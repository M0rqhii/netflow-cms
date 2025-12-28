import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RbacService } from '../rbac/rbac.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignQueryDto,
  CreateDistributionDraftDto,
  UpdateDistributionDraftDto,
  DistributionDraftQueryDto,
  PublishDto,
  PublishJobQueryDto,
  CreateChannelConnectionDto,
  UpdateChannelConnectionDto,
  ChannelConnectionQueryDto,
} from './dto';

/**
 * MarketingService - Service do zarządzania marketingiem i publikacją omnichannel
 * 
 * Flow:
 * 1. Editor tworzy content (draft)
 * 2. Marketing Editor tworzy wersje postów (draft)
 * 3. Marketing Manager lub Publisher publikuje (strona / social / ads)
 */
@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
  ) {}

  // ============================================
  // Campaign Management
  // ============================================

  /**
   * Create campaign
   */
  async createCampaign(orgId: string, dto: CreateCampaignDto, userId: string) {
    // Verify site exists
    const site = await this.prisma.tenant.findFirst({
      where: { id: dto.siteId },
    });

    if (!site) {
      throw new NotFoundException(`Site with ID ${dto.siteId} not found`);
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        orgId,
        siteId: dto.siteId,
        name: dto.name,
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        createdById: userId,
        status: 'draft',
      },
      include: {
        distributionDrafts: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        publishJobs: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return campaign;
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(orgId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        orgId,
      },
      include: {
        distributionDrafts: {
          orderBy: { createdAt: 'desc' },
        },
        publishJobs: {
          include: {
            publishResults: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  /**
   * List campaigns
   */
  async listCampaigns(orgId: string, query: CampaignQueryDto) {
    const { siteId, status, page, pageSize } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { orgId };
    if (siteId) {
      where.siteId = siteId;
    }
    if (status) {
      where.status = status;
    }

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              distributionDrafts: true,
              publishJobs: true,
            },
          },
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return {
      campaigns,
      pagination: {
        total,
        page,
        pageSize,
      },
    };
  }

  /**
   * Update campaign
   */
  async updateCampaign(
    orgId: string,
    campaignId: string,
    dto: UpdateCampaignDto,
  ) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        orgId,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.startDate !== undefined)
      updateData.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined)
      updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: updateData,
    });

    return updated;
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(orgId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        orgId,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    await this.prisma.campaign.delete({
      where: { id: campaignId },
    });

    return { success: true };
  }

  // ============================================
  // Distribution Draft Management
  // ============================================

  /**
   * Create distribution draft
   */
  async createDraft(orgId: string, dto: CreateDistributionDraftDto, userId: string) {
    // Verify site exists
    const site = await this.prisma.tenant.findFirst({
      where: { id: dto.siteId },
    });

    if (!site) {
      throw new NotFoundException(`Site with ID ${dto.siteId} not found`);
    }

    // Verify campaign if provided
    if (dto.campaignId) {
      const campaign = await this.prisma.campaign.findFirst({
        where: {
          id: dto.campaignId,
          orgId,
        },
      });

      if (!campaign) {
        throw new NotFoundException('Campaign not found');
      }
    }

    const draft = await this.prisma.distributionDraft.create({
      data: {
        orgId,
        siteId: dto.siteId,
        campaignId: dto.campaignId,
        contentId: dto.contentId,
        title: dto.title,
        content: dto.content as any,
        channels: dto.channels,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        createdById: userId,
        status: 'draft',
      },
    });

    return draft;
  }

  /**
   * Get draft by ID
   */
  async getDraft(orgId: string, draftId: string) {
    const draft = await this.prisma.distributionDraft.findFirst({
      where: {
        id: draftId,
        orgId,
      },
      include: {
        campaign: true,
        publishJobs: {
          include: {
            publishResults: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!draft) {
      throw new NotFoundException('Distribution draft not found');
    }

    return draft;
  }

  /**
   * List drafts
   */
  async listDrafts(orgId: string, query: DistributionDraftQueryDto) {
    const { siteId, campaignId, status, page, pageSize } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { orgId };
    if (siteId) {
      where.siteId = siteId;
    }
    if (campaignId) {
      where.campaignId = campaignId;
    }
    if (status) {
      where.status = status;
    }

    const [drafts, total] = await Promise.all([
      this.prisma.distributionDraft.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.distributionDraft.count({ where }),
    ]);

    return {
      drafts,
      pagination: {
        total,
        page,
        pageSize,
      },
    };
  }

  /**
   * Update draft
   */
  async updateDraft(
    orgId: string,
    draftId: string,
    dto: UpdateDistributionDraftDto,
  ) {
    const draft = await this.prisma.distributionDraft.findFirst({
      where: {
        id: draftId,
        orgId,
      },
    });

    if (!draft) {
      throw new NotFoundException('Distribution draft not found');
    }

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.content !== undefined) updateData.content = dto.content as any;
    if (dto.channels !== undefined) updateData.channels = dto.channels;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.scheduledAt !== undefined)
      updateData.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;

    const updated = await this.prisma.distributionDraft.update({
      where: { id: draftId },
      data: updateData,
    });

    return updated;
  }

  /**
   * Delete draft
   */
  async deleteDraft(orgId: string, draftId: string) {
    const draft = await this.prisma.distributionDraft.findFirst({
      where: {
        id: draftId,
        orgId,
      },
    });

    if (!draft) {
      throw new NotFoundException('Distribution draft not found');
    }

    await this.prisma.distributionDraft.delete({
      where: { id: draftId },
    });

    return { success: true };
  }

  // ============================================
  // Publish Management
  // ============================================

  /**
   * Publish content omnichannel
   * 
   * Publikuje content do wybranych kanałów:
   * - site: publikacja na stronie (builder.publish)
   * - social: publikacja do social media (facebook, twitter, linkedin, instagram)
   * - ads: publikacja do reklam (jeśli policy włączone)
   */
  async publish(orgId: string, dto: PublishDto, userId: string) {
    // Verify site exists
    const site = await this.prisma.tenant.findFirst({
      where: { id: dto.siteId },
    });

    if (!site) {
      throw new NotFoundException(`Site with ID ${dto.siteId} not found`);
    }

    // Verify draft if provided
    let draft = null;
    if (dto.draftId) {
      draft = await this.prisma.distributionDraft.findFirst({
        where: {
          id: dto.draftId,
          orgId,
        },
      });

      if (!draft) {
        throw new NotFoundException('Distribution draft not found');
      }
    }

    // Verify campaign if provided
    if (dto.campaignId) {
      const campaign = await this.prisma.campaign.findFirst({
        where: {
          id: dto.campaignId,
          orgId,
        },
      });

      if (!campaign) {
        throw new NotFoundException('Campaign not found');
      }
    }

    // Check capabilities for each channel
    for (const channel of dto.channels) {
      if (channel === 'ads') {
        // Check marketing.ads.manage capability and policy
        const canManageAds = await this.rbacService.canUserPerform(
          orgId,
          userId,
          'marketing.ads.manage',
          dto.siteId,
        );

        if (!canManageAds) {
          throw new BadRequestException({
            message: 'Cannot publish to ads channel. Capability "marketing.ads.manage" is required and must be enabled by policy.',
            reason: 'missing_capability_or_policy',
            capabilityKey: 'marketing.ads.manage',
          });
        }
      }
    }

    // Create publish job
    const job = await this.prisma.publishJob.create({
      data: {
        orgId,
        siteId: dto.siteId,
        campaignId: dto.campaignId,
        draftId: dto.draftId,
        channels: dto.channels,
        status: 'pending',
        createdById: userId,
      },
    });

    // Process publish job asynchronously (stub - w produkcji użyj queue)
    this.processPublishJob(job.id).catch((error) => {
      this.logger.error(`Error processing publish job ${job.id}`, error);
    });

    return job;
  }

  /**
   * Process publish job (stub implementation)
   * W produkcji: użyj queue (Bull, BullMQ, etc.)
   */
  private async processPublishJob(jobId: string) {
    const job = await this.prisma.publishJob.findUnique({
      where: { id: jobId },
      include: {
        draft: true,
      },
    });

    if (!job) {
      return;
    }

    // Update job status to processing
    await this.prisma.publishJob.update({
      where: { id: jobId },
      data: {
        status: 'processing',
        startedAt: new Date(),
      },
    });

    const results: any[] = [];

    // Process each channel
    for (const channel of job.channels) {
      try {
        const result = await this.publishToChannel(job, channel);
        results.push(result);
      } catch (error) {
        this.logger.error(`Error publishing to channel ${channel}`, error);
        results.push({
          jobId,
          orgId: job.orgId,
          siteId: job.siteId,
          channel,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Save results
    await this.prisma.publishResult.createMany({
      data: results,
    });

    // Update job status
    const allSuccess = results.every((r) => r.status === 'success');
    const allFailed = results.every((r) => r.status === 'failed');

    await this.prisma.publishJob.update({
      where: { id: jobId },
      data: {
        status: allSuccess ? 'success' : allFailed ? 'failed' : 'success', // Partial success = success
        completedAt: new Date(),
      },
    });
  }

  /**
   * Publish to specific channel (stub implementation)
   * W produkcji: użyj integracji z API social media / ads
   */
  private async publishToChannel(job: any, channel: string) {
    // Stub implementation - w produkcji użyj prawdziwych integracji
    this.logger.log(`Publishing to channel ${channel} (stub)`);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock result
    const result = {
      jobId: job.id,
      orgId: job.orgId,
      siteId: job.siteId,
      channel,
      status: 'success' as const,
      externalId: `mock_${channel}_${Date.now()}`,
      url: channel === 'site' ? `https://example.com/posts/${Date.now()}` : `https://${channel}.com/posts/${Date.now()}`,
      publishedAt: new Date(),
      metadata: {},
    };

    return result;
  }

  /**
   * Get publish job by ID
   */
  async getPublishJob(orgId: string, jobId: string) {
    const job = await this.prisma.publishJob.findFirst({
      where: {
        id: jobId,
        orgId,
      },
      include: {
        campaign: true,
        draft: true,
        publishResults: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Publish job not found');
    }

    return job;
  }

  /**
   * List publish jobs
   */
  async listPublishJobs(orgId: string, query: PublishJobQueryDto) {
    const { siteId, campaignId, draftId, status, page, pageSize } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { orgId };
    if (siteId) {
      where.siteId = siteId;
    }
    if (campaignId) {
      where.campaignId = campaignId;
    }
    if (draftId) {
      where.draftId = draftId;
    }
    if (status) {
      where.status = status;
    }

    const [jobs, total] = await Promise.all([
      this.prisma.publishJob.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
            },
          },
          draft: {
            select: {
              id: true,
              title: true,
            },
          },
          _count: {
            select: {
              publishResults: true,
            },
          },
        },
      }),
      this.prisma.publishJob.count({ where }),
    ]);

    return {
      jobs,
      pagination: {
        total,
        page,
        pageSize,
      },
    };
  }

  // ============================================
  // Channel Connection Management
  // ============================================

  /**
   * Create channel connection
   */
  async createChannelConnection(
    orgId: string,
    dto: CreateChannelConnectionDto,
    userId: string,
  ) {
    // Verify site exists
    const site = await this.prisma.tenant.findFirst({
      where: { id: dto.siteId },
    });

    if (!site) {
      throw new NotFoundException(`Site with ID ${dto.siteId} not found`);
    }

    // Check if connection already exists
    const existing = await this.prisma.channelConnection.findUnique({
      where: {
        orgId_siteId_channel: {
          orgId,
          siteId: dto.siteId,
          channel: dto.channel,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Channel connection for ${dto.channel} already exists for this site`,
      );
    }

    const connection = await this.prisma.channelConnection.create({
      data: {
        orgId,
        siteId: dto.siteId,
        channel: dto.channel,
        channelId: dto.channelId,
        channelName: dto.channelName,
        credentials: dto.credentials as any,
        metadata: dto.metadata as any,
        connectedById: userId,
        status: 'connected',
      },
    });

    return connection;
  }

  /**
   * Get channel connection
   */
  async getChannelConnection(orgId: string, connectionId: string) {
    const connection = await this.prisma.channelConnection.findFirst({
      where: {
        id: connectionId,
        orgId,
      },
    });

    if (!connection) {
      throw new NotFoundException('Channel connection not found');
    }

    return connection;
  }

  /**
   * List channel connections
   */
  async listChannelConnections(orgId: string, query: ChannelConnectionQueryDto) {
    const where: any = { orgId };
    if (query.siteId) {
      where.siteId = query.siteId;
    }
    if (query.channel) {
      where.channel = query.channel;
    }
    if (query.status) {
      where.status = query.status;
    }

    const connections = await this.prisma.channelConnection.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return connections;
  }

  /**
   * Update channel connection
   */
  async updateChannelConnection(
    orgId: string,
    connectionId: string,
    dto: UpdateChannelConnectionDto,
  ) {
    const connection = await this.prisma.channelConnection.findFirst({
      where: {
        id: connectionId,
        orgId,
      },
    });

    if (!connection) {
      throw new NotFoundException('Channel connection not found');
    }

    const updateData: any = {};
    if (dto.channelId !== undefined) updateData.channelId = dto.channelId;
    if (dto.channelName !== undefined) updateData.channelName = dto.channelName;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.credentials !== undefined) updateData.credentials = dto.credentials as any;
    if (dto.metadata !== undefined) updateData.metadata = dto.metadata as any;

    const updated = await this.prisma.channelConnection.update({
      where: { id: connectionId },
      data: updateData,
    });

    return updated;
  }

  /**
   * Delete channel connection
   */
  async deleteChannelConnection(orgId: string, connectionId: string) {
    const connection = await this.prisma.channelConnection.findFirst({
      where: {
        id: connectionId,
        orgId,
      },
    });

    if (!connection) {
      throw new NotFoundException('Channel connection not found');
    }

    await this.prisma.channelConnection.delete({
      where: { id: connectionId },
    });

    return { success: true };
  }
}

