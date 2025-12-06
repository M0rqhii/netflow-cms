# Developer Environment Guide

This document explains the developer experience features available in `netflow-cms` for debugging, inspection, and local development.

## Overview

The system includes several developer-friendly tools that are **only active in non-production environments**. These tools help with:

- **Debug Logging**: Structured logging with timestamps, module names, and metadata
- **Request Profiling**: Automatic timing and status logging for all API requests
- **Enhanced Error Reports**: Pretty-formatted error stacks and extended metadata
- **Feature Flags**: Simple feature toggle system (static configuration)
- **Dev UI**: Web interface to view logs and debug information

## Environment Profiles

The system uses the `APP_PROFILE` environment variable to determine the environment:

- **`dev`** or **`development`**: Development mode (all dev tools enabled)
- **`production`**: Production mode (dev tools disabled)

If `APP_PROFILE` is not set, it falls back to `NODE_ENV`:
- `NODE_ENV=production` → production profile
- Otherwise → dev profile

### Setting the Profile

```bash
# Development
APP_PROFILE=dev npm run dev

# Production
APP_PROFILE=production npm run start
```

## Debug Logging

### Overview

The debug logger provides structured logging with:
- Timestamp
- Module name
- Log level (info, warn, error)
- Message
- Optional metadata (JSON)

### Usage in Backend

```typescript
import { DebugService } from '../common/debug/debug.service';

@Injectable()
export class MyService {
  constructor(private debugService: DebugService) {}

  async doSomething() {
    // Log info
    this.debugService.info('MyService', 'Processing request', { userId: '123' });

    // Log warning
    this.debugService.warn('MyService', 'Deprecated method called');

    // Log error
    this.debugService.error('MyService', 'Failed to process', { error: err.message });
  }
}
```

### Viewing Logs

Logs are stored in memory (max 1000 entries) and can be viewed via:

1. **API Endpoint**: `GET /api/v1/dev/logs?limit=100`
2. **UI Page**: `/dev/logs` (requires super_admin or tenant_admin role)

### Log Structure

```json
{
  "id": "1234567890-abc123",
  "timestamp": "2025-01-18T10:30:00.000Z",
  "level": "info",
  "module": "MyService",
  "message": "Processing request",
  "metadata": {
    "userId": "123"
  }
}
```

## Request Profiling

### Overview

The profiling interceptor automatically logs:
- Request method and path
- Response status code
- Request duration (in milliseconds)

### How It Works

The `ProfilingInterceptor` is registered globally and runs for all requests when `APP_PROFILE !== 'production'`.

### Example Output

```
[PROFILE] GET /api/v1/collections - 200 - 45ms
[PROFILE] POST /api/v1/content - 201 - 120ms
[PROFILE] GET /api/v1/users - 500 - 250ms (ERROR)
```

Profiling data is also stored in the debug logs and can be viewed in the `/dev/logs` UI.

## Enhanced Error Reports

### Overview

In non-production environments, error responses include:

- **Pretty-formatted stack traces**: Color-coded and readable
- **Extended metadata**: Request details, headers (sanitized), query params, body (sanitized)
- **Request context**: Method, URL, headers, query, body

### Example Error Response (Non-Production)

```json
{
  "statusCode": 500,
  "timestamp": "2025-01-18T10:30:00.000Z",
  "path": "/api/v1/collections",
  "method": "POST",
  "message": "Internal server error",
  "error": "TypeError",
  "details": {
    "stack": "TypeError: Cannot read property 'id' of undefined\n    at ...",
    "name": "TypeError"
  },
  "request": {
    "method": "POST",
    "url": "/api/v1/collections",
    "headers": {
      "authorization": "[REDACTED]",
      "content-type": "application/json"
    },
    "query": {},
    "body": {
      "name": "My Collection",
      "password": "[REDACTED]"
    }
  }
}
```

### Production Error Response

In production, error responses are sanitized and only include:
- Status code
- Timestamp
- Path
- Message
- Error type (if applicable)

No stack traces, request details, or sensitive data are exposed.

## Feature Flags

### Overview

Feature flags allow enabling/disabling features without code changes. Currently uses **static configuration** (no UI toggle yet).

### Backend Usage

