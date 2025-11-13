import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
// import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { API_PREFIX } from './common/constants';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ValidationPipe disabled; use ZodValidationPipe per-route.

  // Global exception filter for consistent error handling
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS configuration - must be before other middleware
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const logger = new Logger('Bootstrap');
  
  app.enableCors({
    // In dev, reflect any localhost origin, otherwise allow FRONTEND_URL
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin === frontendUrl) return callback(null, true);
      if (process.env.NODE_ENV === 'development' && /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    // Be permissive with request headers in dev to avoid preflight failures
    allowedHeaders: ['*', 'Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Tenant-ID'],
    exposedHeaders: ['Content-Range', 'X-Total-Count'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  
  logger.log(`CORS enabled for origin: ${frontendUrl}`);

  // Global prefix dla API
  app.setGlobalPrefix(API_PREFIX);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  
  logger.log(`API running on http://localhost:${port}${API_PREFIX}`);
}

bootstrap();

// AI Note:
// - Entry point aplikacji NestJS
// - ValidationPipe używa Zod schemas z @repo/schemas
// - CORS jest skonfigurowany dla frontend
// - Global prefix: /api/v1
