import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import request from 'supertest';
import { RbacController } from './rbac.controller';
import { RbacEvaluatorService } from './rbac-evaluator.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { RbacService } from './rbac.service';

@Injectable()
class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = {
      id: 'user-1',
      email: 'user@test.com',
      role: 'tester',
      orgId: 'org-1',
    };
    request.orgId = 'org-1';
    return true;
  }
}

describe('RbacController effective endpoint', () => {
  let app: INestApplication;

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
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [RbacController],
      providers: [
        RbacEvaluatorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RbacService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useClass(TestAuthGuard)
      
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('returns effective capabilities with reasons', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({ isSuperAdmin: false, systemRole: null, role: 'viewer' });
    mockPrismaService.userRole.findMany.mockResolvedValue([
      {
        role: {
          name: 'Org Admin',
          roleCapabilities: [
            {
              capability: {
                key: 'builder.view',
              },
            },
          ],
        },
      },
    ]);
    mockPrismaService.orgPolicy.findMany.mockResolvedValue([]);

    const response = await request(app.getHttpServer())
      .get('/orgs/org-1/rbac/effective')
      .expect(200);

    const builderView = response.body.find((cap: any) => cap.key === 'builder.view');
    expect(builderView).toBeDefined();
    expect(builderView.allowed).toBe(true);
    expect(builderView.reason).toBe('allowed');
    expect(builderView.policyEnabled).toBe(true);
    expect(builderView.roleSources).toEqual(['Org Admin']);
  });
});
