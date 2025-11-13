import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

describe('TenantsService', () => {
  let service: TenantsService;

  const mockPrismaService = {
    tenant: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new tenant', async () => {
      const createDto: CreateTenantDto = {
        name: 'Test Tenant',
        slug: 'test-tenant',
        plan: 'free',
        settings: { theme: 'dark' },
      };

      const mockTenant = {
        id: 'tenant-123',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.tenant.findUnique.mockResolvedValue(null);
      mockPrismaService.tenant.create.mockResolvedValue(mockTenant);

      const result = await service.create(createDto);

      expect(result).toEqual(mockTenant);
      expect(mockPrismaService.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug: createDto.slug },
      });
      expect(mockPrismaService.tenant.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          slug: createDto.slug,
          plan: createDto.plan,
          settings: createDto.settings || {},
        },
        select: expect.any(Object),
      });
    });

    it('should throw ConflictException when slug already exists', async () => {
      const createDto: CreateTenantDto = {
        name: 'Test Tenant',
        slug: 'existing-slug',
        plan: 'free',
        settings: {},
      };

      const existingTenant = {
        id: 'tenant-123',
        slug: 'existing-slug',
      };

      mockPrismaService.tenant.findUnique.mockResolvedValue(existingTenant);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated list of tenants', async () => {
      const mockTenants = [
        {
          id: 'tenant-1',
          name: 'Tenant 1',
          slug: 'tenant-1',
          plan: 'free',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { users: 5, collections: 10 },
        },
        {
          id: 'tenant-2',
          name: 'Tenant 2',
          slug: 'tenant-2',
          plan: 'professional',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { users: 3, collections: 5 },
        },
      ];

      mockPrismaService.tenant.findMany.mockResolvedValue(mockTenants);
      mockPrismaService.tenant.count.mockResolvedValue(2);

      const result = await service.findAll(1, 20);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.data).toEqual(mockTenants);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
    });

    it('should limit pageSize to maximum 100', async () => {
      mockPrismaService.tenant.findMany.mockResolvedValue([]);
      mockPrismaService.tenant.count.mockResolvedValue(0);

      await service.findAll(1, 200);

      expect(mockPrismaService.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return tenant by id', async () => {
      const tenantId = 'tenant-123';
      const mockTenant = {
        id: tenantId,
        name: 'Test Tenant',
        slug: 'test-tenant',
        plan: 'free',
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          users: 5,
          collections: 10,
          contentTypes: 3,
          contentEntries: 50,
          mediaFiles: 20,
        },
      };

      mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);

      const result = await service.findOne(tenantId);

      expect(result).toEqual(mockTenant);
      expect(mockPrismaService.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: tenantId },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundException when tenant not found', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('findBySlug', () => {
    it('should return tenant by slug', async () => {
      const slug = 'test-tenant';
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Tenant',
        slug,
        plan: 'free',
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);

      const result = await service.findBySlug(slug);

      expect(result).toEqual(mockTenant);
    });

    it('should throw NotFoundException when tenant not found', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('update', () => {
    it('should update tenant', async () => {
      const tenantId = 'tenant-123';
      const updateDto: UpdateTenantDto = {
        name: 'Updated Name',
        plan: 'enterprise',
      };

      const existingTenant = {
        id: tenantId,
        name: 'Original Name',
        slug: 'test-tenant',
        plan: 'free',
        settings: { original: true },
      };

      const updatedTenant = {
        ...existingTenant,
        ...updateDto,
        updatedAt: new Date(),
      };

      mockPrismaService.tenant.findUnique
        .mockResolvedValueOnce(existingTenant)
        .mockResolvedValueOnce(null);
      mockPrismaService.tenant.update.mockResolvedValue(updatedTenant);

      const result = await service.update(tenantId, updateDto);

      expect(result.name).toBe(updateDto.name);
      expect(result.plan).toBe(updateDto.plan);
    });

    it('should merge settings when updating', async () => {
      const tenantId = 'tenant-123';
      const updateDto: UpdateTenantDto = {
        settings: { newSetting: 'value' },
      };

      const existingTenant = {
        id: tenantId,
        name: 'Test Tenant',
        slug: 'test-tenant',
        plan: 'free',
        settings: { original: true },
      };

      mockPrismaService.tenant.findUnique.mockResolvedValue(existingTenant);
      mockPrismaService.tenant.update.mockResolvedValue({
        ...existingTenant,
        settings: { original: true, newSetting: 'value' },
      });

      const result = await service.update(tenantId, updateDto);

      expect(result.settings).toHaveProperty('original', true);
      expect(result.settings).toHaveProperty('newSetting', 'value');
    });

    it('should throw ConflictException when slug is already taken', async () => {
      const tenantId = 'tenant-123';
      const updateDto: UpdateTenantDto = {
        slug: 'taken-slug',
      };

      const existingTenant = {
        id: tenantId,
        name: 'Test Tenant',
        slug: 'original-slug',
        plan: 'free',
        settings: {},
      };

      const takenTenant = {
        id: 'other-tenant',
        slug: 'taken-slug',
      };

      mockPrismaService.tenant.findUnique
        .mockResolvedValueOnce(existingTenant)
        .mockResolvedValueOnce(takenTenant);

      await expect(service.update(tenantId, updateDto)).rejects.toThrow(
        ConflictException
      );
    });

    it('should throw NotFoundException when tenant not found', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'Updated' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete tenant', async () => {
      const tenantId = 'tenant-123';
      const mockTenant = {
        id: tenantId,
        name: 'Test Tenant',
        slug: 'test-tenant',
        plan: 'free',
      };

      mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrismaService.tenant.delete.mockResolvedValue(mockTenant);

      const result = await service.remove(tenantId);

      expect(result).toHaveProperty('message');
      expect(result.message).toContain('Test Tenant');
      expect(mockPrismaService.tenant.delete).toHaveBeenCalledWith({
        where: { id: tenantId },
      });
    });

    it('should throw NotFoundException when tenant not found', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});


