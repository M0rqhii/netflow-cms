import { Test, TestingModule } from '@nestjs/testing';
import { CollectionItemsService } from './items.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PrismaOptimizationService } from '../../../common/prisma/prisma-optimization.service';
import { WorkflowConfigService } from '../../workflow/workflow-config.service';
import { ContentVersioningService } from '../../content-versioning/content-versioning.service';
import { WebhooksService } from '../../webhooks/webhooks.service';
import { HooksService } from '../../hooks/hooks.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

describe('CollectionItemsService', () => {
  let service: CollectionItemsService;

  const mockPrismaService = {
    collection: {
      findFirst: jest.fn(),
    },
    collectionItem: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
  };


  const mockPrismaOptimizationService = {
    countOptimized: jest.fn(),
    findManyOptimized: jest.fn(),
  };

  const mockWorkflowConfigService = {
    getWorkflowConfig: jest.fn(),
    validateStatusTransition: jest.fn(),
    createAutoTasks: jest.fn(),
  };

  const mockContentVersioningService = {
    createVersion: jest.fn(),
  };

  const mockWebhooksService = {
    trigger: jest.fn(),
  };

  const mockHooksService = {
    executeHooks: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionItemsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PrismaOptimizationService,
          useValue: mockPrismaOptimizationService,
        },
        {
          provide: WorkflowConfigService,
          useValue: mockWorkflowConfigService,
        },
        {
          provide: ContentVersioningService,
          useValue: mockContentVersioningService,
        },
        {
          provide: WebhooksService,
          useValue: mockWebhooksService,
        },
        {
          provide: HooksService,
          useValue: mockHooksService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<CollectionItemsService>(CollectionItemsService);

    mockPrismaOptimizationService.countOptimized.mockResolvedValue(0);
    mockPrismaOptimizationService.findManyOptimized.mockResolvedValue([]);
    mockWorkflowConfigService.getWorkflowConfig.mockResolvedValue(null);
    mockWorkflowConfigService.validateStatusTransition.mockReturnValue({ valid: true });
    mockWorkflowConfigService.createAutoTasks.mockResolvedValue(undefined);
    mockContentVersioningService.createVersion.mockResolvedValue(undefined);
    mockWebhooksService.trigger.mockResolvedValue(undefined);
    mockHooksService.executeHooks.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getCollection', () => {
    it('should return cached collection if available', async () => {
      const siteId = 'site-123';
      const slug = 'articles';
      const cachedCollection = {
        id: 'col-1',
        siteId,
        slug,
        name: 'Articles',
        schemaJson: { title: 'string' },
      };

      mockCache.get.mockResolvedValue(cachedCollection);

      const result = await (service as any).getCollection(siteId, slug);

      expect(result).toEqual(cachedCollection);
      expect(mockCache.get).toHaveBeenCalledWith(`col:${siteId}:${slug}`);
      expect(mockPrismaService.collection.findFirst).not.toHaveBeenCalled();
    });

    it('should fetch and cache collection if not cached', async () => {
      const siteId = 'site-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        siteId,
        slug,
        name: 'Articles',
        schemaJson: { title: 'string' },
      };

      mockCache.get.mockResolvedValue(null);
      mockPrismaService.collection.findFirst.mockResolvedValue(collection);

      const result = await (service as any).getCollection(siteId, slug);

      expect(result).toEqual(collection);
      expect(mockCache.get).toHaveBeenCalledWith(`col:${siteId}:${slug}`);
      expect(mockPrismaService.collection.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { siteId, slug },
        }),
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        `col:${siteId}:${slug}`,
        collection,
        600 * 1000
      );
    });

    it('should throw NotFoundException when collection not found', async () => {
      const siteId = 'site-123';
      const slug = 'nonexistent';

      mockCache.get.mockResolvedValue(null);
      mockPrismaService.collection.findFirst.mockResolvedValue(null);

      await expect(
        (service as any).getCollection(siteId, slug)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('list', () => {
    it('should list items with pagination', async () => {
      const siteId = 'site-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        siteId,
        slug,
        schemaJson: {},
      };
      const items = [
        {
          id: 'item-1',
          siteId,
          collectionId: 'col-1',
          data: { title: 'Test' },
          status: 'DRAFT',
          version: 1,
        },
      ];

      mockCache.get.mockResolvedValue(collection);
      mockPrismaOptimizationService.countOptimized.mockResolvedValue(1);
      mockPrismaOptimizationService.findManyOptimized.mockResolvedValue(items);

      const result = await service.list(siteId, slug, {
        page: 1,
        pageSize: 10,
      });

      expect(result).toEqual({
        total: 1,
        page: 1,
        pageSize: 10,
        items,
      });
      expect(mockPrismaOptimizationService.countOptimized).toHaveBeenCalled();
      expect(mockPrismaOptimizationService.findManyOptimized).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      const siteId = 'site-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        siteId,
        slug,
        schemaJson: {},
      };

      mockCache.get.mockResolvedValue(collection);
      mockPrismaOptimizationService.countOptimized.mockResolvedValue(0);
      mockPrismaOptimizationService.findManyOptimized.mockResolvedValue([]);

      await service.list(siteId, slug, {
        page: 1,
        pageSize: 10,
        status: 'PUBLISHED',
      });

      expect(mockPrismaOptimizationService.findManyOptimized).toHaveBeenCalledWith(
        'collectionItem',
        expect.objectContaining({ status: 'PUBLISHED' }),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should sort by field', async () => {
      const siteId = 'site-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        siteId,
        slug,
        schemaJson: {},
      };

      mockCache.get.mockResolvedValue(collection);
      mockPrismaOptimizationService.countOptimized.mockResolvedValue(0);
      mockPrismaOptimizationService.findManyOptimized.mockResolvedValue([]);

      await service.list(siteId, slug, {
        page: 1,
        pageSize: 10,
        sort: '-createdAt',
      });

      expect(mockPrismaOptimizationService.findManyOptimized).toHaveBeenCalledWith(
        'collectionItem',
        expect.any(Object),
        expect.any(Object),
        expect.objectContaining({ orderBy: [{ createdAt: 'desc' }] }),
      );
    });
  });

  describe('create', () => {
    it('should create item successfully', async () => {
      const siteId = 'site-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        siteId,
        slug,
        schemaJson: { title: 'string' },
      };
      const dto = {
        data: { title: 'Test Article' },
        status: 'DRAFT' as const,
      };
      const createdItem = {
        id: 'item-1',
        siteId,
        collectionId: 'col-1',
        data: dto.data,
        status: 'DRAFT',
        version: 1,
      };

      mockCache.get.mockResolvedValue(collection);
      mockPrismaService.collectionItem.create.mockResolvedValue(createdItem);

      const result = await service.create(siteId, slug, dto, 'user-1');

      expect(result).toEqual(createdItem);
      expect(mockPrismaService.collectionItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            siteId,
            collectionId: 'col-1',
            data: dto.data,
            status: 'DRAFT',
            createdById: 'user-1',
            publishedAt: null,
          },
        }),
      );
    });

    it('should validate data against schema', async () => {
      const siteId = 'site-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        siteId,
        slug,
        schemaJson: { title: 'string' },
      };
      const dto = {
        data: { title: 'Test' },
        status: 'DRAFT' as const,
      };

      mockCache.get.mockResolvedValue(collection);
      mockPrismaService.collectionItem.create.mockResolvedValue({
        id: 'item-1',
        ...dto,
      });

      await service.create(siteId, slug, dto);

      expect(mockPrismaService.collectionItem.create).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should return item by id', async () => {
      const siteId = 'site-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        siteId,
        slug,
        schemaJson: {},
      };
      const item = {
        id: 'item-1',
        siteId,
        collectionId: 'col-1',
        data: { title: 'Test' },
        status: 'DRAFT',
        version: 1,
        etag: 'abc123',
      };

      mockCache.get.mockResolvedValue(collection);
      mockPrismaService.collectionItem.findFirst.mockResolvedValue(item);

      const result = await service.get(siteId, slug, 'item-1');

      expect(result).toEqual(item);
      expect(mockPrismaService.collectionItem.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            siteId,
            collectionId: 'col-1',
            id: 'item-1',
          },
        }),
      );
    });

    it('should throw NotFoundException when item not found', async () => {
      const siteId = 'site-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        siteId,
        slug,
        schemaJson: {},
      };

      mockCache.get.mockResolvedValue(collection);
      mockPrismaService.collectionItem.findFirst.mockResolvedValue(null);

      await expect(
        service.get(siteId, slug, 'nonexistent')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update item successfully', async () => {
      const siteId = 'site-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        siteId,
        slug,
        schemaJson: { title: 'string' },
      };
      const currentItem = {
        id: 'item-1',
        siteId,
        collectionId: 'col-1',
        data: { title: 'Original' },
        status: 'DRAFT',
        version: 1,
        publishedAt: null,
      };
      const dto = {
        data: { title: 'Updated' },
        status: 'PUBLISHED' as const,
        version: 1,
      };
      const updatedItem = {
        ...currentItem,
        data: dto.data,
        status: 'PUBLISHED',
        version: 2,
        publishedAt: new Date(),
      };

      mockCache.get.mockResolvedValue(collection);
      mockPrismaService.collectionItem.findFirst
        .mockResolvedValueOnce(currentItem)
        .mockResolvedValueOnce(currentItem);
      mockPrismaService.collectionItem.update.mockResolvedValue(updatedItem);

      const result = await service.update(siteId, slug, 'item-1', dto, 'user-1');

      expect(result).toEqual(updatedItem);
      expect(mockPrismaService.collectionItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: {
            data: dto.data,
            status: 'PUBLISHED',
            version: 2,
            updatedById: 'user-1',
            publishedAt: expect.any(Date),
          },
        }),
      );
    });

    it('should throw ConflictException on version mismatch', async () => {
      const siteId = 'site-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        siteId,
        slug,
        schemaJson: {},
      };
      const currentItem = {
        id: 'item-1',
        siteId,
        collectionId: 'col-1',
        data: { title: 'Original' },
        status: 'DRAFT',
        version: 2,
        publishedAt: null,
      };
      const dto = {
        data: { title: 'Updated' },
        status: 'DRAFT' as const,
        version: 1, // Wrong version - current is 2
      };

      mockCache.get.mockResolvedValue(collection);
      mockPrismaService.collectionItem.findFirst.mockResolvedValue(currentItem);

      await expect(
        service.update(siteId, slug, 'item-1', dto)
      ).rejects.toThrow(ConflictException);
    });

    it('should preserve publishedAt when status is not PUBLISHED', async () => {
      const siteId = 'site-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        siteId,
        slug,
        schemaJson: {},
      };
      const publishedAt = new Date('2024-01-01');
      const currentItem = {
        id: 'item-1',
        siteId,
        collectionId: 'col-1',
        data: { title: 'Published' },
        status: 'PUBLISHED',
        version: 1,
        publishedAt,
      };
      const dto = {
        data: { title: 'Updated' },
        status: 'DRAFT' as const,
        version: 1,
      };

      mockCache.get.mockResolvedValue(collection);
      mockPrismaService.collectionItem.findFirst.mockResolvedValue(currentItem);
      mockPrismaService.collectionItem.update.mockResolvedValue({
        ...currentItem,
        ...dto,
      });

      await service.update(siteId, slug, 'item-1', dto);

      expect(mockPrismaService.collectionItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: expect.objectContaining({
            publishedAt, // Should preserve original publishedAt
          }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('should delete item successfully', async () => {
      const siteId = 'site-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        siteId,
        slug,
        schemaJson: {},
      };
      const item = {
        id: 'item-1',
        siteId,
        collectionId: 'col-1',
      };

      mockCache.get.mockResolvedValue(collection);
      mockPrismaService.collectionItem.findFirst.mockResolvedValue(item);
      mockPrismaService.collectionItem.delete.mockResolvedValue(item);

      const result = await service.remove(siteId, slug, 'item-1');

      expect(result).toEqual({ ok: true });
      expect(mockPrismaService.collectionItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
    });

    it('should throw NotFoundException when item not found', async () => {
      const siteId = 'site-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        siteId,
        slug,
        schemaJson: {},
      };

      mockCache.get.mockResolvedValue(collection);
      mockPrismaService.collectionItem.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(siteId, slug, 'nonexistent')
      ).rejects.toThrow(NotFoundException);
    });
  });
});
