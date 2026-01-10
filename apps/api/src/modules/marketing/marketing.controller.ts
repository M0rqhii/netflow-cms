import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { TenantGuard } from '../../common/tenant/tenant.guard';
import { CapabilityGuard } from '../../common/auth/guards/capability.guard';
import { Capabilities } from '../../common/auth/decorators/capabilities.decorator';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { MarketingService } from './marketing.service';
import {
  CreateCampaignDto,
  CreateCampaignDtoSchema,
  UpdateCampaignDto,
  UpdateCampaignDtoSchema,
  CampaignQueryDto,
  CampaignQueryDtoSchema,
  CreateDistributionDraftDto,
  CreateDistributionDraftDtoSchema,
  UpdateDistributionDraftDto,
  UpdateDistributionDraftDtoSchema,
  DistributionDraftQueryDto,
  DistributionDraftQueryDtoSchema,
  PublishDto,
  PublishDtoSchema,
  PublishJobQueryDto,
  PublishJobQueryDtoSchema,
  CreateChannelConnectionDto,
  CreateChannelConnectionDtoSchema,
  UpdateChannelConnectionDto,
  UpdateChannelConnectionDtoSchema,
  ChannelConnectionQueryDto,
  ChannelConnectionQueryDtoSchema,
} from './dto';

/**
 * MarketingController - RESTful API for marketing & distribution
 * 
 * Flow:
 * 1. Editor tworzy content (draft)
 * 2. Marketing Editor tworzy wersje postów (draft)
 * 3. Marketing Manager lub Publisher publikuje (strona / social / ads)
 */
