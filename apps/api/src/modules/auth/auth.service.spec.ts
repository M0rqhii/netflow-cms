import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const tenantId = 'tenant-123';
      const email = 'test@example.com';
      const password = 'password123';
      const passwordHash = 'hashed-password';

      const mockUser = {
        id: 'user-123',
        email,
        passwordHash,
        tenantId,
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(email, password, tenantId);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toHaveProperty('id', 'user-123');
      expect(result).toHaveProperty('email', email);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_email: {
            tenantId,
            email,
          },
        },
      });
    });

    it('should return null when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser(
        'test@example.com',
        'password',
        'tenant-123'
      );

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        tenantId: 'tenant-123',
        role: 'viewer',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(
        'test@example.com',
        'wrong-password',
        'tenant-123'
      );

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and user when credentials are valid', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
        tenantId: 'tenant-123',
      };

      const mockUser = {
        id: 'user-123',
        email: loginDto.email,
        passwordHash: 'hashed-password',
        tenantId: loginDto.tenantId,
        role: 'viewer',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token', 'jwt-token');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('id', 'user-123');
      expect(result.user).toHaveProperty('email', loginDto.email);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        tenantId: mockUser.tenantId,
        role: mockUser.role,
      });
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrong-password',
        tenantId: 'tenant-123',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('register', () => {
    it('should create user and return access token', async () => {
      const registerDto: RegisterDto = {
        email: 'new@example.com',
        password: 'password123',
        tenantId: 'tenant-123',
        role: 'viewer',
      };

      const mockTenant = {
        id: registerDto.tenantId,
        name: 'Test Tenant',
        slug: 'test-tenant',
      };

      const mockUser = {
        id: 'user-123',
        email: registerDto.email,
        passwordHash: 'hashed-password',
        tenantId: registerDto.tenantId,
        role: registerDto.role,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('access_token', 'jwt-token');
      expect(result).toHaveProperty('user');
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
    });

    it('should throw ConflictException when user already exists', async () => {
      const registerDto: RegisterDto = {
        email: 'existing@example.com',
        password: 'password123',
        tenantId: 'tenant-123',
        role: 'viewer',
      };

      const mockExistingUser = {
        id: 'user-123',
        email: registerDto.email,
        tenantId: registerDto.tenantId,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockExistingUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException
      );
    });

    it('should throw ConflictException when tenant does not exist', async () => {
      const registerDto: RegisterDto = {
        email: 'new@example.com',
        password: 'password123',
        tenantId: 'non-existent-tenant',
        role: 'viewer',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        role: 'viewer',
        tenantId: 'tenant-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById(userId);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          tenantId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });
});


