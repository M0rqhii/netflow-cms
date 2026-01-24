# Test Helpers

This directory contains reusable test utilities and helpers for writing tests.

## TestFactory

The `TestFactory` class provides methods to create test data (organizations, sites, users, collections, etc.) with proper relationships and JWT tokens.

### Usage

```typescript
import { TestFactory } from './helpers';

const factory = new TestFactory(prisma, jwtService);

// Create an organization and site
const organization = await factory.createOrganization({
  name: 'My Test Organization',
  slug: 'my-test-org',
  plan: 'pro',
});

const site = await factory.createSite({
  orgId: organization.id,
  name: 'My Test Site',
  slug: 'my-test-site',
});

// Create a user with JWT token
const user = await factory.createUser({
  orgId: organization.id,
  siteId: site.id,
  email: 'test@example.com',
  role: Role.TENANT_ADMIN,
});

// Use the token in requests
request(app.getHttpServer())
  .get('/users')
  .set('Authorization', `Bearer ${user.token}`)
  .set('X-Org-ID', organization.id);
```

## TestFixtures

Pre-defined test data fixtures for consistent test scenarios.

### Usage

```typescript
import { TestFixtures } from './helpers';

// Use fixtures in tests
const organization = await factory.createOrganization(TestFixtures.organizations.pro);
const site = await factory.createSite({
  orgId: organization.id,
  slug: 'site-pro',
});
const user = await factory.createUser({
  orgId: organization.id,
  siteId: site.id,
  ...TestFixtures.users.orgAdmin,
});
```

## DatabaseHelper

Utilities for database cleanup and isolation.

### Usage

```typescript
import { DatabaseHelper } from './helpers';

const dbHelper = new DatabaseHelper(prisma);

// Clean up specific organization/site
await dbHelper.cleanupOrganizations([orgId]);
await dbHelper.cleanupSites([siteId]);

// Truncate all tables (use with caution)
await dbHelper.truncateAll();
```

## Best Practices

1. **Always clean up test data** - Use `afterAll` hooks to clean up created test data
2. **Use fixtures** - Prefer `TestFixtures` for consistent test data
3. **Isolate tests** - Each test should create its own organization/site/users to avoid conflicts
4. **Use factories** - Use `TestFactory` instead of directly creating Prisma records
