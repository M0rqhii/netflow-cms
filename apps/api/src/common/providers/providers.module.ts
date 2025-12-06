import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  PaymentProvider,
  Mailer,
  FileStorage,
  DomainProvider,
} from './interfaces';
import {
  DevPaymentProvider,
  DevMailer,
  LocalFileStorage,
  DevDomainProvider,
} from './implementations';

/**
 * ProvidersModule
 * 
 * Provides dependency injection for external service providers.
 * Uses APP_PROFILE environment variable to determine which implementations to use:
 * - 'dev' or 'development': Uses dev implementations (no external calls)
 * - 'production': Will use real implementations (Stripe, S3, etc.) - to be added later
 * 
 * In dev mode, providers simulate behavior without calling external services.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    PrismaService,
    {
      provide: 'PaymentProvider',
      useFactory: (configService: ConfigService, prisma: PrismaService): PaymentProvider => {
        const profile = configService.get<string>('APP_PROFILE') || 
                       (configService.get<string>('NODE_ENV') === 'production' ? 'production' : 'dev');
        
        if (profile === 'dev' || profile === 'development') {
          return new DevPaymentProvider(prisma);
        }
        
        // Production: Will use StripePaymentProvider when implemented
        // For now, fallback to dev in production if no real provider is configured
        return new DevPaymentProvider(prisma);
      },
      inject: [ConfigService, PrismaService],
    },
    {
      provide: 'Mailer',
      useFactory: (configService: ConfigService, prisma: PrismaService): Mailer => {
        const profile = configService.get<string>('APP_PROFILE') || 
                       (configService.get<string>('NODE_ENV') === 'production' ? 'production' : 'dev');
        
        if (profile === 'dev' || profile === 'development') {
          return new DevMailer(prisma);
        }
        
        // Production: Will use ResendMailer or SendGridMailer when implemented
        // For now, fallback to dev in production if no real provider is configured
        return new DevMailer(prisma);
      },
      inject: [ConfigService, PrismaService],
    },
    {
      provide: 'FileStorage',
      useFactory: (configService: ConfigService): FileStorage => {
        const profile = configService.get<string>('APP_PROFILE') || 
                       (configService.get<string>('NODE_ENV') === 'production' ? 'production' : 'dev');
        
        if (profile === 'dev' || profile === 'development') {
          return new LocalFileStorage(configService);
        }
        
        // Production: Will use S3FileStorage or R2FileStorage when implemented
        // For now, fallback to local in production if no real provider is configured
        return new LocalFileStorage(configService);
      },
      inject: [ConfigService],
    },
    {
      provide: 'DomainProvider',
      useFactory: (configService: ConfigService, prisma: PrismaService): DomainProvider => {
        const profile = configService.get<string>('APP_PROFILE') || 
                       (configService.get<string>('NODE_ENV') === 'production' ? 'production' : 'dev');
        
        if (profile === 'dev' || profile === 'development') {
          return new DevDomainProvider(prisma);
        }
        
        // Production: Will use CloudflareDomainProvider when implemented
        // For now, fallback to dev in production if no real provider is configured
        return new DevDomainProvider(prisma);
      },
      inject: [ConfigService, PrismaService],
    },
  ],
  exports: ['PaymentProvider', 'Mailer', 'FileStorage', 'DomainProvider'],
})
export class ProvidersModule {}