@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  // ============================================
  // Campaign Endpoints
  // ============================================

  /**
   * List campaigns
   * GET /marketing/campaigns
   */
  @Get('campaigns')
  @UseGuards(AuthGuard, TenantGuard, CapabilityGuard)
  @Capabilities('marketing.view')
  async listCampaigns(
    @CurrentOrg() orgId: string,
    @Query(new ZodValidationPipe(CampaignQueryDtoSchema)) query: CampaignQueryDto,
  ) {
    return this.marketingService.listCampaigns(orgId, query);
  }

  /**
   * Get campaign by ID
   * GET /marketing/campaigns/:id
   */
  @Get('campaigns/:id')
  @UseGuards(AuthGuard, TenantGuard, CapabilityGuard)
  @Capabilities('marketing.view')
  async getCampaign(
    @CurrentOrg() orgId: string,
    @Param('id') campaignId: string,
  ) {
    return this.marketingService.getCampaign(orgId, campaignId);
  }

  /**
   * Create campaign
   * POST /marketing/campaigns
   */
  @Post('campaigns')
  @UseGuards(AuthGuard, TenantGuard, CapabilityGuard)
  @Capabilities('marketing.campaign.manage')
  async createCampaign(
    @CurrentOrg() orgId: string,
    @Body(new ZodValidationPipe(CreateCampaignDtoSchema)) dto: CreateCampaignDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.marketingService.createCampaign(orgId, dto, user.id);
  }

  /**
   * Update campaign
   * PATCH /marketing/campaigns/:id
   */
  @Patch('campaigns/:id')
  @UseGuards(AuthGuard, TenantGuard, CapabilityGuard)
  @Capabilities('marketing.campaign.manage')
  async updateCampaign(
    @CurrentOrg() orgId: string,
    @Param('id') campaignId: string,
    @Body(new ZodValidationPipe(UpdateCampaignDtoSchema)) dto: UpdateCampaignDto,
  ) {
    return this.marketingService.updateCampaign(orgId, campaignId, dto);
  }

  /**
   * Delete campaign
   * DELETE /marketing/campaigns/:id
   */
  @Delete('campaigns/:id')
  @UseGuards(AuthGuard, TenantGuard, CapabilityGuard)
  @Capabilities('marketing.campaign.manage')
  @HttpCode(HttpStatus.OK)
  async deleteCampaign(
    @CurrentOrg() orgId: string,
    @Param('id') campaignId: string,
  ) {
    return this.marketingService.deleteCampaign(orgId, campaignId);
  }

  // ============================================
  // Distribution Draft Endpoints
  // ============================================

  /**
   * List distribution drafts
   * GET /marketing/drafts
   */
  @Get('drafts')
  @UseGuards(AuthGuard, TenantGuard, CapabilityGuard)
  @Capabilities('marketing.view')
  async listDrafts(
    @CurrentOrg() orgId: string,
    @Query(new ZodValidationPipe(DistributionDraftQueryDtoSchema)) query: DistributionDraftQueryDto,
  ) {
    return this.marketingService.listDrafts(orgId, query);
  }

  /**
   * Get draft by ID
   * GET /marketing/drafts/:id
   */
  @Get('drafts/:id')
  @UseGuards(AuthGuard, TenantGuard, CapabilityGuard)
  @Capabilities('marketing.view')
  async getDraft(
    @CurrentOrg() orgId: string,
    @Param('id') draftId: string,
  ) {
    return this.marketingService.getDraft(orgId, draftId);
  }

  /**
   * Create distribution draft
   * POST /marketing/drafts
   */
  @Post('drafts')
  @UseGuards(AuthGuard, TenantGuard, CapabilityGuard)
  @Capabilities('marketing.content.edit')
  async createDraft(
    @CurrentOrg() orgId: string,
    @Body(new ZodValidationPipe(CreateDistributionDraftDtoSchema)) dto: CreateDistributionDraftDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.marketingService.createDraft(orgId, dto, user.id);
  }

  /**
   * Update draft
   * PATCH /marketing/drafts/:id
   */
  @Patch('drafts/:id')
  @UseGuards(AuthGuard, TenantGuard, CapabilityGuard)
  @Capabilities('marketing.content.edit')
  async updateDraft(
    @CurrentOrg() orgId: string,
    @Param('id') draftId: string,
    @Body(new ZodValidationPipe(UpdateDistributionDraftDtoSchema)) dto: UpdateDistributionDraftDto,
  ) {
    return this.marketingService.updateDraft(orgId, draftId, dto);
  }

  /**
   * Delete draft
   * DELETE /marketing/drafts/:id
   */
  @Delete('drafts/:id')
  @UseGuards(AuthGuard, TenantGuard, CapabilityGuard)
  @Capabilities('marketing.content.edit')
  @HttpCode(HttpStatus.OK)
  async deleteDraft(
    @CurrentOrg() orgId: string,
    @Param('id') draftId: string,
  ) {
    return this.marketingService.deleteDraft(orgId, draftId);
  }

  // ============================================
  // Publish Endpoints
  // ============================================

  /**
   * Publish content omnichannel
   * POST /marketing/publish
   * 
   * Publikuje do wybranych kanałów:
   * - site: tylko strona
   * - site + social: strona + social media
   * - site + social + ads: strona + social + ads (jeśli policy włączone)
   */
  @Post('publish')
  @UseGuards(AuthGuard, TenantGuard, CapabilityGuard)
  @Capabilities('marketing.publish')
  async publish(
    @CurrentOrg() orgId: string,
    @Body(new ZodValidationPipe(PublishDtoSchema)) dto: PublishDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.marketingService.publish(orgId, dto, user.id);
  }

  /**
   * List publish jobs
   * GET /marketing/jobs
   */
  @Get('jobs')
  @UseGuards(AuthGuard, TenantGuard, CapabilityGuard)
  @Capabilities('marketing.view')
  async listPublishJobs(
    @CurrentOrg() orgId: string,
    @Query(new ZodValidationPipe(PublishJobQueryDtoSchema)) query: PublishJobQueryDto,
  ) {
    return this.marketingService.listPublishJobs(orgId, query);
  }

  /**
   * Get publish job by ID
   * GET /marketing/jobs/:id
   */
  @Get('jobs/:id')
  @UseGuards(AuthGuard, TenantGuard, CapabilityGuard)
  @Capabilities('marketing.view')
  async getPublishJob(
    @CurrentOrg() orgId: string,
    @Param('id') jobId: string,
  ) {
    return this.marketingService.getPublishJob(orgId, jobId);
  }

  // ============================================
  // Channel Connection Endpoints
  // ============================================

  /**
   * List channel connections
   * GET /marketing/channels
   */
  @Get('channels')
  @UseGuards(AuthGuard, TenantGuard, CapabilityGuard)
  @Capabilities('marketing.view')
  async listChannelConnections(
    @CurrentOrg() orgId: string,
    @Query(new ZodValidationPipe(ChannelConnectionQueryDtoSchema)) query: ChannelConnectionQueryDto,
  ) {
    return this.marketingService.listChannelConnections(orgId, query);
  }

  /**
   * Get channel connection by ID
   * GET /marketing/channels/:id
   */
  @Get('channels/:id')
  @UseGuards(AuthGuard, TenantGuard, CapabilityGuard)
  @Capabilities('marketing.view')
  async getChannelConnection(
    @CurrentOrg() orgId: string,
    @Param('id') connectionId: string,
  ) {
    return this.marketingService.getChannelConnection(orgId, connectionId);
  }

  /**
   * Create channel connection
   * POST /marketing/channels
   * 
   * Wymaga: marketing.social.connect (tylko Admin modułu / Owner)
   */
  @Post('channels')
  @UseGuards(AuthGuard, TenantGuard, CapabilityGuard)
  @Capabilities('marketing.social.connect')
  async createChannelConnection(
    @CurrentOrg() orgId: string,
    @Body(new ZodValidationPipe(CreateChannelConnectionDtoSchema)) dto: CreateChannelConnectionDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.marketingService.createChannelConnection(orgId, dto, user.id);
  }

  /**
   * Update channel connection
   * PATCH /marketing/channels/:id
   */
  @Patch('channels/:id')
  @UseGuards(AuthGuard, TenantGuard, CapabilityGuard)
  @Capabilities('marketing.social.connect')
  async updateChannelConnection(
    @CurrentOrg() orgId: string,
    @Param('id') connectionId: string,
    @Body(new ZodValidationPipe(UpdateChannelConnectionDtoSchema)) dto: UpdateChannelConnectionDto,
  ) {
    return this.marketingService.updateChannelConnection(orgId, connectionId, dto);
  }

  /**
   * Delete channel connection
   * DELETE /marketing/channels/:id
   */
  @Delete('channels/:id')
  @UseGuards(AuthGuard, TenantGuard, CapabilityGuard)
  @Capabilities('marketing.social.connect')
  @HttpCode(HttpStatus.OK)
  async deleteChannelConnection(
    @CurrentOrg() orgId: string,
    @Param('id') connectionId: string,
  ) {
    return this.marketingService.deleteChannelConnection(orgId, connectionId);
  }
}

