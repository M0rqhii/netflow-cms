import { Test, TestingModule } from '@nestjs/testing';
import { ContentEntriesService } from './content-entries.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ContentTypesService } from '../../content-types/services/content-types.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('ContentEntriesService', () => {
  let service: ContentEntriesService;

  const mockPrismaService = {
    contentEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockContentTypesService = {
    getBySlug: jest.fn(),
  };

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentEntriesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ContentTypesService,
          useValue: mockContentTypesService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<ContentEntriesService>(ContentEntriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const tenantId = 'tenant-123';
    const contentTypeSlug = 'article';
    const contentType = {
      id: 'content-type-123',
      tenantId,
      slug: contentTypeSlug,
      name: 'Article',
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['title'],
      },
    };

    beforeEach(() => {
      mockCache.get.mockResolvedValue(null);
      mockContentTypesService.getBySlug.mockResolvedValue(contentType);
    });

    it('should create content entry successfully', async () => {
      const dto = {
        data: {
          title: 'Test Article',
          content: 'Article content',
        },
        status: 'draft' as const,
      };

      const createdEntry = {
        id: 'entry-123',
        tenantId,
        contentTypeId: contentType.id,
        data: dto.data,
        status: dto.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.contentEntry.create.mockResolvedValue(createdEntry);

      const result = await service.create(tenantId, contentTypeSlug, dto);

      expect(result).toEqual(createdEntry);
      expect(mockContentTypesService.getBySlug).toHaveBeenCalledWith(
        tenantId,
        contentTypeSlug
      );
      expect(mockPrismaService.contentEntry.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          contentTypeId: contentType.id,
          data: dto.data,
          status: dto.status,
        },
      });
    });

    it('should throw BadRequestException if required field is missing', async () => {
      const dto = {
        data: {
          content: 'Article content',
          // title is missing
        },
        status: 'draft' as const,
      };

      await expect(
        service.create(tenantId, contentTypeSlug, dto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if field type is invalid', async () => {
      const dto = {
        data: {
          title: 123, // Should be string
          content: 'Article content',
        },
        status: 'draft' as const,
      };

      await expect(
        service.create(tenantId, contentTypeSlug, dto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should use cached content type if available', async () => {
      mockCache.get.mockResolvedValue(contentType);
      const dto = {
        data: { title: 'Test', content: 'Content' },
        status: 'draft' as const,
      };

      mockPrismaService.contentEntry.create.mockResolvedValue({
        id: 'entry-123',
        tenantId,
        contentTypeId: contentType.id,
        data: dto.data,
        status: dto.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create(tenantId, contentTypeSlug, dto);

      expect(mockCache.get).toHaveBeenCalledWith(`ct:${tenantId}:${contentTypeSlug}`);
      expect(mockContentTypesService.getBySlug).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    const tenantId = 'tenant-123';
    const contentTypeSlug = 'article';
    const contentType = {
      id: 'content-type-123',
      tenantId,
      slug: contentTypeSlug,
      name: 'Article',
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
        },
      },
    };

    beforeEach(() => {
      mockCache.get.mockResolvedValue(null);
      mockContentTypesService.getBySlug.mockResolvedValue(contentType);
    });

    it('should list content entries with pagination', async () => {
      const query = {
        page: 1,
        pageSize: 20,
      };

      const entries = [
        {
          id: 'entry-1',
          tenantId,
          contentTypeId: contentType.id,
          data: { title: 'Article 1' },
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
          contentType: {
            id: contentType.id,
            name: contentType.name,
            slug: contentTypeSlug,
          },
        },
      ];

      mockPrismaService.contentEntry.findMany.mockResolvedValue(entries);
      mockPrismaService.contentEntry.count.mockResolvedValue(1);

      const result = await service.list(tenantId, contentTypeSlug, query);

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.entries).toEqual(entries);
    });

    it('should filter by status', async () => {
      const query = {
        page: 1,
        pageSize: 20,
        status: 'published' as const,
      };

      mockPrismaService.contentEntry.findMany.mockResolvedValue([]);
      mockPrismaService.contentEntry.count.mockResolvedValue(0);

      await service.list(tenantId, contentTypeSlug, query);

      expect(mockPrismaService.contentEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'published',
          }),
        })
      );
    });

    it('should sort by createdAt desc by default', async () => {
      const query = {
        page: 1,
        pageSize: 20,
      };

      mockPrismaService.contentEntry.findMany.mockResolvedValue([]);
      mockPrismaService.contentEntry.count.mockResolvedValue(0);

      await service.list(tenantId, contentTypeSlug, query);

      expect(mockPrismaService.contentEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ createdAt: 'desc' }],
        })
      );
    });

    it('should apply custom sorting', async () => {
      const query = {
        page: 1,
        pageSize: 20,
        sort: '-updatedAt,status',
      };

      mockPrismaService.contentEntry.findMany.mockResolvedValue([]);
      mockPrismaService.contentEntry.count.mockResolvedValue(0);

      await service.list(tenantId, contentTypeSlug, query);

      expect(mockPrismaService.contentEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            { updatedAt: 'desc' },
            { status: 'asc' },
          ],
        })
      );
    });

    it('should filter by JSON fields', async () => {
      const query = {
        page: 1,
        pageSize: 20,
        filter: { title: 'Test Article' },
      };

      const allEntries = [
        {
          id: 'entry-1',
          tenantId,
          contentTypeId: contentType.id,
          data: { title: 'Test Article', content: 'Content 1' },
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'entry-2',
          tenantId,
          contentTypeId: contentType.id,
          data: { title: 'Other Article', content: 'Content 2' },
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.contentEntry.findMany
        .mockResolvedValueOnce(allEntries) // First call for filtered results
        .mockResolvedValueOnce(allEntries); // Second call for count

      const result = await service.list(tenantId, contentTypeSlug, query);

      expect(result.entries.length).toBe(1);
      expect(result.entries[0].data).toMatchObject({ title: 'Test Article' });
    });

    it('should apply full-text search', async () => {
      const query = {
        page: 1,
        pageSize: 20,
        search: 'test',
      };

      const allEntries = [
        {
          id: 'entry-1',
          tenantId,
          contentTypeId: contentType.id,
          data: { title: 'Test Article', content: 'Content' },
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'entry-2',
          tenantId,
          contentTypeId: contentType.id,
          data: { title: 'Other Article', content: 'Content' },
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.contentEntry.findMany
        .mockResolvedValueOnce(allEntries)
        .mockResolvedValueOnce(allEntries);

      const result = await service.list(tenantId, contentTypeSlug, query);

      expect(result.entries.length).toBe(1);
      expect(result.entries[0].data).toMatchObject({ title: 'Test Article' });
    });
  });

  describe('get', () => {
    const tenantId = 'tenant-123';
    const contentTypeSlug = 'article';
    const contentType = {
      id: 'content-type-123',
      tenantId,
      slug: contentTypeSlug,
      name: 'Article',
      schema: {},
    };

    beforeEach(() => {
      mockCache.get.mockResolvedValue(null);
      mockContentTypesService.getBySlug.mockResolvedValue(contentType);
    });

    it('should get content entry by id', async () => {
      const entryId = 'entry-123';
      const entry = {
        id: entryId,
        tenantId,
        contentTypeId: contentType.id,
        data: { title: 'Test' },
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        contentType: {
          id: contentType.id,
          name: contentType.name,
          slug: contentTypeSlug,
        },
      };

      mockPrismaService.contentEntry.findFirst.mockResolvedValue(entry);

      const result = await service.get(tenantId, contentTypeSlug, entryId);

      expect(result).toEqual(entry);
      expect(mockPrismaService.contentEntry.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId,
          contentTypeId: contentType.id,
          id: entryId,
        },
        include: {
          contentType: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if entry not found', async () => {
      mockPrismaService.contentEntry.findFirst.mockResolvedValue(null);

      await expect(
        service.get(tenantId, contentTypeSlug, 'non-existent')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const tenantId = 'tenant-123';
    const contentTypeSlug = 'article';
    const contentType = {
      id: 'content-type-123',
      tenantId,
      slug: contentTypeSlug,
      name: 'Article',
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
        },
      },
    };

    beforeEach(() => {
      mockCache.get.mockResolvedValue(null);
      mockContentTypesService.getBySlug.mockResolvedValue(contentType);
    });

    it('should update content entry', async () => {
      const entryId = 'entry-123';
      const currentEntry = {
        id: entryId,
        tenantId,
        contentTypeId: contentType.id,
        data: { title: 'Old Title', content: 'Old Content' },
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const dto = {
        data: { title: 'New Title', content: 'New Content' },
      };

      const updatedEntry = {
        ...currentEntry,
        data: dto.data,
        updatedAt: new Date(),
        contentType: {
          id: contentType.id,
          name: contentType.name,
          slug: contentTypeSlug,
        },
      };

      mockPrismaService.contentEntry.findFirst.mockResolvedValue(currentEntry);
      mockPrismaService.contentEntry.update.mockResolvedValue(updatedEntry);

      const result = await service.update(tenantId, contentTypeSlug, entryId, dto);

      expect(result).toEqual(updatedEntry);
      expect(mockPrismaService.contentEntry.update).toHaveBeenCalledWith({
        where: { id: entryId },
        data: { data: dto.data },
        include: {
          contentType: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });
    });

    it('should update status only', async () => {
      const entryId = 'entry-123';
      const currentEntry = {
        id: entryId,
        tenantId,
        contentTypeId: contentType.id,
        data: { title: 'Title' },
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const dto = {
        status: 'published' as const,
      };

      mockPrismaService.contentEntry.findFirst.mockResolvedValue(currentEntry);
      mockPrismaService.contentEntry.update.mockResolvedValue({
        ...currentEntry,
        status: 'published',
      });

      await service.update(tenantId, contentTypeSlug, entryId, dto);

      expect(mockPrismaService.contentEntry.update).toHaveBeenCalledWith({
        where: { id: entryId },
        data: { status: 'published' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if entry not found', async () => {
      mockPrismaService.contentEntry.findFirst.mockResolvedValue(null);

      await expect(
        service.update(tenantId, contentTypeSlug, 'non-existent', {})
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    const tenantId = 'tenant-123';
    const contentTypeSlug = 'article';
    const contentType = {
      id: 'content-type-123',
      tenantId,
      slug: contentTypeSlug,
      name: 'Article',
      schema: {},
    };

    beforeEach(() => {
      mockCache.get.mockResolvedValue(null);
      mockContentTypesService.getBySlug.mockResolvedValue(contentType);
    });

    it('should delete content entry', async () => {
      const entryId = 'entry-123';
      const entry = {
        id: entryId,
        tenantId,
        contentTypeId: contentType.id,
        data: {},
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.contentEntry.findFirst.mockResolvedValue(entry);
      mockPrismaService.contentEntry.delete.mockResolvedValue(entry);

      const result = await service.remove(tenantId, contentTypeSlug, entryId);

      expect(result).toEqual({ ok: true });
      expect(mockPrismaService.contentEntry.delete).toHaveBeenCalledWith({
        where: { id: entryId },
      });
    });

    it('should throw NotFoundException if entry not found', async () => {
      mockPrismaService.contentEntry.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(tenantId, contentTypeSlug, 'non-existent')
      ).rejects.toThrow(NotFoundException);
    });
  });
});



