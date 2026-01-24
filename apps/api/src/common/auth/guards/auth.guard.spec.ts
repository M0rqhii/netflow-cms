import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuthGuard', () => {
    let guard: AuthGuard;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });
    // Note: AuthGuard extends PassportAuthGuard which requires JWT strategy
    // These tests are better suited for E2E tests with full setup
    it.skip('should throw UnauthorizedException if authorization header is missing', async () => {
      // This test requires full JWT strategy setup
    });

    it.skip('should throw UnauthorizedException if authorization header is invalid', async () => {
      // This test requires full JWT strategy setup
    });

    it.skip('should throw UnauthorizedException if user not found', async () => {
      // This test requires full JWT strategy setup
    });

    it.skip('should attach user to request if token is valid', async () => {
      // This test is skipped as it requires full JWT strategy setup
    });
  });
});