```typescript
import { FeaturesService } from '../common/features/features.service';

@Injectable()
export class MyService {
  constructor(private featuresService: FeaturesService) {}

  async doSomething() {
    if (this.featuresService.isFeatureEnabled('pageBuilder')) {
      // Page builder feature is enabled
    }

    if (this.featuresService.isFeatureEnabled('advancedSeo')) {
      // Advanced SEO feature is enabled
    }
  }
}
```

### SDK Usage

```typescript
import { createApiClient } from '@repo/sdk';

const client = createApiClient();
const token = 'your-auth-token';

// Check single feature
const enabled = await client.isFeatureEnabled(token, 'pageBuilder');

// Get all flags
const flags = await client.getAllFeatureFlags(token);
```

### API Endpoints

- `GET /api/v1/features` - Get all feature flags
- `GET /api/v1/features/:feature` - Check specific feature

### Configuration

Feature flags are configured in `apps/api/src/common/features/features.service.ts`:

```typescript
this.flags = {
  pageBuilder: true,
  advancedSeo: true,
  // Add more flags here
};
```

## Dev Providers

The system uses "dev providers" for external services in development mode. These are configured via `APP_PROFILE` and documented in `apps/api/src/common/providers/README.md`.

### Available Dev Providers

- **PaymentProvider**: `DevPaymentProvider` - Simulates payments without calling Stripe
- **Mailer**: `DevMailer` - Logs emails to `dev_email_log` table instead of sending
- **FileStorage**: `LocalFileStorage` - Stores files locally in `uploads/` directory
- **DomainProvider**: `DevDomainProvider` - Simulates domain configuration

### Viewing Dev Provider Data

- **Emails**: `/dev/emails` - View all emails sent via DevMailer
- **Payments**: `/dev/payments` - View subscription/payment records
- **Sites**: `/dev/sites` - View all tenants/sites

## Dev UI Pages

All dev UI pages are located under `/dev/*` and require:
- Non-production environment (`APP_PROFILE !== 'production'`)
- Privileged user role (`super_admin` or `tenant_admin`)

### Available Pages

- `/dev` - Dev panel summary
- `/dev/logs` - View debug logs
- `/dev/emails` - View dev email logs
- `/dev/payments` - View payment/subscription records
- `/dev/sites` - View all sites/tenants

## Best Practices

### Debug Logging

- Use descriptive module names (e.g., `CollectionsService`, `AuthController`)
- Include relevant metadata for context
- Use appropriate log levels:
  - `info`: Normal operation, useful information
  - `warn`: Potential issues, deprecated usage
  - `error`: Errors that need attention

### Request Profiling

- Profiling is automatic - no code changes needed
- Check `/dev/logs` for slow requests (duration > 1000ms)
- Use profiling data to identify performance bottlenecks

### Error Handling

- Errors are automatically enhanced in non-production
- Use the extended metadata to debug issues
- Remember that production errors are sanitized

### Feature Flags

- Use feature flags for features that might need to be toggled
- Keep flag names descriptive and consistent
- Document new flags in the service file

## Troubleshooting

### Logs Not Appearing

1. Check that `APP_PROFILE !== 'production'`
2. Verify you're using `DebugService` correctly
3. Check `/dev/logs` endpoint directly: `GET /api/v1/dev/logs`

### Profiling Not Working

1. Ensure `APP_PROFILE !== 'production'`
2. Check that `ProfilingInterceptor` is registered in `app.module.ts`
3. Verify requests are reaching the backend

### Feature Flags Not Working

1. Check feature name spelling (case-sensitive)
2. Verify flag is defined in `FeaturesService`
3. Ensure `FeaturesModule` is imported in `app.module.ts`

## Security Notes

- **All dev tools are disabled in production** - No risk of exposing debug data
- **Dev endpoints require authentication** - Only privileged users can access
- **Sensitive data is redacted** - Passwords, tokens, API keys are masked in logs
- **No external services** - All dev tools are local-only (no Sentry, NewRelic, etc.)

## Future Enhancements

Potential improvements (not yet implemented):

- Database-backed log storage (instead of in-memory)
- Real-time log streaming via WebSocket
- Feature flag UI for toggling flags
- Log filtering and search
- Export logs to file
- Performance metrics dashboard

