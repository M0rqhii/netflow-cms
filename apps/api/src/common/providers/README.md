# Providers Module

This module provides clean abstraction layers for external integrations (payment processing, email, file storage, domain management) with development-only implementations that simulate real behavior without calling external services.

## Architecture

The providers follow a **strategy pattern** with clear interfaces and profile-based dependency injection:

- **Interfaces** (`interfaces/`): Define what the platform needs to do, not how
- **Implementations** (`implementations/`): Concrete implementations (dev and future production)
- **Module** (`providers.module.ts`): Profile-based DI wiring

## Provider Types

### 1. PaymentProvider

Handles subscription management (create, update, cancel).

**Interface**: `PaymentProvider`

- `createSubscription()` - Create new subscription
- `updateSubscription()` - Update existing subscription
- `cancelSubscription()` - Cancel subscription
- `getSubscriptionByExternalId()` - Get subscription by provider ID
- `isSubscriptionActive()` - Check if subscription is active

**Dev Implementation**: `DevPaymentProvider`

- Stores fake subscriptions in database
- Simulates subscription lifecycle without calling Stripe
- Logs all operations

**Future Production**: `StripePaymentProvider` (to be implemented)

### 2. Mailer

Handles transactional email sending.

**Interface**: `Mailer`

- `sendEmail()` - Send transactional email
- `sendBulkEmail()` - Send bulk emails (optional)

**Dev Implementation**: `DevMailer`

- Stores emails in `DevEmailLog` table for observability
- Logs to console if table doesn't exist
- No external API calls

**Future Production**: `ResendMailer` or `SendGridMailer` (to be implemented)

### 3. FileStorage

Handles file upload and storage.

**Interface**: `FileStorage`

- `uploadFile()` - Upload file and return public URL
- `deleteFile()` - Delete file by storage key
- `generateSignedUrl()` - Generate signed URL (optional)
- `fileExists()` - Check if file exists (optional)

**Dev Implementation**: `LocalFileStorage`

- Stores files in local `uploads/` directory
- Generates URLs pointing to API server (`/api/v1/uploads/...`)
- Served by `UploadsController`

**Future Production**: `S3FileStorage` or `R2FileStorage` (to be implemented)

### 4. DomainProvider

Handles domain configuration and SSL.

**Interface**: `DomainProvider`

- `configureDomain()` - Configure domain for tenant
- `ensureSSL()` - Ensure SSL certificate is active
- `removeDomain()` - Remove domain configuration (optional)
- `getDomainStatus()` - Get domain status (optional)

**Dev Implementation**: `DevDomainProvider`

- Stores domain records in `DevDomainRecord` table
- Logs domain operations
- Simulates DNS and SSL configuration

**Future Production**: `CloudflareDomainProvider` (to be implemented)

## Configuration

Providers are selected based on `APP_PROFILE` environment variable:

- `dev` or `development`: Uses dev implementations
- `production`: Will use real implementations (when implemented)

If `APP_PROFILE` is not set, it falls back to `NODE_ENV`:

- `NODE_ENV=production` → `production` profile
- Otherwise → `dev` profile

## Usage

### Injecting Providers

```typescript
import { Inject } from '@nestjs/common';
import { PaymentProvider } from '../common/providers/interfaces/payment-provider.interface';

@Injectable()
export class MyService {
  constructor(
    @Inject('PaymentProvider') private readonly paymentProvider: PaymentProvider,
  ) {}

  async createSubscription() {
    const result = await this.paymentProvider.createSubscription({
      tenantId: '...',
      plan: 'professional',
    });
  }
}
```

### Available Injection Tokens

- `'PaymentProvider'` - PaymentProvider interface
- `'Mailer'` - Mailer interface
- `'FileStorage'` - FileStorage interface
- `'DomainProvider'` - DomainProvider interface

## Development Observability

### DevEmailLog

All emails sent via `DevMailer` are logged to the `dev_email_log` table:

```sql
SELECT * FROM dev_email_log ORDER BY sentAt DESC;
```

### DevDomainRecord

All domain configurations via `DevDomainProvider` are logged to the `dev_domain_records` table:

```sql
SELECT * FROM dev_domain_records;
```

## Adding Production Providers

To add a production provider (e.g., Stripe):

1. Create implementation in `implementations/stripe-payment-provider.service.ts`
2. Update `providers.module.ts` to use it when `APP_PROFILE=production`:

```typescript
{
  provide: 'PaymentProvider',
  useFactory: (configService: ConfigService, prisma: PrismaService): PaymentProvider => {
    const profile = configService.get<string>('APP_PROFILE') || 'dev';
    
    if (profile === 'production') {
      return new StripePaymentProvider(configService);
    }
    
    return new DevPaymentProvider(prisma);
  },
  inject: [ConfigService, PrismaService],
}
```

## Environment Variables

- `APP_PROFILE` - Profile to use (`dev` or `production`)
- `UPLOAD_DIR` - Local file storage directory (default: `./uploads`)
- `API_BASE_URL` - Base URL for generated file URLs (default: `http://localhost:4000`)

## Notes

- All providers are **global** (via `@Global()` decorator), so they can be injected anywhere
- Dev implementations gracefully handle missing tables (fallback to console logging)
- Production providers should be added incrementally as needed
- No hardcoded provider-specific logic should exist in business logic - always use interfaces
