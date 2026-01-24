import { Test, TestingModule } from '@nestjs/testing';
import { RbacService } from './rbac.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('RbacService', () => {
  let service: RbacService;

  const mockPrismaService = {
    capability: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    role: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    roleCapability: {
      deleteMany: jest.fn(),
    },
    userRole: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    orgPolicy: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RbacService>(RbacService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCapabilities', () => {
    it('should return capabilities with policy status', async () => {
      const orgId = 'org-1';
      mockPrismaService.orgPolicy.findMany.mockResolvedValue([
        { capabilityKey: 'builder.rollback', enabled: false },
      ]);

      const result = await service.getCapabilities(orgId);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('key');
      expect(result[0]).toHaveProperty('policyEnabled');
    });
  });

  describe('getRoles', () => {
    it('should return roles with capabilities', async () => {
      const orgId = 'org-1';
      mockPrismaService.role.findMany.mockResolvedValue([
        {
          id: 'role-1',
          name: 'Test Role',
          type: 'CUSTOM',
          scope: 'ORG',
          isImmutable: false,
          roleCapabilities: [
            {
              capability: {
                key: 'builder.view',
                module: 'builder',
                label: 'View Builder',
              },
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getRoles(orgId);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].capabilities).toBeDefined();
    });
  });

  describe('createRole', () => {
    it('should create custom role with valid capabilities', async () => {
      const orgId = 'org-1';
      const dto = {
        name: 'Custom Role',
        description: 'Test role',
        scope: 'ORG' as const,
        capabilityKeys: ['builder.view', 'builder.edit'],
      };

      mockPrismaService.role.findUnique.mockResolvedValue(null);
      mockPrismaService.capability.findMany.mockResolvedValue([
        { id: 'cap-1', key: 'builder.view' },
        { id: 'cap-2', key: 'builder.edit' },
      ]);
      mockPrismaService.role.create.mockResolvedValue({
        id: 'role-1',
        name: dto.name,
        description: dto.description,
        type: 'CUSTOM',
        scope: dto.scope,
        isImmutable: false,
        roleCapabilities: [
          {
            capability: { key: 'builder.view', module: 'builder', label: 'View Builder' },
          },
          {
            capability: { key: 'builder.edit', module: 'builder', label: 'Edit Builder' },
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createRole(orgId, dto, 'user-1');

      expect(result).toBeDefined();
      expect(result.name).toBe(dto.name);
      expect(result.capabilities.length).toBe(2);
    });

    it('should reject blocked capabilities', async () => {
      const orgId = 'org-1';
      const dto = {
        name: 'Custom Role',
        scope: 'ORG' as const,
        capabilityKeys: ['billing.view_plan'], // Blocked capability
      };

      await expect(service.createRole(orgId, dto, 'user-1')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should reject duplicate role name', async () => {
      const orgId = 'org-1';
      const dto = {
        name: 'Existing Role',
        scope: 'ORG' as const,
        capabilityKeys: ['builder.view'],
      };

      mockPrismaService.role.findUnique.mockResolvedValue({
        id: 'existing-role',
        name: 'Existing Role',
      });

      await expect(service.createRole(orgId, dto, 'user-1')).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('updateRole', () => {
    it('should update custom role', async () => {
      const orgId = 'org-1';
      const roleId = 'role-1';
      const dto = {
        name: 'Updated Role',
        capabilityKeys: ['builder.view'],
      };

      mockPrismaService.role.findFirst.mockResolvedValue({
        id: roleId,
        type: 'CUSTOM',
        isImmutable: false,
      });
      mockPrismaService.capability.findMany.mockResolvedValue([
        { id: 'cap-1', key: 'builder.view' },
      ]);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          roleCapability: { deleteMany: jest.fn().mockResolvedValue({}) },
          role: {
            update: jest.fn().mockResolvedValue({
              id: roleId,
              name: dto.name,
              type: 'CUSTOM',
              scope: 'ORG',
              isImmutable: false,
              roleCapabilities: [
                {
                  capability: { key: 'builder.view', module: 'builder', label: 'View Builder' },
                },
              ],
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          },
        });
      });

      const result = await service.updateRole(orgId, roleId, dto, 'user-1');

      expect(result).toBeDefined();
      expect(result.name).toBe(dto.name);
    });

    it('should reject updating system role', async () => {
      const orgId = 'org-1';
      const roleId = 'role-1';
      const dto = { name: 'Updated Role' };

      mockPrismaService.role.findFirst.mockResolvedValue({
        id: roleId,
        type: 'SYSTEM',
        isImmutable: true,
      });

      await expect(service.updateRole(orgId, roleId, dto, 'user-1')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('deleteRole', () => {
    it('should delete custom role', async () => {
      const orgId = 'org-1';
      const roleId = 'role-1';

      mockPrismaService.role.findFirst.mockResolvedValue({
        id: roleId,
        type: 'CUSTOM',
        isImmutable: false,
        userRoles: [],
      });
      mockPrismaService.role.delete.mockResolvedValue({});

      const result = await service.deleteRole(orgId, roleId, false);

      expect(result.success).toBe(true);
    });

    it('should reject deleting role with assignments unless force=true', async () => {
      const orgId = 'org-1';
      const roleId = 'role-1';

      mockPrismaService.role.findFirst.mockResolvedValue({
        id: roleId,
        type: 'CUSTOM',
        isImmutable: false,
        userRoles: [{ id: 'assignment-1' }],
      });

      await expect(service.deleteRole(orgId, roleId, false)).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('createAssignment', () => {
    it('should create assignment for ORG scope role', async () => {
      const orgId = 'org-1';
      const dto = {
        userId: 'user-1',
        roleId: 'role-1',
        siteId: null,
      };

      mockPrismaService.role.findFirst.mockResolvedValue({
        id: 'role-1',
        scope: 'ORG',
      });
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user-1',
        orgId: orgId,
      });
      mockPrismaService.userRole.findFirst.mockResolvedValue(null);
      mockPrismaService.userRole.create.mockResolvedValue({
        id: 'assignment-1',
        userId: dto.userId,
        roleId: dto.roleId,
        siteId: null,
        role: {
          id: 'role-1',
          name: 'Test Role',
          type: 'CUSTOM',
          scope: 'ORG',
          roleCapabilities: [
            {
              capability: { key: 'builder.view', module: 'builder' },
            },
          ],
        },
        createdAt: new Date(),
      });

      const result = await service.createAssignment(orgId, dto, 'actor-1');

      expect(result).toBeDefined();
      expect(result.userId).toBe(dto.userId);
    });

    it('should reject SITE scope role without siteId', async () => {
      const orgId = 'org-1';
      const dto = {
        userId: 'user-1',
        roleId: 'role-1',
        siteId: null,
      };

      mockPrismaService.role.findFirst.mockResolvedValue({
        id: 'role-1',
        scope: 'SITE',
      });

      await expect(service.createAssignment(orgId, dto, 'actor-1')).rejects.toThrow(
        BadRequestException
      );
    });
  });
});





