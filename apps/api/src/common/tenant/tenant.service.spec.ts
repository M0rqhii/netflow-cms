import { Test, TestingModule } from '@nestjs/testing';
import { TenantService } from './tenant.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TenantService', () => {
  let service: TenantService;

  const mockPrismaService = {
    tenant: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return tenant by id', async () => {
      const tenantId = 'tenant-123';
      const mockTenant = {
        id: tenantId,
        name: 'Test Tenant',
        slug: 'test-tenant',
        plan: 'free',
      };

      mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);

      const result = await service.findById(tenantId);

      expect(result).toEqual(mockTenant);
      expect(mockPrismaService.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: tenantId },
      });
    });

    it('should return null when tenant not found', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
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
      };

      mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);

      const result = await service.findBySlug(slug);

      expect(result).toEqual(mockTenant);
      expect(mockPrismaService.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug },
      });
    });

    it('should return null when tenant not found', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);

      const result = await service.findBySlug('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('validateTenantExists', () => {
    it('should return true when tenant exists', async () => {
      const tenantId = 'tenant-123';
      const mockTenant = {
        id: tenantId,
        name: 'Test Tenant',
      };

      mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);

      const result = await service.validateTenantExists(tenantId);

      expect(result).toBe(true);
    });

    it('should return false when tenant does not exist', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);

      const result = await service.validateTenantExists('non-existent');

      expect(result).toBe(false);
    });
  });
});


