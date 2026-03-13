import { Module, Global, Logger } from '@nestjs/common';
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
  ResendMailer,
  LocalFileStorage,
  DevDomainProvider,
} from './implementations';

const logger = new Logger('ProvidersModule');

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    PrismaService,
    {
      provide: 'PaymentProvider',
      useFactory: (configService: ConfigService, prisma: PrismaService): PaymentProvider => {
        // TODO: Implement StripePaymentProvider for production
        return new DevPaymentProvider(prisma);
      },
      inject: [ConfigService, PrismaService],
    },
    {
      provide: 'Mailer',
      useFactory: (configService: ConfigService, prisma: PrismaService): Mailer => {
        const explicitProvider = (configService.get<string>('MAIL_PROVIDER') || '').toLowerCase();
        const resendApiKey = (configService.get<string>('RESEND_API_KEY') || '').trim();

        if (explicitProvider === 'dev') {
          return new DevMailer(prisma);
        }

        if (explicitProvider === 'resend') {
          if (!resendApiKey) {
            logger.warn('MAIL_PROVIDER=resend but RESEND_API_KEY is missing. Falling back to DevMailer.');
            return new DevMailer(prisma);
          }
          return new ResendMailer(configService);
        }

        const profile = configService.get<string>('APP_PROFILE') ||
                       (configService.get<string>('NODE_ENV') === 'production' ? 'production' : 'dev');

        if (profile === 'dev' || profile === 'development') {
          return new DevMailer(prisma);
        }

        if (resendApiKey) {
          return new ResendMailer(configService);
        }

        logger.warn('No email provider configured. Falling back to DevMailer.');
        return new DevMailer(prisma);
      },
      inject: [ConfigService, PrismaService],
    },
    {
      provide: 'FileStorage',
      useFactory: (configService: ConfigService): FileStorage => {
        // TODO: Implement S3/R2 FileStorage for production
        return new LocalFileStorage(configService);
      },
      inject: [ConfigService],
    },
    {
      provide: 'DomainProvider',
      useFactory: (configService: ConfigService, prisma: PrismaService): DomainProvider => {
        // TODO: Implement CloudflareDomainProvider for production
        return new DevDomainProvider(prisma);
      },
      inject: [ConfigService, PrismaService],
    },
  ],
  exports: ['PaymentProvider', 'Mailer', 'FileStorage', 'DomainProvider'],
})
export class ProvidersModule {}









