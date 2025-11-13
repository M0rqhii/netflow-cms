# Content Types Module

Moduł Content Types umożliwia definiowanie i zarządzanie schematami treści (content types) z pełną izolacją multi-tenant.

## Funkcjonalności

- ✅ CRUD dla Content Types
- ✅ Konwersja fields array → JSON Schema
- ✅ Walidacja schematów
- ✅ Multi-tenant isolation
- ✅ Ochrona przed usuwaniem content types z istniejącymi entries

## Struktura

```
content-types/
├── controllers/
│   └── content-types.controller.ts
├── services/
│   ├── content-types.service.ts
│   └── content-types.service.spec.ts
├── dto/
│   ├── create-content-type.dto.ts
│   ├── update-content-type.dto.ts
│   └── index.ts
├── content-types.module.ts
└── README.md
```

## Użycie

### W Controllerze

```typescript
import { ContentTypesService } from './services/content-types.service';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@Controller('content-types')
@UseGuards(AuthGuard, TenantGuard, RolesGuard, PermissionsGuard)
export class ContentTypesController {
  constructor(private readonly contentTypesService: ContentTypesService) {}

  @Get()
  @Permissions(Permission.CONTENT_TYPES_READ)
  list(@CurrentTenant() tenantId: string) {
    return this.contentTypesService.list(tenantId);
  }
}
```

## API Endpoints

- `POST /api/v1/content-types` - Tworzenie content type
- `GET /api/v1/content-types` - Lista content types
- `GET /api/v1/content-types/:id` - Szczegóły content type
- `PATCH /api/v1/content-types/:id` - Aktualizacja content type
- `DELETE /api/v1/content-types/:id` - Usuwanie content type

## Przykłady

### Tworzenie content type z fields

```json
POST /api/v1/content-types
{
  "name": "Article",
  "slug": "article",
  "fields": [
    {
      "name": "title",
      "type": "text",
      "required": true,
      "maxLength": 200
    },
    {
      "name": "content",
      "type": "richtext",
      "required": true
    },
    {
      "name": "publishedAt",
      "type": "datetime",
      "required": false
    }
  ]
}
```

### Tworzenie content type z schema

```json
POST /api/v1/content-types
{
  "name": "Page",
  "slug": "page",
  "schema": {
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "body": { "type": "string" }
    },
    "required": ["title"]
  }
}
```

## Typy pól

Obsługiwane typy pól:
- `text` - Tekst
- `number` - Liczba
- `boolean` - Boolean
- `date` - Data
- `datetime` - Data i czas
- `richtext` - Tekst sformatowany
- `media` - Referencja do pliku multimedialnego
- `relation` - Relacja do innego content type
- `json` - Obiekt JSON

## Testy

```bash
# Unit tests
pnpm --filter api test content-types.service.spec.ts

# E2E tests
pnpm --filter api test:e2e content-types.e2e-spec.ts
```

## Permissions

- `content_types:read` - Odczyt content types
- `content_types:write` - Tworzenie/edycja content types
- `content_types:delete` - Usuwanie content types

## Multi-Tenant Isolation

Wszystkie operacje są automatycznie filtrowane po `tenantId`. Content types są izolowane per tenant - każdy tenant widzi tylko swoje content types.





