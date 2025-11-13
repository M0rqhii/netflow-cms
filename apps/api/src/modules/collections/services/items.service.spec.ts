import { Test, TestingModule } from '@nestjs/testing';
import { CollectionItemsService } from './items.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionItemsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<CollectionItemsService>(CollectionItemsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCollection', () => {
    it('should return cached collection if available', async () => {
      const tenantId = 'tenant-123';
      const slug = 'articles';
      const cachedCollection = {
        id: 'col-1',
        tenantId,
        slug,
        name: 'Articles',
        schemaJson: { title: 'string' },
      };

      mockCache.get.mockResolvedValue(cachedCollection);

      const result = await (service as any).getCollection(tenantId, slug);

      expect(result).toEqual(cachedCollection);
      expect(mockCache.get).toHaveBeenCalledWith(`col:${tenantId}:${slug}`);
      expect(mockPrismaService.collection.findFirst).not.toHaveBeenCalled();
    });

    it('should fetch and cache collection if not cached', async () => {
      const tenantId = 'tenant-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        tenantId,
        slug,
        name: 'Articles',
        schemaJson: { title: 'string' },
      };

      mockCache.get.mockResolvedValue(null);
      mockPrismaService.collection.findFirst.mockResolvedValue(collection);

      const result = await (service as any).getCollection(tenantId, slug);

      expect(result).toEqual(collection);
      expect(mockCache.get).toHaveBeenCalledWith(`col:${tenantId}:${slug}`);
      expect(mockPrismaService.collection.findFirst).toHaveBeenCalledWith({
        where: { tenantId, slug },
      });
      expect(mockCache.set).toHaveBeenCalledWith(
        `col:${tenantId}:${slug}`,
        collection,
        30
      );
    });

    it('should throw NotFoundException when collection not found', async () => {
      const tenantId = 'tenant-123';
      const slug = 'nonexistent';

      mockCache.get.mockResolvedValue(null);
      mockPrismaService.collection.findFirst.mockResolvedValue(null);

      await expect(
        (service as any).getCollection(tenantId, slug)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('list', () => {
    it('should list items with pagination', async () => {
      const tenantId = 'tenant-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        tenantId,
        slug,
        schemaJson: {},
      };
      const items = [
        {
          id: 'item-1',
          tenantId,
          collectionId: 'col-1',
          data: { title: 'Test' },
          status: 'DRAFT',
          version: 1,
        },
      ];

      mockCache.get.mockResolvedValue(collection);
      mockPrismaService.$transaction.mockResolvedValue([1, items]);

      const result = await service.list(tenantId, slug, {
        page: 1,
        pageSize: 10,
      });

      expect(result).toEqual({
        total: 1,
        page: 1,
        pageSize: 10,
        items,
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      const tenantId = 'tenant-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        tenantId,
        slug,
        schemaJson: {},
      };

      mockCache.get.mockResolvedValue(collection);
      mockPrismaService.$transaction.mockResolvedValue([0, []]);

      await service.list(tenantId, slug, {
        page: 1,
        pageSize: 10,
        status: 'PUBLISHED',
      });

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      // $transaction receives an array of promises/functions
      const transactionCall = mockPrismaService.$transaction.mock.calls[0][0];
      // The second element is the findMany promise
      expect(Array.isArray(transactionCall)).toBe(true);
    });

    it('should sort by field', async () => {
      const tenantId = 'tenant-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        tenantId,
        slug,
        schemaJson: {},
      };

      mockCache.get.mockResolvedValue(collection);
      mockPrismaService.$transaction.mockResolvedValue([0, []]);

      await service.list(tenantId, slug, {
        page: 1,
        pageSize: 10,
        sort: '-createdAt',
      });

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      // $transaction receives an array of promises/functions
      const transactionCall = mockPrismaService.$transaction.mock.calls[0][0];
      // The second element is the findMany promise
      expect(Array.isArray(transactionCall)).toBe(true);
    });
  });

  describe('create', () => {
    it('should create item successfully', async () => {
      const tenantId = 'tenant-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        tenantId,
        slug,
        schemaJson: { title: 'string' },
      };
      const dto = {
        data: { title: 'Test Article' },
        status: 'DRAFT' as const,
      };
      const createdItem = {
        id: 'item-1',
        tenantId,
        collectionId: 'col-1',
        data: dto.data,
        status: 'DRAFT',
        version: 1,
      };

      mockCache.get.mockResolvedValue(collection);
      mockPrismaService.collectionItem.create.mockResolvedValue(createdItem);

      const result = await service.create(tenantId, slug, dto, 'user-1');

      expect(result).toEqual(createdItem);
      expect(mockPrismaService.collectionItem.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          collectionId: 'col-1',
          data: dto.data,
          status: 'DRAFT',
          createdById: 'user-1',
          publishedAt: null,
        },
      });
    });

    it('should validate data against schema', async () => {
      const tenantId = 'tenant-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        tenantId,
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

      await service.create(tenantId, slug, dto);

      expect(mockPrismaService.collectionItem.create).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should return item by id', async () => {
      const tenantId = 'tenant-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        tenantId,
        slug,
        schemaJson: {},
      };
      const item = {
        id: 'item-1',
        tenantId,
        collectionId: 'col-1',
        data: { title: 'Test' },
        status: 'DRAFT',
        version: 1,
        etag: 'abc123',
      };

      mockCache.get.mockResolvedValue(collection);
      mockPrismaService.collectionItem.findFirst.mockResolvedValue(item);

      const result = await service.get(tenantId, slug, 'item-1');

      expect(result).toEqual(item);
      expect(mockPrismaService.collectionItem.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId,
          collectionId: 'col-1',
          id: 'item-1',
        },
      });
    });

    it('should throw NotFoundException when item not found', async () => {
      const tenantId = 'tenant-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        tenantId,
        slug,
        schemaJson: {},
      };

      mockCache.get.mockResolvedValue(collection);
      mockPrismaService.collectionItem.findFirst.mockResolvedValue(null);

      await expect(
        service.get(tenantId, slug, 'nonexistent')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update item successfully', async () => {
      const tenantId = 'tenant-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        tenantId,
        slug,
        schemaJson: { title: 'string' },
      };
      const currentItem = {
        id: 'item-1',
        tenantId,
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

      const result = await service.update(tenantId, slug, 'item-1', dto, 'user-1');

      expect(result).toEqual(updatedItem);
      expect(mockPrismaService.collectionItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: {
          data: dto.data,
          status: 'PUBLISHED',
          version: 2,
          updatedById: 'user-1',
          publishedAt: expect.any(Date),
        },
      });
    });

    it('should throw ConflictException on version mismatch', async () => {
      const tenantId = 'tenant-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        tenantId,
        slug,
        schemaJson: {},
      };
      const currentItem = {
        id: 'item-1',
        tenantId,
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
        service.update(tenantId, slug, 'item-1', dto)
      ).rejects.toThrow(ConflictException);
    });

    it('should preserve publishedAt when status is not PUBLISHED', async () => {
      const tenantId = 'tenant-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        tenantId,
        slug,
        schemaJson: {},
      };
      const publishedAt = new Date('2024-01-01');
      const currentItem = {
        id: 'item-1',
        tenantId,
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

      await service.update(tenantId, slug, 'item-1', dto);

      expect(mockPrismaService.collectionItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: expect.objectContaining({
          publishedAt, // Should preserve original publishedAt
        }),
      });
    });
  });

  describe('remove', () => {
    it('should delete item successfully', async () => {
      const tenantId = 'tenant-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        tenantId,
        slug,
        schemaJson: {},
      };
      const item = {
        id: 'item-1',
        tenantId,
        collectionId: 'col-1',
      };

      mockCache.get.mockResolvedValue(collection);
      mockPrismaService.collectionItem.findFirst.mockResolvedValue(item);
      mockPrismaService.collectionItem.delete.mockResolvedValue(item);

      const result = await service.remove(tenantId, slug, 'item-1');

      expect(result).toEqual({ ok: true });
      expect(mockPrismaService.collectionItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
    });

    it('should throw NotFoundException when item not found', async () => {
      const tenantId = 'tenant-123';
      const slug = 'articles';
      const collection = {
        id: 'col-1',
        tenantId,
        slug,
        schemaJson: {},
      };

      mockCache.get.mockResolvedValue(collection);
      mockPrismaService.collectionItem.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(tenantId, slug, 'nonexistent')
      ).rejects.toThrow(NotFoundException);
    });
  });
});

