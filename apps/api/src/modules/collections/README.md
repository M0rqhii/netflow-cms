# Collections Module

Moduł Collections umożliwia zarządzanie kolekcjami treści z pełną izolacją multi-tenant, wersjonowaniem i cache'owaniem.

## Funkcjonalności

- ✅ CRUD dla Collections
- ✅ CRUD dla Collection Items
- ✅ Wersjonowanie items (optimistic locking)
- ✅ Status DRAFT/PUBLISHED
- ✅ ETag support (If-None-Match → 304)
- ✅ Redis cache dla metadanych
- ✅ Multi-tenant isolation

## Struktura

```
collections/
├── controllers/
│   ├── collections.controller.ts
│   └── items.controller.ts
├── services/
│   ├── collections.service.ts
│   └── items.service.ts
├── dto/
│   ├── create-collection.dto.ts
│   ├── update-collection.dto.ts
│   ├── item-query.dto.ts
│   ├── upsert-item.dto.ts
│   └── index.ts
├── collections.module.ts
└── README.md
```

## Użycie

### W Controllerze

```typescript
import { CollectionsService } from './services/collections.service';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@Controller('collections')
@UseGuards(TenantGuard)
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  list(@CurrentTenant() tenantId: string) {
    return this.collectionsService.list(tenantId);
  }
}
```

## Testy

```bash
# Unit tests
pnpm --filter api test collections.service.spec.ts

# E2E tests
pnpm --filter api test:e2e collections.e2e-spec.ts
```

## Dokumentacja API

Zobacz: `docs/api/collections-api.md`

