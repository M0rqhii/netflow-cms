import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { Permission } from '../roles.enum';
import { RbacService } from '../../../modules/rbac/rbac.service';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;
  let rbacService: RbacService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: RbacService,
          useValue: {
            canUserPerform: jest.fn().mockResolvedValue(false),
            getEffectivePlatformCapabilities: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get<Reflector>(Reflector);
    rbacService = module.get<RbacService>(RbacService);
  });

  const createMockContext = (
    user:
      | {
          siteRoleKey?: string;
          siteRoleName?: string;
          orgRoleKey?: string;
          orgRoleName?: string;
          platformRbacRoles?: string[];
          isSuperAdmin?: boolean;
        }
      | undefined,
    requiredPermissions?: Permission[]
  ): ExecutionContext => {
    const request: any = {
      user: user
        ? {
            id: 'user-1',
            siteRoleKey: user.siteRoleKey,
            siteRoleName: user.siteRoleName,
            orgRoleKey: user.orgRoleKey,
            orgRoleName: user.orgRoleName,
            platformRbacRoles: user.platformRbacRoles,
            isSuperAdmin: user.isSuperAdmin,
          }
        : undefined,
    };

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredPermissions);

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should allow access if no permissions are required', async () => {
      const context = createMockContext({ siteRoleKey: 'viewer', siteRoleName: 'Viewer' }, undefined);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should allow access if user has required site permission', async () => {
      const context = createMockContext({ siteRoleKey: 'viewer', siteRoleName: 'Viewer' }, [
        Permission.ITEMS_READ,
      ]);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should allow access if user has any of the required permissions via site role', async () => {
      const context = createMockContext({ siteRoleKey: 'editor', siteRoleName: 'Editor' }, [
        Permission.ITEMS_CREATE,
        Permission.USERS_WRITE, // Editor doesn't have this
      ]);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should allow access for platform root regardless of permissions', async () => {
      const context = createMockContext({ platformRbacRoles: ['Platform Root'], isSuperAdmin: true }, [
        Permission.SYSTEM_MANAGE, // High privilege permission
      ]);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should allow access via platform capabilities', async () => {
      jest.spyOn(rbacService, 'getEffectivePlatformCapabilities').mockResolvedValue([
        { key: 'platform.dev.tools.access', allowed: true },
      ] as any);
      const context = createMockContext({ platformRbacRoles: ['Platform Developer'] }, [Permission.SYSTEM_ACCESS]);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should allow access via org role permissions', async () => {
      const context = createMockContext({ orgRoleKey: 'org_admin', orgRoleName: 'Org Admin' }, [
        Permission.USERS_READ,
      ]);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should throw ForbiddenException if user does not have required permissions', async () => {
      const context = createMockContext({ siteRoleKey: 'viewer', siteRoleName: 'Viewer' }, [
        Permission.USERS_WRITE,
      ]);
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user is not authenticated', async () => {
      const context = createMockContext(undefined, [Permission.ITEMS_READ]);
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });
});
