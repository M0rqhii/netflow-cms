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
import { GuardrailReasonCode, GuardrailMessages } from '../../common/constants';
import { EnvironmentType } from '@prisma/client';

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

    // Guardrail: Check if published pages exist (if contentId is required for selected channels)
    // Note: This is a warning, not an error - we allow creating drafts without published pages
    // but we should warn the user if they need contentId for certain channels
    if (dto.contentId) {
      // Verify that the contentId refers to a published page
      const productionEnv = await this.prisma.siteEnvironment.findFirst({
        where: {
          siteId: dto.siteId,
          type: EnvironmentType.PRODUCTION,
        },
      });

      if (productionEnv) {
        const publishedPage = await this.prisma.page.findFirst({
          where: {
            siteId: dto.siteId,
            environmentId: productionEnv.id,
            id: dto.contentId,
            status: 'PUBLISHED',
          },
        });

        if (!publishedPage) {
          // This is a warning, not an error - we allow creating drafts with unpublished content
          // but the user should be aware
        }
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

    // Guardrail: Validate that at least one channel is selected
    if (!dto.channels || dto.channels.length === 0) {
      throw new BadRequestException({
        message: GuardrailMessages[GuardrailReasonCode.NO_CHANNELS_SELECTED],
        reason: GuardrailReasonCode.NO_CHANNELS_SELECTED,
        details: 'Select at least one channel',
      });
    }

    // Guardrail: Validate that content exists for selected channels
    if (dto.content && typeof dto.content === 'object') {
      const contentObj = dto.content as Record<string, any>;
      const missingChannels = dto.channels.filter(channel => {
        const channelContent = contentObj[channel];
        return !channelContent || 
               (typeof channelContent === 'object' && Object.keys(channelContent).length === 0) ||
               (typeof channelContent === 'string' && channelContent.trim().length === 0);
      });

      if (missingChannels.length > 0) {
        throw new BadRequestException({
          message: GuardrailMessages[GuardrailReasonCode.INCOMPLETE_CONTENT],
          reason: GuardrailReasonCode.INCOMPLETE_CONTENT,
          details: `Add content for: ${missingChannels.join(', ')}`,
          missingChannels,
        });
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
    // Guardrail: Validate that at least one channel is selected
    if (!dto.channels || dto.channels.length === 0) {
      throw new BadRequestException({
        message: GuardrailMessages[GuardrailReasonCode.NO_CHANNELS_SELECTED],
        reason: GuardrailReasonCode.NO_CHANNELS_SELECTED,
        details: 'Select at least one channel to publish to',
      });
    }

    // Verify site exists
    const site = await this.prisma.tenant.findFirst({
      where: { id: dto.siteId },
    });

    if (!site) {
      throw new NotFoundException(`Site with ID ${dto.siteId} not found`);
    }

    // Guardrail: Validate content exists (either draftId or content)
    if (!dto.draftId && !dto.content) {
      throw new BadRequestException({
        message: GuardrailMessages[GuardrailReasonCode.MISSING_CONTENT],
        reason: GuardrailReasonCode.MISSING_CONTENT,
        details: 'Provide either draftId or content object',
      });
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

      // Guardrail: Validate draft has content
      if (!draft.content || typeof draft.content !== 'object' || Object.keys(draft.content as Record<string, any>).length === 0) {
        throw new BadRequestException({
          message: GuardrailMessages[GuardrailReasonCode.EMPTY_DRAFT],
          reason: GuardrailReasonCode.EMPTY_DRAFT,
          details: 'Edit the draft and add content before publishing',
        });
      }

      // Guardrail: Validate draft is ready for publishing
      if (draft.status !== 'ready') {
        throw new BadRequestException({
          message: GuardrailMessages[GuardrailReasonCode.DRAFT_NOT_READY],
          reason: GuardrailReasonCode.DRAFT_NOT_READY,
          details: `Draft status is "${draft.status}". Mark it as "ready" before publishing.`,
          currentStatus: draft.status,
        });
      }
    }

    // Guardrail: If content provided directly, validate it has content for selected channels
    if (dto.content && !dto.draftId) {
      const contentObj = dto.content as Record<string, any>;
      const missingChannels = dto.channels.filter(channel => {
        const channelContent = contentObj[channel];
        return !channelContent || 
               (typeof channelContent === 'object' && Object.keys(channelContent).length === 0) ||
               (typeof channelContent === 'string' && channelContent.trim().length === 0);
      });

      if (missingChannels.length > 0) {
        throw new BadRequestException({
          message: GuardrailMessages[GuardrailReasonCode.INCOMPLETE_CONTENT],
          reason: GuardrailReasonCode.INCOMPLETE_CONTENT,
          details: `Add content for: ${missingChannels.join(', ')}`,
          missingChannels,
        });
      }
    }

    // Guardrail: Check if published pages exist (if site channel is selected)
    if (dto.channels.includes('site')) {
      const productionEnv = await this.prisma.siteEnvironment.findFirst({
        where: {
          siteId: dto.siteId,
          type: EnvironmentType.PRODUCTION,
        },
      });

      if (productionEnv) {
        const publishedPagesCount = await this.prisma.page.count({
          where: {
            siteId: dto.siteId,
            environmentId: productionEnv.id,
            status: 'PUBLISHED',
          },
        });

        if (publishedPagesCount === 0) {
          // This is a warning, not an error - we allow publishing to site without published pages
          // but the user should be aware
          this.logger.warn(`Publishing to site channel but no published pages exist for site ${dto.siteId}`);
        }
      }
    }

    // Guardrail: Check social media connections for social channels
    const socialChannels = ['facebook', 'twitter', 'linkedin', 'instagram'];
    const selectedSocialChannels = dto.channels.filter(ch => socialChannels.includes(ch));

    if (selectedSocialChannels.length > 0) {
      const connections = await this.prisma.channelConnection.findMany({
        where: {
          orgId,
          siteId: dto.siteId,
          channel: { in: selectedSocialChannels },
          status: 'connected',
        },
      });

      const connectedPlatforms = connections.map(c => c.channel);
      const missingConnections = selectedSocialChannels.filter(
        ch => !connectedPlatforms.includes(ch)
      );

      if (missingConnections.length > 0) {
        throw new BadRequestException({
          message: GuardrailMessages[GuardrailReasonCode.MISSING_CONNECTIONS],
          reason: GuardrailReasonCode.MISSING_CONNECTIONS,
          details: `Connect ${missingConnections.join(', ')} accounts before publishing`,
          missingChannels: missingConnections,
        });
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

