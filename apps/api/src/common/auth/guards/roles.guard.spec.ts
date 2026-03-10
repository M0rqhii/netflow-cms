import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { SiteRole } from '../roles.enum';
import { RbacService } from '../../../modules/rbac/rbac.service';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
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
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  const createMockContext = (
    user:
      | {
          siteRoleKey?: string;
          siteRoleName?: string;
          platformRbacRoles?: string[];
          isSuperAdmin?: boolean;
        }
      | undefined,
    requiredRoles?: SiteRole[]
  ): ExecutionContext => {
    const request: any = {
      user: user
        ? {
            id: 'user-1',
            siteRoleKey: user.siteRoleKey,
            siteRoleName: user.siteRoleName,
            platformRbacRoles: user.platformRbacRoles,
            isSuperAdmin: user.isSuperAdmin,
          }
        : undefined,
    };

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should allow access if no roles are required', async () => {
      const context = createMockContext({ siteRoleKey: 'viewer', siteRoleName: 'Viewer' }, undefined);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should allow access if user has platform root access', async () => {
      const context = createMockContext(
        { platformRbacRoles: ['Platform Root'], isSuperAdmin: true },
        [SiteRole.ADMIN, SiteRole.EDITOR]
      );
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should allow access if user has platform admin access', async () => {
      const context = createMockContext(
        { platformRbacRoles: ['Platform Admin'] },
        [SiteRole.ADMIN, SiteRole.EDITOR]
      );
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should allow access if user is mapped to site admin', async () => {
      const context = createMockContext(
        { siteRoleKey: 'site_admin', siteRoleName: 'Site Admin' },
        [SiteRole.ADMIN, SiteRole.EDITOR]
      );
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should allow access if user site role is in required roles', async () => {
      const context = createMockContext(
        { siteRoleKey: 'site_admin', siteRoleName: 'Site Admin' },
        [SiteRole.ADMIN, SiteRole.EDITOR]
      );
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should deny access if user site role is not in required roles', async () => {
      const context = createMockContext(
        { siteRoleKey: 'viewer', siteRoleName: 'Viewer' },
        [SiteRole.ADMIN, SiteRole.EDITOR]
      );
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should deny access if user is not authenticated', async () => {
      const context = createMockContext(undefined, [SiteRole.ADMIN]);
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });
});
