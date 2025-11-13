import { Test, TestingModule } from '@nestjs/testing';
import { CollectionsService } from './collections.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
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
      const tenantId = 'tenant-123';
      const dto = {
        slug: 'articles',
        name: 'Articles',
        schemaJson: { title: 'string' },
      };

      mockPrismaService.collection.create.mockResolvedValue({
        id: '1',
        tenantId,
        ...dto,
      });

      const result = await service.create(tenantId, dto);

      expect(result).toHaveProperty('id');
      expect(mockPrismaService.collection.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          slug: dto.slug,
          name: dto.name,
          schemaJson: dto.schemaJson,
        },
      });
    });

    it('should throw ConflictException on duplicate slug', async () => {
      const tenantId = 'tenant-123';
      const dto = {
        slug: 'articles',
        name: 'Articles',
        schemaJson: {},
      };

      mockPrismaService.collection.create.mockRejectedValue({
        code: 'P2002',
      });

      await expect(service.create(tenantId, dto)).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('list', () => {
    it('should return collections filtered by tenantId', async () => {
      const tenantId = 'tenant-123';
      const mockCollections = [
        { id: '1', tenantId, slug: 'articles', name: 'Articles' },
      ];

      mockPrismaService.collection.findMany.mockResolvedValue(mockCollections);

      const result = await service.list(tenantId);

      expect(result).toEqual(mockCollections);
      expect(mockPrismaService.collection.findMany).toHaveBeenCalledWith({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getBySlug', () => {
    it('should return collection by slug', async () => {
      const tenantId = 'tenant-123';
      const slug = 'articles';
      const mockCollection = {
        id: '1',
        tenantId,
        slug,
        name: 'Articles',
      };

      mockPrismaService.collection.findFirst.mockResolvedValue(mockCollection);

      const result = await service.getBySlug(tenantId, slug);

      expect(result).toEqual(mockCollection);
      expect(mockPrismaService.collection.findFirst).toHaveBeenCalledWith({
        where: { tenantId, slug },
      });
    });

    it('should throw NotFoundException when collection not found', async () => {
      const tenantId = 'tenant-123';
      const slug = 'nonexistent';

      mockPrismaService.collection.findFirst.mockResolvedValue(null);

      await expect(service.getBySlug(tenantId, slug)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('update', () => {
    it('should update collection', async () => {
      const tenantId = 'tenant-123';
      const slug = 'articles';
      const dto = { name: 'Updated Articles' };
      const mockCollection = {
        id: '1',
        tenantId,
        slug,
        name: 'Articles',
      };

      mockPrismaService.collection.findFirst.mockResolvedValue(mockCollection);
      mockPrismaService.collection.update.mockResolvedValue({
        ...mockCollection,
        ...dto,
      });

      const result = await service.update(tenantId, slug, dto);

      expect(result.name).toBe('Updated Articles');
      expect(mockPrismaService.collection.update).toHaveBeenCalledWith({
        where: { id: mockCollection.id },
        data: dto,
      });
    });
  });

  describe('remove', () => {
    it('should delete collection', async () => {
      const tenantId = 'tenant-123';
      const slug = 'articles';
      const mockCollection = {
        id: '1',
        tenantId,
        slug,
      };

      mockPrismaService.collection.findFirst.mockResolvedValue(mockCollection);
      mockPrismaService.collection.delete.mockResolvedValue(mockCollection);

      const result = await service.remove(tenantId, slug);

      expect(result).toEqual({ ok: true });
      expect(mockPrismaService.collection.delete).toHaveBeenCalledWith({
        where: { id: mockCollection.id },
      });
    });

    it('should throw NotFoundException when collection not found', async () => {
      const tenantId = 'tenant-123';
      const slug = 'nonexistent';

      mockPrismaService.collection.findFirst.mockResolvedValue(null);

      await expect(service.remove(tenantId, slug)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('tenant isolation', () => {
    it('should only return collections for specific tenant', async () => {
      const tenantId1 = 'tenant-1';
      const tenantId2 = 'tenant-2';
      const mockCollections1 = [
        { id: '1', tenantId: tenantId1, slug: 'articles' },
      ];
      const mockCollections2 = [
        { id: '2', tenantId: tenantId2, slug: 'articles' },
      ];

      mockPrismaService.collection.findMany
        .mockResolvedValueOnce(mockCollections1)
        .mockResolvedValueOnce(mockCollections2);

      const result1 = await service.list(tenantId1);
      const result2 = await service.list(tenantId2);

      expect(result1).toEqual(mockCollections1);
      expect(result2).toEqual(mockCollections2);
      expect(mockPrismaService.collection.findMany).toHaveBeenCalledWith({
        where: { tenantId: tenantId1 },
        orderBy: { createdAt: 'desc' },
      });
      expect(mockPrismaService.collection.findMany).toHaveBeenCalledWith({
        where: { tenantId: tenantId2 },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});

