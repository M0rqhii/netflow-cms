import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { Permission, Role } from '../roles.enum';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

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
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  const createMockContext = (
    userRole: Role | undefined,
    requiredPermissions?: Permission[]
  ): ExecutionContext => {
    const request: any = {
      user: userRole
        ? {
            role: userRole,
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
    it('should allow access if no permissions are required', () => {
      const context = createMockContext(Role.VIEWER, undefined);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access if user has required permission', () => {
      const context = createMockContext(Role.VIEWER, [
        Permission.ITEMS_READ,
      ]);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access if user has any of the required permissions', () => {
      const context = createMockContext(Role.EDITOR, [
        Permission.ITEMS_READ,
        Permission.USERS_WRITE, // Editor doesn't have this
      ]);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException if user does not have required permissions', () => {
      const context = createMockContext(Role.VIEWER, [
        Permission.USERS_WRITE,
      ]);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user is not authenticated', () => {
      const context = createMockContext(undefined, [Permission.ITEMS_READ]);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});


