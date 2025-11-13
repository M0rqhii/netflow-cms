import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { TenantService } from './tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { Request, Response, NextFunction } from 'express';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

describe('TenantContextMiddleware', () => {
  let middleware: TenantContextMiddleware;
  let tenantService: jest.Mocked<TenantService>;
  let prismaService: jest.Mocked<PrismaService>;

  const mockTenantService = {
    findById: jest.fn(),
    findBySlug: jest.fn(),
    validateTenantExists: jest.fn(),
  };

  const mockPrismaService = {
    $executeRawUnsafe: jest.fn(),
  };

  const mockRequest = {
    headers: {},
    query: {},
    host: undefined,
  } as unknown as Request;

  const mockResponse = {
    on: jest.fn((event: string, callback: () => void) => {
      if (event === 'finish') {
        // Simulate finish event
        setTimeout(() => callback(), 0);
      }
    }),
  } as unknown as Response;

  const mockNext = jest.fn() as NextFunction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantContextMiddleware,
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    middleware = module.get<TenantContextMiddleware>(
      TenantContextMiddleware,
    );
    tenantService = module.get(TenantService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('tenant ID extraction', () => {
    it('should extract tenant ID from X-Tenant-ID header', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTenant = { id: tenantId, slug: 'test-tenant', name: 'Test' };

      mockTenantService.findById.mockResolvedValue(mockTenant as any);
      mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

      const req = {
        ...mockRequest,
        headers: { 'x-tenant-id': tenantId },
      } as unknown as Request;

      await middleware.use(req, mockResponse, mockNext);

      expect(tenantService.findById).toHaveBeenCalledWith(tenantId);
      expect(prismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        `SET app.current_tenant_id = '${tenantId}'`,
      );
      expect((req as any).tenantId).toBe(tenantId);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract tenant ID from query parameter', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTenant = { id: tenantId, slug: 'test-tenant', name: 'Test' };

      mockTenantService.findById.mockResolvedValue(mockTenant as any);
      mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

      const req = {
        ...mockRequest,
        query: { tenantId },
      } as unknown as Request;

      await middleware.use(req, mockResponse, mockNext);

      expect(tenantService.findById).toHaveBeenCalledWith(tenantId);
      expect((req as any).tenantId).toBe(tenantId);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should prioritize header over query parameter', async () => {
      const headerTenantId = '123e4567-e89b-12d3-a456-426614174000';
      const queryTenantId = '999e4567-e89b-12d3-a456-426614174000';
      const mockTenant = {
        id: headerTenantId,
        slug: 'test-tenant',
        name: 'Test',
      };

      mockTenantService.findById.mockResolvedValue(mockTenant as any);
      mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

      const req = {
        ...mockRequest,
        headers: { 'x-tenant-id': headerTenantId },
        query: { tenantId: queryTenantId },
      } as unknown as Request;

      await middleware.use(req, mockResponse, mockNext);

      expect(tenantService.findById).toHaveBeenCalledWith(headerTenantId);
      expect((req as any).tenantId).toBe(headerTenantId);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue if no tenant ID provided (for public routes)', async () => {
      const req = {
        ...mockRequest,
        headers: {},
        query: {},
      } as unknown as Request;

      await middleware.use(req, mockResponse, mockNext);

      expect(tenantService.findById).not.toHaveBeenCalled();
      expect(prismaService.$executeRawUnsafe).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('tenant validation', () => {
    it('should throw BadRequestException if tenant ID is invalid format (not string)', async () => {
      const req = {
        ...mockRequest,
        headers: { 'x-tenant-id': 123 as any },
      } as unknown as Request;

      await expect(
        middleware.use(req, mockResponse, mockNext),
      ).rejects.toThrow(BadRequestException);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if tenant ID is not a valid UUID', async () => {
      const req = {
        ...mockRequest,
        headers: { 'x-tenant-id': 'not-a-uuid' },
      } as unknown as Request;

      await expect(
        middleware.use(req, mockResponse, mockNext),
      ).rejects.toThrow(BadRequestException);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if tenant does not exist', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';

      mockTenantService.findById.mockResolvedValue(null);

      const req = {
        ...mockRequest,
        headers: { 'x-tenant-id': tenantId },
      } as unknown as Request;

      await expect(
        middleware.use(req, mockResponse, mockNext),
      ).rejects.toThrow(BadRequestException);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('user access validation', () => {
    it('should allow access if user belongs to the tenant', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTenant = { id: tenantId, slug: 'test-tenant', name: 'Test' };
      const mockUser: CurrentUserPayload = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'viewer',
        tenantId: tenantId,
      };

      mockTenantService.findById.mockResolvedValue(mockTenant as any);
      mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

      const req = {
        ...mockRequest,
        headers: { 'x-tenant-id': tenantId },
        user: mockUser,
      } as unknown as Request;

      await middleware.use(req, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((req as any).tenantId).toBe(tenantId);
    });

    it('should throw ForbiddenException if user belongs to different tenant', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const userTenantId = '999e4567-e89b-12d3-a456-426614174000';
      const mockTenant = { id: tenantId, slug: 'test-tenant', name: 'Test' };
      const mockUser: CurrentUserPayload = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'viewer',
        tenantId: userTenantId,
      };

      mockTenantService.findById.mockResolvedValue(mockTenant as any);

      const req = {
        ...mockRequest,
        headers: { 'x-tenant-id': tenantId },
        user: mockUser,
      } as unknown as Request;

      await expect(
        middleware.use(req, mockResponse, mockNext),
      ).rejects.toThrow(ForbiddenException);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow access if user is not authenticated (public route)', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTenant = { id: tenantId, slug: 'test-tenant', name: 'Test' };

      mockTenantService.findById.mockResolvedValue(mockTenant as any);
      mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

      const req = {
        ...mockRequest,
        headers: { 'x-tenant-id': tenantId },
        user: undefined,
      } as unknown as Request;

      await middleware.use(req, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((req as any).tenantId).toBe(tenantId);
    });
  });

  describe('database session management', () => {
    it('should set app.current_tenant_id in PostgreSQL session', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTenant = { id: tenantId, slug: 'test-tenant', name: 'Test' };

      mockTenantService.findById.mockResolvedValue(mockTenant as any);
      mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

      const req = {
        ...mockRequest,
        headers: { 'x-tenant-id': tenantId },
      } as unknown as Request;

      await middleware.use(req, mockResponse, mockNext);

      expect(prismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        `SET app.current_tenant_id = '${tenantId}'`,
      );
    });

    it('should register finish handler to clear tenant context', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTenant = { id: tenantId, slug: 'test-tenant', name: 'Test' };

      mockTenantService.findById.mockResolvedValue(mockTenant as any);
      mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

      const req = {
        ...mockRequest,
        headers: { 'x-tenant-id': tenantId },
      } as unknown as Request;

      await middleware.use(req, mockResponse, mockNext);

      expect(mockResponse.on).toHaveBeenCalledWith(
        'finish',
        expect.any(Function),
      );
    });

    it('should throw BadRequestException if database session setup fails', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTenant = { id: tenantId, slug: 'test-tenant', name: 'Test' };

      mockTenantService.findById.mockResolvedValue(mockTenant as any);
      mockPrismaService.$executeRawUnsafe.mockRejectedValue(
        new Error('Database error'),
      );

      const req = {
        ...mockRequest,
        headers: { 'x-tenant-id': tenantId },
      } as unknown as Request;

      await expect(
        middleware.use(req, mockResponse, mockNext),
      ).rejects.toThrow(BadRequestException);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

