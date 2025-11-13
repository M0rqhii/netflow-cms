# Test Helpers

This directory contains reusable test utilities and helpers for writing tests.

## TestFactory

The `TestFactory` class provides methods to create test data (tenants, users, collections, etc.) with proper relationships and JWT tokens.

### Usage

```typescript
import { TestFactory } from './helpers';

const factory = new TestFactory(prisma, jwtService);

// Create a tenant
const tenant = await factory.createTenant({
  name: 'My Test Tenant',
  slug: 'my-test-tenant',
  plan: 'pro',
});

// Create a user with JWT token
const user = await factory.createUser({
  tenantId: tenant.id,
  email: 'test@example.com',
  role: Role.TENANT_ADMIN,
});

// Use the token in requests
request(app.getHttpServer())
  .get('/users')
  .set('Authorization', `Bearer ${user.token}`)
  .set('X-Tenant-ID', tenant.id);
```

## TestFixtures

Pre-defined test data fixtures for consistent test scenarios.

### Usage

```typescript
import { TestFixtures } from './helpers';

// Use fixtures in tests
const tenant = await factory.createTenant(TestFixtures.tenants.pro);
const user = await factory.createUser({
  tenantId: tenant.id,
  ...TestFixtures.users.tenantAdmin,
});
```

## DatabaseHelper

Utilities for database cleanup and isolation.

### Usage

```typescript
import { DatabaseHelper } from './helpers';

const dbHelper = new DatabaseHelper(prisma);

// Clean up specific tenant
await dbHelper.cleanupTenant(tenantId);

// Clean up multiple tenants
await dbHelper.cleanupTenants([tenantId1, tenantId2]);

// Truncate all tables (use with caution)
await dbHelper.truncateAll();
```

## Best Practices

1. **Always clean up test data** - Use `afterAll` hooks to clean up created test data
2. **Use fixtures** - Prefer `TestFixtures` for consistent test data
3. **Isolate tests** - Each test should create its own tenant/users to avoid conflicts
4. **Use factories** - Use `TestFactory` instead of directly creating Prisma records


