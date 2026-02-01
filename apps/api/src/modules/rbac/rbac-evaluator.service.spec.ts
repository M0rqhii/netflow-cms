import { Test, TestingModule } from '@nestjs/testing';
import { RbacEvaluatorService } from './rbac-evaluator.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('RbacEvaluatorService', () => {
  let service: RbacEvaluatorService;

  const mockPrismaService = {
    userRole: {
      findMany: jest.fn(),
    },
    orgPolicy: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacEvaluatorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RbacEvaluatorService>(RbacEvaluatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('allows when role grants capability and policy is enabled', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({ isSuperAdmin: false, systemRole: null, role: 'viewer' });
    mockPrismaService.userRole.findMany.mockResolvedValue([
      {
        role: {
          name: 'Org Admin',
          roleCapabilities: [
            {
              capability: {
                key: 'builder.publish',
              },
            },
          ],
        },
      },
    ]);
    mockPrismaService.orgPolicy.findMany.mockResolvedValue([]);

    const result = await service.can({
      userId: 'user-1',
      orgId: 'org-1',
      capabilityKey: 'builder.publish',
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('allowed');
    expect(result.policyEnabled).toBe(true);
    expect(result.roleSources).toEqual(['Org Admin']);
  });

  it('blocks when policy disables capability', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({ isSuperAdmin: false, systemRole: null, role: 'viewer' });
    mockPrismaService.userRole.findMany.mockResolvedValue([
      {
        role: {
          name: 'Site Admin',
          roleCapabilities: [
            {
              capability: {
                key: 'builder.rollback',
              },
            },
          ],
        },
      },
    ]);
    mockPrismaService.orgPolicy.findMany.mockResolvedValue([
      { capabilityKey: 'builder.rollback', enabled: false },
    ]);

    const result = await service.can({
      userId: 'user-1',
      orgId: 'org-1',
      capabilityKey: 'builder.rollback',
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('blocked_by_policy');
    expect(result.policyEnabled).toBe(false);
    expect(result.roleSources).toEqual(['Site Admin']);
  });


  it('allows all capabilities for super admin', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({ isSuperAdmin: true, systemRole: null, role: 'viewer' });
    mockPrismaService.userRole.findMany.mockResolvedValue([]);
    mockPrismaService.orgPolicy.findMany.mockResolvedValue([
      { capabilityKey: 'builder.edit', enabled: false },
    ]);

    const result = await service.can({
      userId: 'user-1',
      orgId: 'org-1',
      capabilityKey: 'builder.edit',
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('allowed');
    expect(result.policyEnabled).toBe(false);
    expect(result.roleSources).toEqual(['Super Admin']);
  });

  it('denies when user lacks role capability', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({ isSuperAdmin: false, systemRole: null, role: 'viewer' });
    mockPrismaService.userRole.findMany.mockResolvedValue([]);
    mockPrismaService.orgPolicy.findMany.mockResolvedValue([]);

    const result = await service.can({
      userId: 'user-1',
      orgId: 'org-1',
      capabilityKey: 'builder.edit',
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('missing_role_capability');
    expect(result.policyEnabled).toBe(true);
    expect(result.roleSources).toEqual([]);
  });
});
