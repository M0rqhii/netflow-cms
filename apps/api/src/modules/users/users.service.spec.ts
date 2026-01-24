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
        preferredLanguage: 'en',
        orgId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        organization: {
          id: 'org-123',
          name: 'Test Organization',
          slug: 'test-org',
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
          preferredLanguage: true,
          orgId: true,
          createdAt: true,
          updatedAt: true,
          organization: {
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
    it('should return list of users for org admin (org_admin role)', async () => {
      const orgId = 'org-123';
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

      const result = await service.listUsers(orgId, Role.ORG_ADMIN);

      expect(result).toEqual(mockUsers);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { orgId },
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
      const orgId = 'org-123';
      const mockUsers: any[] = [];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.listUsers(orgId, Role.SUPER_ADMIN);

      expect(result).toEqual(mockUsers);
    });

    it('should throw ForbiddenException for non-admin roles', async () => {
      const orgId = 'org-123';

      await expect(
        service.listUsers(orgId, Role.EDITOR)
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.listUsers(orgId, Role.VIEWER)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUserById', () => {
    it('should return user for org admin (org_admin role)', async () => {
      const userId = 'user-123';
      const orgId = 'org-123';
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
        orgId,
        Role.ORG_ADMIN
      );

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: userId,
          orgId,
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
      const orgId = 'org-123';

      await expect(
        service.getUserById(userId, orgId, Role.EDITOR)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 'user-123';
      const orgId = 'org-123';

      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.getUserById(userId, orgId, Role.ORG_ADMIN)
      ).rejects.toThrow(NotFoundException);
    });
  });
});


