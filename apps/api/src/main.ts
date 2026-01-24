import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
// import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { API_PREFIX } from './common/constants';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ValidationPipe disabled; use ZodValidationPipe per-route.

  // Security headers - must be before other middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow embedding for Swagger UI
      crossOriginResourcePolicy: false, // Allow cross-origin requests for CORS
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // Global exception filter for consistent error handling
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS configuration - must be before other middleware
  const normalizeOrigin = (value?: string) =>
    value ? value.trim().replace(/\/+$/, '') : '';
  const parseOrigins = (value?: string) =>
    (value || '')
      .split(',')
      .map((origin) => normalizeOrigin(origin))
      .filter(Boolean);

  const frontendUrl = normalizeOrigin(process.env.FRONTEND_URL || 'http://localhost:3000');
  const allowedOrigins = new Set<string>([
    frontendUrl,
    ...parseOrigins(process.env.CORS_ORIGIN),
  ]);
  const logger = new Logger('Bootstrap');
  const port = process.env.PORT || 4000;
  const isDev = process.env.NODE_ENV === 'development';
  const isLocalhost = (origin: string) =>
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalizedOrigin = normalizeOrigin(origin);
      if (allowedOrigins.has(normalizedOrigin)) return callback(null, true);
      if (isDev && isLocalhost(normalizedOrigin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Org-ID',
      'X-Site-ID',
    ],
    exposedHeaders: ['Content-Range', 'X-Total-Count'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  logger.log(`CORS enabled for origins: ${Array.from(allowedOrigins).join(', ')}`);

  // Global prefix dla API
  app.setGlobalPrefix(API_PREFIX);

  // Swagger/OpenAPI Documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Netflow CMS API')
      .setDescription('Organization & Site Headless CMS API Documentation')
      .setVersion(process.env.APP_VERSION || '1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('orgs', 'Organization management')
      .addTag('sites', 'Site management')
      .addTag('collections', 'Content collections')
      .addTag('content', 'Content management')
      .addTag('media', 'Media management')
      .addTag('billing', 'Billing and subscriptions')
      .addTag('rbac', 'Role-based access control')
      .addServer(`http://localhost:${port}${API_PREFIX}`, 'Development')
      .addServer(`https://api.yourdomain.com${API_PREFIX}`, 'Production')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'Netflow CMS API Docs',
      customfavIcon: '/favicon.ico',
      customCss: '.swagger-ui .topbar { display: none }',
    });

    logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
  }
  await app.listen(port);
  
  logger.log(`API running on http://localhost:${port}${API_PREFIX}`);
}

bootstrap();

// AI Note:
// - Entry point aplikacji NestJS
// - ValidationPipe używa Zod schemas z @repo/schemas
// - CORS jest skonfigurowany dla frontend
// - Global prefix: /api/v1
