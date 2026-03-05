import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { SiteRole, SystemRole } from '../roles.enum';

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
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  const createMockContext = (
    user: { siteRole?: SiteRole; systemRole?: SystemRole; isSuperAdmin?: boolean } | undefined,
    requiredRoles?: SiteRole[]
  ): ExecutionContext => {
    const request: any = {
      user: user
        ? {
            siteRole: user.siteRole,
            systemRole: user.systemRole,
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
    it('should allow access if no roles are required', () => {
      const context = createMockContext({ siteRole: SiteRole.VIEWER }, undefined);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access if user is super admin', () => {
      const context = createMockContext(
        { isSuperAdmin: true },
        [SiteRole.ADMIN, SiteRole.EDITOR]
      );
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access if user has SUPER_ADMIN system role', () => {
      const context = createMockContext(
        { systemRole: SystemRole.SUPER_ADMIN },
        [SiteRole.ADMIN, SiteRole.EDITOR]
      );
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access if user is site owner', () => {
      const context = createMockContext(
        { siteRole: SiteRole.OWNER },
        [SiteRole.ADMIN, SiteRole.EDITOR]
      );
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access if user site role is in required roles', () => {
      const context = createMockContext(
        { siteRole: SiteRole.ADMIN },
        [SiteRole.ADMIN, SiteRole.EDITOR]
      );
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny access if user site role is not in required roles', () => {
      const context = createMockContext(
        { siteRole: SiteRole.VIEWER },
        [SiteRole.ADMIN, SiteRole.EDITOR]
      );
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should deny access if user is not authenticated', () => {
      const context = createMockContext(undefined, [SiteRole.ADMIN]);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});


