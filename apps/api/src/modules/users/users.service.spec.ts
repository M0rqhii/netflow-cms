import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role } from '../../common/auth/roles.enum';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should return current user information', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        role: 'viewer',
        tenantId: 'tenant-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        tenant: {
          id: 'tenant-123',
          name: 'Test Tenant',
          slug: 'test-tenant',
          plan: 'free',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getCurrentUser(userId);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          tenantId: true,
          createdAt: true,
          updatedAt: true,
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              plan: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 'user-123';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getCurrentUser(userId)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('listUsers', () => {
    it('should return list of users for tenant_admin', async () => {
      const tenantId = 'tenant-123';
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          role: 'editor',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          role: 'viewer',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.listUsers(tenantId, Role.TENANT_ADMIN);

      expect(result).toEqual(mockUsers);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { tenantId },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return list of users for super_admin', async () => {
      const tenantId = 'tenant-123';
      const mockUsers: any[] = [];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.listUsers(tenantId, Role.SUPER_ADMIN);

      expect(result).toEqual(mockUsers);
    });

    it('should throw ForbiddenException for non-admin roles', async () => {
      const tenantId = 'tenant-123';

      await expect(
        service.listUsers(tenantId, Role.EDITOR)
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.listUsers(tenantId, Role.VIEWER)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUserById', () => {
    it('should return user for tenant_admin', async () => {
      const userId = 'user-123';
      const tenantId = 'tenant-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.getUserById(
        userId,
        tenantId,
        Role.TENANT_ADMIN
      );

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: userId,
          tenantId,
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should throw ForbiddenException for non-admin roles', async () => {
      const userId = 'user-123';
      const tenantId = 'tenant-123';

      await expect(
        service.getUserById(userId, tenantId, Role.EDITOR)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 'user-123';
      const tenantId = 'tenant-123';

      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.getUserById(userId, tenantId, Role.TENANT_ADMIN)
      ).rejects.toThrow(NotFoundException);
    });
  });
});


