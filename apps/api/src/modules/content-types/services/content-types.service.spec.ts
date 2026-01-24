import { Test, TestingModule } from '@nestjs/testing';
import { ContentTypesService } from './content-types.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('ContentTypesService', () => {
  let service: ContentTypesService;

  const mockPrismaService = {
    contentType: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    contentEntry: {
      count: jest.fn(),
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
        ContentTypesService,
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

    service = module.get<ContentTypesService>(ContentTypesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create content type with fields', async () => {
      const siteId = 'site-123';
      const dto = {
        name: 'Article',
        slug: 'article',
        fields: [
          {
            name: 'title',
            type: 'text' as const,
            required: true,
            maxLength: 200,
          },
          {
            name: 'content',
            type: 'richtext' as const,
            required: true,
          },
        ],
      };

      mockPrismaService.contentType.create.mockResolvedValue({
        id: '1',
        siteId,
        name: dto.name,
        slug: dto.slug,
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string', maxLength: 200 },
            content: { type: 'string' },
          },
          required: ['title', 'content'],
        },
      });

      const result = await service.create(siteId, dto);

      expect(result).toHaveProperty('id');
      expect(mockPrismaService.contentType.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            siteId,
            name: dto.name,
            slug: dto.slug,
            schema: expect.objectContaining({
              type: 'object',
              properties: expect.objectContaining({
                title: expect.any(Object),
                content: expect.any(Object),
              }),
              required: expect.arrayContaining(['title', 'content']),
            }),
          },
        }),
      );
    });

    it('should create content type with schema', async () => {
      const siteId = 'site-123';
      const dto = {
        name: 'Page',
        slug: 'page',
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
          },
        },
      };

      mockPrismaService.contentType.create.mockResolvedValue({
        id: '1',
        siteId,
        ...dto,
      });

      const result = await service.create(siteId, dto);

      expect(result).toHaveProperty('id');
      expect(mockPrismaService.contentType.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            siteId,
            name: dto.name,
            slug: dto.slug,
            schema: dto.schema,
          },
        }),
      );
    });

    it('should throw ConflictException on duplicate slug', async () => {
      const siteId = 'site-123';
      const dto = {
        name: 'Article',
        slug: 'article',
        fields: [{ name: 'test', type: 'text' as const, required: false }],
      };

      mockPrismaService.contentType.create.mockRejectedValue({
        code: 'P2002',
      });

      await expect(service.create(siteId, dto)).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('list', () => {
    it('should return content types filtered by siteId', async () => {
      const siteId = 'site-123';
      const mockContentTypes = [
        { id: '1', siteId, slug: 'article', name: 'Article' },
      ];

      mockPrismaService.contentType.findMany.mockResolvedValue(
        mockContentTypes
      );

      const result = await service.list(siteId);

      expect(result).toEqual(mockContentTypes);
      expect(mockPrismaService.contentType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { siteId },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('getById', () => {
    it('should return content type by id', async () => {
      const siteId = 'site-123';
      const id = 'content-type-1';
      const mockContentType = {
        id,
        siteId,
        slug: 'article',
        name: 'Article',
      };

      mockPrismaService.contentType.findFirst.mockResolvedValue(
        mockContentType
      );

      const result = await service.getById(siteId, id);

      expect(result).toEqual(mockContentType);
      expect(mockPrismaService.contentType.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { siteId, id },
        }),
      );
    });

    it('should throw NotFoundException when content type not found', async () => {
      const siteId = 'site-123';
      const id = 'nonexistent';

      mockPrismaService.contentType.findFirst.mockResolvedValue(null);

      await expect(service.getById(siteId, id)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getBySlug', () => {
    it('should return content type by slug', async () => {
      const siteId = 'site-123';
      const slug = 'article';
      const mockContentType = {
        id: '1',
        siteId,
        slug,
        name: 'Article',
      };

      mockPrismaService.contentType.findFirst.mockResolvedValue(
        mockContentType
      );

      const result = await service.getBySlug(siteId, slug);

      expect(result).toEqual(mockContentType);
      expect(mockPrismaService.contentType.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { siteId, slug },
        }),
      );
    });

    it('should throw NotFoundException when content type not found', async () => {
      const siteId = 'site-123';
      const slug = 'nonexistent';

      mockPrismaService.contentType.findFirst.mockResolvedValue(null);

      await expect(service.getBySlug(siteId, slug)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('update', () => {
    it('should update content type name', async () => {
      const siteId = 'site-123';
      const id = 'content-type-1';
      const dto = { name: 'Updated Article' };
      const mockContentType = {
        id,
        siteId,
        slug: 'article',
        name: 'Article',
      };

      mockPrismaService.contentType.findFirst.mockResolvedValue(
        mockContentType
      );
      mockPrismaService.contentType.update.mockResolvedValue({
        ...mockContentType,
        ...dto,
      });

      const result = await service.update(siteId, id, dto);

      expect(result.name).toBe('Updated Article');
      expect(mockPrismaService.contentType.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id },
          data: { name: dto.name },
        }),
      );
    });

    it('should update content type schema with fields', async () => {
      const siteId = 'site-123';
      const id = 'content-type-1';
      const dto = {
        fields: [
          { name: 'newField', type: 'text' as const, required: true },
        ],
      };
      const mockContentType = {
        id,
        siteId,
        slug: 'article',
        name: 'Article',
      };

      mockPrismaService.contentType.findFirst.mockResolvedValue(
        mockContentType
      );
      mockPrismaService.contentType.update.mockResolvedValue({
        ...mockContentType,
        schema: {
          type: 'object',
          properties: { newField: { type: 'string' } },
          required: ['newField'],
        },
      });

      const result = await service.update(siteId, id, dto);

      expect(result.schema).toHaveProperty('properties.newField');
      expect(mockPrismaService.contentType.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id },
          data: {
            schema: expect.objectContaining({
              type: 'object',
              properties: expect.objectContaining({
                newField: expect.any(Object),
              }),
            }),
          },
        }),
      );
    });

    it('should throw ConflictException on duplicate slug', async () => {
      const siteId = 'site-123';
      const id = 'content-type-1';
      const dto = { slug: 'duplicate-slug' };
      const mockContentType = {
        id,
        siteId,
        slug: 'article',
        name: 'Article',
      };

      mockPrismaService.contentType.findFirst.mockResolvedValue(
        mockContentType
      );
      mockPrismaService.contentType.update.mockRejectedValue({
        code: 'P2002',
      });

      await expect(service.update(siteId, id, dto)).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('remove', () => {
    it('should delete content type', async () => {
      const siteId = 'site-123';
      const id = 'content-type-1';
      const mockContentType = {
        id,
        siteId,
        slug: 'article',
      };

      mockPrismaService.contentType.findFirst.mockResolvedValue(
        mockContentType
      );
      mockPrismaService.contentEntry.count.mockResolvedValue(0);
      mockPrismaService.contentType.delete.mockResolvedValue(mockContentType);

      const result = await service.remove(siteId, id);

      expect(result).toEqual({ ok: true });
      expect(mockPrismaService.contentEntry.count).toHaveBeenCalledWith({
        where: { siteId, contentTypeId: id },
      });
      expect(mockPrismaService.contentType.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it('should throw ConflictException if content type has entries', async () => {
      const siteId = 'site-123';
      const id = 'content-type-1';
      const mockContentType = {
        id,
        siteId,
        slug: 'article',
      };

      mockPrismaService.contentType.findFirst.mockResolvedValue(
        mockContentType
      );
      mockPrismaService.contentEntry.count.mockResolvedValue(5);

      await expect(service.remove(siteId, id)).rejects.toThrow(
        ConflictException
      );
      expect(mockPrismaService.contentType.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when content type not found', async () => {
      const siteId = 'site-123';
      const id = 'nonexistent';

      mockPrismaService.contentType.findFirst.mockResolvedValue(null);

      await expect(service.remove(siteId, id)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('fieldsToJsonSchema', () => {
    it('should convert text field correctly', async () => {
      const siteId = 'site-123';
      const dto = {
        name: 'Test',
        slug: 'test',
        fields: [
          {
            name: 'title',
            type: 'text' as const,
            required: true,
            maxLength: 200,
            minLength: 5,
          },
        ],
      };

      mockPrismaService.contentType.create.mockResolvedValue({
        id: '1',
        siteId,
        ...dto,
      });

      await service.create(siteId, dto);

      const call = mockPrismaService.contentType.create.mock.calls[0][0];
      expect(call.data.schema.properties.title).toEqual({
        type: 'string',
        maxLength: 200,
        minLength: 5,
      });
    });

    it('should convert number field correctly', async () => {
      const siteId = 'site-123';
      const dto = {
        name: 'Test',
        slug: 'test',
        fields: [
          {
            name: 'age',
            type: 'number' as const,
            required: true,
            min: 0,
            max: 120,
          },
        ],
      };

      mockPrismaService.contentType.create.mockResolvedValue({
        id: '1',
        siteId,
        ...dto,
      });

      await service.create(siteId, dto);

      const call = mockPrismaService.contentType.create.mock.calls[0][0];
      expect(call.data.schema.properties.age).toEqual({
        type: 'number',
        minimum: 0,
        maximum: 120,
      });
    });

    it('should handle optional fields correctly', async () => {
      const siteId = 'site-123';
      const dto = {
        name: 'Test',
        slug: 'test',
        fields: [
          {
            name: 'requiredField',
            type: 'text' as const,
            required: true,
          },
          {
            name: 'optionalField',
            type: 'text' as const,
            required: false,
          },
        ],
      };

      mockPrismaService.contentType.create.mockResolvedValue({
        id: '1',
        siteId,
        ...dto,
      });

      await service.create(siteId, dto);

      const call = mockPrismaService.contentType.create.mock.calls[0][0];
      expect(call.data.schema.required).toEqual(['requiredField']);
      expect(call.data.schema.required).not.toContain('optionalField');
    });
  });

  describe('site isolation', () => {
    it('should only return content types for specific site', async () => {
      const siteId1 = 'site-1';
      const siteId2 = 'site-2';
      const mockContentTypes1 = [
        { id: '1', siteId: siteId1, slug: 'article' },
      ];
      const mockContentTypes2 = [
        { id: '2', siteId: siteId2, slug: 'article' },
      ];

      mockPrismaService.contentType.findMany
        .mockResolvedValueOnce(mockContentTypes1)
        .mockResolvedValueOnce(mockContentTypes2);

      const result1 = await service.list(siteId1);
      const result2 = await service.list(siteId2);

      expect(result1).toEqual(mockContentTypes1);
      expect(result2).toEqual(mockContentTypes2);
      expect(mockPrismaService.contentType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { siteId: siteId1 },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(mockPrismaService.contentType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { siteId: siteId2 },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });
});



