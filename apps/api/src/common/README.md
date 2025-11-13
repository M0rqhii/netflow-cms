# Common Module

Wspólne komponenty używane w całej aplikacji.

## Struktura

```
common/
├── constants/     # Stałe aplikacji (cache TTL, pagination, etc.)
├── decorators/    # Custom decorators (@CurrentTenant)
├── filters/       # Exception filters (dla obsługi błędów)
├── interceptors/  # Interceptors (ETag, logging, etc.)
├── pipes/         # Custom pipes (validation, transformation)
├── prisma/        # PrismaService z multi-tenant support
├── tenant/        # Tenant module (guard, service, module)
└── types/         # Shared types i interfaces
```

## Użycie

### Constants

```typescript
import { CACHE_TTL, PAGINATION } from '../common/constants';
```

### Types

```typescript
import { PaginatedResponse, TenantContext } from '../common/types';
```

### Decorators

```typescript
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
```

### Interceptors

```typescript
import { ETagInterceptor } from '../common/interceptors/etag.interceptor';
```






