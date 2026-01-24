import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '../roles.enum';

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
    userRole: Role | undefined,
    requiredRoles?: Role[]
  ): ExecutionContext => {
    const request: any = {
      user: userRole
        ? {
            role: userRole,
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
      const context = createMockContext(Role.VIEWER, undefined);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access if user has super_admin role', () => {
      const context = createMockContext(Role.SUPER_ADMIN, [
        Role.ORG_ADMIN,
        Role.EDITOR,
      ]);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access if user role is in required roles', () => {
      const context = createMockContext(Role.ORG_ADMIN, [
        Role.ORG_ADMIN,
        Role.EDITOR,
      ]);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny access if user role is not in required roles', () => {
      const context = createMockContext(Role.VIEWER, [
        Role.ORG_ADMIN,
        Role.EDITOR,
      ]);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should deny access if user is not authenticated', () => {
      const context = createMockContext(undefined, [Role.ORG_ADMIN]);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});


