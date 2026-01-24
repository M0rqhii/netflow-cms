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
    $queryRawUnsafe: jest.fn(),
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
    const siteId = 'site-123';
    const contentTypeSlug = 'article';
    const contentType = {
      id: 'content-type-123',
      siteId,
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
        siteId,
        contentTypeId: contentType.id,
        data: dto.data,
        status: dto.status,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: undefined,
        updatedById: undefined,
      };

      mockPrismaService.contentEntry.create.mockResolvedValue(createdEntry);

      const result = await service.create(siteId, contentTypeSlug, dto);

      expect(result).toEqual(createdEntry);
      expect(mockContentTypesService.getBySlug).toHaveBeenCalledWith(
        siteId,
        contentTypeSlug
      );
      expect(mockPrismaService.contentEntry.create).toHaveBeenCalledWith({
        data: {
          siteId,
          contentTypeId: contentType.id,
          data: dto.data,
          status: dto.status,
          createdById: undefined,
          updatedById: undefined,
        },
        select: expect.any(Object),
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
        service.create(siteId, contentTypeSlug, dto)
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
        service.create(siteId, contentTypeSlug, dto)
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
        siteId,
        contentTypeId: contentType.id,
        data: dto.data,
        status: dto.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create(siteId, contentTypeSlug, dto);

      expect(mockCache.get).toHaveBeenCalledWith(`ct:${siteId}:${contentTypeSlug}`);
      expect(mockContentTypesService.getBySlug).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    const siteId = 'site-123';
    const contentTypeSlug = 'article';
    const contentType = {
      id: 'content-type-123',
      siteId,
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
          siteId,
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

      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce(entries)
        .mockResolvedValueOnce([{ count: BigInt(1) }]);

      const result = await service.list(siteId, contentTypeSlug, query);

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

      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(0) }]);

      await service.list(siteId, contentTypeSlug, query);

      const [sql] = mockPrismaService.$queryRawUnsafe.mock.calls[0];
      expect(String(sql)).toContain('ce.status');
    });

    it('should sort by createdAt desc by default', async () => {
      const query = {
        page: 1,
        pageSize: 20,
      };

      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(0) }]);

      await service.list(siteId, contentTypeSlug, query);

      const [sql] = mockPrismaService.$queryRawUnsafe.mock.calls[0];
      expect(String(sql)).toContain('ORDER BY ce."createdAt" DESC');
    });

    it('should apply custom sorting', async () => {
      const query = {
        page: 1,
        pageSize: 20,
        sort: '-updatedAt,status',
      };

      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(0) }]);

      await service.list(siteId, contentTypeSlug, query);

      const [sql] = mockPrismaService.$queryRawUnsafe.mock.calls[0];
      expect(String(sql)).toContain('ORDER BY ce."updatedAt" DESC, ce."status" ASC');
    });

    it('should filter by JSON fields', async () => {
      const query = {
        page: 1,
        pageSize: 20,
        filter: { title: 'Test Article' },
      };

      const filteredEntries = [
        {
          id: 'entry-1',
          siteId,
          contentTypeId: contentType.id,
          data: { title: 'Test Article', content: 'Content 1' },
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce(filteredEntries)
        .mockResolvedValueOnce([{ count: BigInt(1) }]);

      const result = await service.list(siteId, contentTypeSlug, query);

      expect(result.entries.length).toBe(1);
      expect(result.entries[0].data).toMatchObject({ title: 'Test Article' });
    });

    it('should apply full-text search', async () => {
      const query = {
        page: 1,
        pageSize: 20,
        search: 'test',
      };

      const filteredEntries = [
        {
          id: 'entry-1',
          siteId,
          contentTypeId: contentType.id,
          data: { title: 'Test Article', content: 'Content' },
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce(filteredEntries)
        .mockResolvedValueOnce([{ count: BigInt(1) }]);

      const result = await service.list(siteId, contentTypeSlug, query);

      expect(result.entries.length).toBe(1);
      expect(result.entries[0].data).toMatchObject({ title: 'Test Article' });
    });
  });

  describe('get', () => {
    const siteId = 'site-123';
    const contentTypeSlug = 'article';
    const contentType = {
      id: 'content-type-123',
      siteId,
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
        siteId,
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

      const result = await service.get(siteId, contentTypeSlug, entryId);

      expect(result).toEqual(entry);
      expect(mockPrismaService.contentEntry.findFirst).toHaveBeenCalledWith({
        where: {
          siteId,
          contentTypeId: contentType.id,
          id: entryId,
        },
        select: {
          id: true,
          siteId: true,
          contentTypeId: true,
          data: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          publishedAt: true,
          reviewedAt: true,
          reviewedById: true,
          createdById: true,
          updatedById: true,
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
        service.get(siteId, contentTypeSlug, 'non-existent')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const siteId = 'site-123';
    const contentTypeSlug = 'article';
    const contentType = {
      id: 'content-type-123',
      siteId,
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
        siteId,
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

      const result = await service.update(siteId, contentTypeSlug, entryId, dto);

      expect(result).toEqual(updatedEntry);
      expect(mockPrismaService.contentEntry.update).toHaveBeenCalledWith({
        where: { id: entryId },
        data: { data: dto.data },
        select: expect.any(Object),
      });
    });

    it('should update status only', async () => {
      const entryId = 'entry-123';
      const currentEntry = {
        id: entryId,
        siteId,
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

      await service.update(siteId, contentTypeSlug, entryId, dto);

      expect(mockPrismaService.contentEntry.update).toHaveBeenCalledWith({
        where: { id: entryId },
        data: { status: 'published' },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundException if entry not found', async () => {
      mockPrismaService.contentEntry.findFirst.mockResolvedValue(null);

      await expect(
        service.update(siteId, contentTypeSlug, 'non-existent', {})
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    const siteId = 'site-123';
    const contentTypeSlug = 'article';
    const contentType = {
      id: 'content-type-123',
      siteId,
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
        siteId,
        contentTypeId: contentType.id,
        data: {},
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.contentEntry.findFirst.mockResolvedValue(entry);
      mockPrismaService.contentEntry.delete.mockResolvedValue(entry);

      const result = await service.remove(siteId, contentTypeSlug, entryId);

      expect(result).toEqual({ ok: true });
      expect(mockPrismaService.contentEntry.delete).toHaveBeenCalledWith({
        where: { id: entryId },
      });
    });

    it('should throw NotFoundException if entry not found', async () => {
      mockPrismaService.contentEntry.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(siteId, contentTypeSlug, 'non-existent')
      ).rejects.toThrow(NotFoundException);
    });
  });
});
