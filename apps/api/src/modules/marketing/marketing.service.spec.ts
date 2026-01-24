import { Test, TestingModule } from '@nestjs/testing';
import { MarketingService } from './marketing.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RbacService } from '../rbac/rbac.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('MarketingService', () => {
  let service: MarketingService;

  const mockPrismaService = {
    site: {
      findFirst: jest.fn(),
    },
    siteEnvironment: {
      findFirst: jest.fn(),
    },
    page: {
      count: jest.fn(),
    },
    campaign: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    distributionDraft: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    publishJob: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    publishResult: {
      createMany: jest.fn(),
    },
    channelConnection: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockRbacService = {
    canUserPerform: jest.fn(),
    getPolicies: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RbacService,
          useValue: mockRbacService,
        },
      ],
    }).compile();

    service = module.get<MarketingService>(MarketingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCampaign', () => {
    it('should create campaign', async () => {
      const orgId = 'org-1';
      const dto = {
        siteId: 'site-1',
        name: 'Test Campaign',
        description: 'Test description',
      };
      const userId = 'user-1';

      mockPrismaService.site.findFirst.mockResolvedValue({ id: 'site-1' });
      mockPrismaService.campaign.create.mockResolvedValue({
        id: 'campaign-1',
        ...dto,
        orgId,
        status: 'draft',
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        distributionDrafts: [],
        publishJobs: [],
      });

      const result = await service.createCampaign(orgId, dto, userId);

      expect(result).toBeDefined();
      expect(result.name).toBe(dto.name);
      expect(mockPrismaService.campaign.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if site not found', async () => {
      const orgId = 'org-1';
      const dto = {
        siteId: 'site-1',
        name: 'Test Campaign',
      };
      const userId = 'user-1';

      mockPrismaService.site.findFirst.mockResolvedValue(null);

      await expect(service.createCampaign(orgId, dto, userId)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getCampaign', () => {
    it('should return campaign by ID', async () => {
      const orgId = 'org-1';
      const campaignId = 'campaign-1';

      mockPrismaService.campaign.findFirst.mockResolvedValue({
        id: campaignId,
        orgId,
        name: 'Test Campaign',
        distributionDrafts: [],
        publishJobs: [],
      });

      const result = await service.getCampaign(orgId, campaignId);

      expect(result).toBeDefined();
      expect(result.id).toBe(campaignId);
    });

    it('should throw NotFoundException if campaign not found', async () => {
      const orgId = 'org-1';
      const campaignId = 'campaign-1';

      mockPrismaService.campaign.findFirst.mockResolvedValue(null);

      await expect(service.getCampaign(orgId, campaignId)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('listCampaigns', () => {
    it('should return paginated campaigns', async () => {
      const orgId = 'org-1';
      const query = { page: 1, pageSize: 20 };

      mockPrismaService.campaign.findMany.mockResolvedValue([
        {
          id: 'campaign-1',
          name: 'Campaign 1',
          _count: { distributionDrafts: 2, publishJobs: 1 },
        },
      ]);
      mockPrismaService.campaign.count.mockResolvedValue(1);

      const result = await service.listCampaigns(orgId, query);

      expect(result).toBeDefined();
      expect(result.campaigns).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('createDraft', () => {
    it('should create distribution draft', async () => {
      const orgId = 'org-1';
      const dto = {
        siteId: 'site-1',
        title: 'Test Draft',
        content: { site: { title: 'Test' }, facebook: { text: 'Test' } },
        channels: ['site', 'facebook'] as ('site' | 'facebook')[],
      };
      const userId = 'user-1';

      mockPrismaService.site.findFirst.mockResolvedValue({ id: 'site-1' });
      mockPrismaService.distributionDraft.create.mockResolvedValue({
        id: 'draft-1',
        ...dto,
        orgId,
        status: 'draft',
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createDraft(orgId, dto, userId);

      expect(result).toBeDefined();
      expect(result.title).toBe(dto.title);
      expect(mockPrismaService.distributionDraft.create).toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    it('should create publish job', async () => {
      const orgId = 'org-1';
      const dto = {
        siteId: 'site-1',
        channels: ['site', 'facebook'] as ('site' | 'facebook')[],
        content: { site: { title: 'Test' }, facebook: { text: 'Test' } },
      };
      const userId = 'user-1';

      mockPrismaService.site.findFirst.mockResolvedValue({ id: 'site-1' });
      mockPrismaService.siteEnvironment.findFirst.mockResolvedValue({ id: 'env-1' });
      mockPrismaService.page.count.mockResolvedValue(1);
      mockPrismaService.channelConnection.findMany.mockResolvedValue([{ channel: 'facebook' }]);
      mockRbacService.canUserPerform.mockResolvedValue(true);
      mockPrismaService.publishJob.create.mockResolvedValue({
        id: 'job-1',
        orgId,
        siteId: dto.siteId,
        channels: dto.channels,
        status: 'pending',
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.publish(orgId, dto, userId);

      expect(result).toBeDefined();
      expect(result.channels).toEqual(dto.channels);
      expect(mockPrismaService.publishJob.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if ads channel without capability', async () => {
      const orgId = 'org-1';
      const dto = {
        siteId: 'site-1',
        channels: ['site', 'ads'] as ('site' | 'ads')[],
        content: { site: { title: 'Test' }, ads: { text: 'Ad' } },
      };
      const userId = 'user-1';

      mockPrismaService.site.findFirst.mockResolvedValue({ id: 'site-1' });
      mockPrismaService.siteEnvironment.findFirst.mockResolvedValue({ id: 'env-1' });
      mockPrismaService.page.count.mockResolvedValue(1);
      mockRbacService.canUserPerform.mockResolvedValue(false);
      mockRbacService.getPolicies.mockResolvedValue([]);

      await expect(service.publish(orgId, dto, userId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('createChannelConnection', () => {
    it('should create channel connection', async () => {
      const orgId = 'org-1';
      const dto = {
        siteId: 'site-1',
        channel: 'facebook' as const,
        channelName: 'My Page',
        credentials: {},
        metadata: {},
      };
      const userId = 'user-1';

      mockPrismaService.site.findFirst.mockResolvedValue({ id: 'site-1' });
      mockPrismaService.channelConnection.findUnique.mockResolvedValue(null);
      mockPrismaService.channelConnection.create.mockResolvedValue({
        id: 'connection-1',
        orgId,
        ...dto,
        status: 'connected',
        connectedById: userId,
        connectedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createChannelConnection(orgId, dto, userId);

      expect(result).toBeDefined();
      expect(result.channel).toBe(dto.channel);
    });

    it('should throw BadRequestException if connection already exists', async () => {
      const orgId = 'org-1';
      const dto = {
        siteId: 'site-1',
        channel: 'facebook' as const,
        credentials: {},
        metadata: {},
      };
      const userId = 'user-1';

      mockPrismaService.site.findFirst.mockResolvedValue({ id: 'site-1' });
      mockPrismaService.channelConnection.findUnique.mockResolvedValue({
        id: 'existing-connection',
      });

      await expect(
        service.createChannelConnection(orgId, dto, userId)
      ).rejects.toThrow(BadRequestException);
    });
  });
});





