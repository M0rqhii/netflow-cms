import { Test, TestingModule } from '@nestjs/testing';
import { CollectionsService } from './collections.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('CollectionsService', () => {
  let service: CollectionsService;

  const mockPrismaService = {
    collection: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionsService,
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

    service = module.get<CollectionsService>(CollectionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create collection successfully', async () => {
      const siteId = 'site-123';
      const dto = {
        slug: 'articles',
        name: 'Articles',
        schemaJson: { title: 'string' },
      };

      mockPrismaService.collection.create.mockResolvedValue({
        id: '1',
        siteId,
        ...dto,
      });

      const result = await service.create(siteId, dto);

      expect(result).toHaveProperty('id');
      expect(mockPrismaService.collection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            siteId,
            slug: dto.slug,
            name: dto.name,
            schemaJson: dto.schemaJson,
          },
        }),
      );
    });

    it('should throw ConflictException on duplicate slug', async () => {
      const siteId = 'site-123';
      const dto = {
        slug: 'articles',
        name: 'Articles',
        schemaJson: {},
      };

      mockPrismaService.collection.create.mockRejectedValue({
        code: 'P2002',
      });

      await expect(service.create(siteId, dto)).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('list', () => {
    it('should return collections filtered by siteId', async () => {
      const siteId = 'site-123';
      const mockCollections = [
        { id: '1', siteId, slug: 'articles', name: 'Articles' },
      ];

      mockPrismaService.collection.findMany.mockResolvedValue(mockCollections);

      const result = await service.list(siteId, {});

      expect(result).toEqual(mockCollections);
      expect(mockPrismaService.collection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { siteId },
          orderBy: [{ createdAt: 'desc' }],
        }),
      );
    });
  });

  describe('getBySlug', () => {
    it('should return collection by slug', async () => {
      const siteId = 'site-123';
      const slug = 'articles';
      const mockCollection = {
        id: '1',
        siteId,
        slug,
        name: 'Articles',
      };

      mockPrismaService.collection.findFirst.mockResolvedValue(mockCollection);

      const result = await service.getBySlug(siteId, slug);

      expect(result).toEqual(mockCollection);
      expect(mockPrismaService.collection.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { siteId, slug },
        }),
      );
    });

    it('should throw NotFoundException when collection not found', async () => {
      const siteId = 'site-123';
      const slug = 'nonexistent';

      mockPrismaService.collection.findFirst.mockResolvedValue(null);

      await expect(service.getBySlug(siteId, slug)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('update', () => {
    it('should update collection', async () => {
      const siteId = 'site-123';
      const slug = 'articles';
      const dto = { name: 'Updated Articles' };
      const mockCollection = {
        id: '1',
        siteId,
        slug,
        name: 'Articles',
      };

      mockPrismaService.collection.findFirst.mockResolvedValue(mockCollection);
      mockPrismaService.collection.update.mockResolvedValue({
        ...mockCollection,
        ...dto,
      });

      const result = await service.update(siteId, slug, dto);

      expect(result.name).toBe('Updated Articles');
      expect(mockPrismaService.collection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockCollection.id },
          data: dto,
        }),
      );
    });
  });

  describe('remove', () => {
    it('should delete collection', async () => {
      const siteId = 'site-123';
      const slug = 'articles';
      const mockCollection = {
        id: '1',
        siteId,
        slug,
      };

      mockPrismaService.collection.findFirst.mockResolvedValue(mockCollection);
      mockPrismaService.collection.delete.mockResolvedValue(mockCollection);

      const result = await service.remove(siteId, slug);

      expect(result).toEqual({ ok: true });
      expect(mockPrismaService.collection.delete).toHaveBeenCalledWith({
        where: { id: mockCollection.id },
      });
    });

    it('should throw NotFoundException when collection not found', async () => {
      const siteId = 'site-123';
      const slug = 'nonexistent';

      mockPrismaService.collection.findFirst.mockResolvedValue(null);

      await expect(service.remove(siteId, slug)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('site isolation', () => {
    it('should only return collections for specific site', async () => {
      const siteId1 = 'site-1';
      const siteId2 = 'site-2';
      const mockCollections1 = [
        { id: '1', siteId: siteId1, slug: 'articles' },
      ];
      const mockCollections2 = [
        { id: '2', siteId: siteId2, slug: 'articles' },
      ];

      mockPrismaService.collection.findMany
        .mockResolvedValueOnce(mockCollections1)
        .mockResolvedValueOnce(mockCollections2);

      const result1 = await service.list(siteId1, {});
      const result2 = await service.list(siteId2, {});

      expect(result1).toEqual(mockCollections1);
      expect(result2).toEqual(mockCollections2);
      expect(mockPrismaService.collection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { siteId: siteId1 },
          orderBy: [{ createdAt: 'desc' }],
        }),
      );
      expect(mockPrismaService.collection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { siteId: siteId2 },
          orderBy: [{ createdAt: 'desc' }],
        }),
      );
    });
  });
});

