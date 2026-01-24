# Hierarchia Organization + Site

## Przegląd

System używa dwupoziomowej hierarchii:

```
Organization (org)
  ├── Billing (subskrypcje, faktury, płatności)
  ├── Hosting (deployments, environments)
  ├── Domeny (dev domains)
  ├── Zarządzanie użytkownikami (RBAC)
  ├── Marketing (kampanie, dystrybucje)
  └── Sites (wiele stron)
      ├── Site 1
      │   ├── Content (types, entries, collections)
      │   ├── Media (pliki)
      │   ├── Pages (strony)
      │   ├── SEO (ustawienia SEO)
      │   └── Workflow (content workflow)
      └── Site 2
          └── ...
```

## Organization (Org)

**Zakres odpowiedzialności:**
- ✅ Zarządzanie wieloma Site'ami
- ✅ Billing i subskrypcje
- ✅ Hosting i deployments
- ✅ Domeny (dev domains)
- ✅ **RBAC - wszystkie role (ORG i SITE scope)**
- ✅ Marketing (kampanie, dystrybucje)
- ✅ Użytkownicy organizacji

**Dostęp:**
- Ma dostęp do wszystkich swoich Site'ów
- Może zarządzać billingiem, hostingiem, domenami
- Może zarządzać użytkownikami i rolami
- **Może zarządzać rolami ORG scope** (tylko org)
- **Może zarządzać rolami SITE scope** (wszystkie Site'y w org)

## Site

**Zakres odpowiedzialności:**
- ✅ Content (ContentTypes, ContentEntries)
- ✅ Collections (Collections, CollectionItems)
- ✅ Media (MediaItems)
- ✅ Pages
- ✅ SEO (SeoSettings)
- ✅ Workflow (ContentWorkflow)
- ✅ Webhooks
- ✅ Hooks
- ✅ **Site Roles (SITE scope)** - zarządzanie rolami specyficznymi dla Site

**Ograniczenia:**
- ❌ **NIE MA dostępu do danych Organization**
- ❌ Nie może zarządzać billingiem
- ❌ Nie może zarządzać hostingiem
- ❌ Nie może zarządzać domenami
- ❌ Nie może zarządzać użytkownikami org
- ❌ Nie może zarządzać innymi Site'ami w org
- ❌ **Nie może zarządzać rolami ORG scope** - tylko SITE scope

**Dostęp:**
- Ma dostęp tylko do swoich danych (content, media, pages, itp.)
- Może odczytać podstawowe info o subskrypcji (plan, status) - **tylko do odczytu**
- Może zarządzać rolami SITE scope dla swojego Site
- Ma `orgId` dla walidacji, ale **nie ma dostępu do pełnych danych org**

## Implementacja

### SiteService

```typescript
// ✅ DOBRZE - zwraca tylko dane site, bez org
async findById(id: string) {
  return this.prisma.site.findUnique({
    where: { id },
    select: {
      id: true,
      orgId: true, // Tylko orgId dla walidacji
      name: true,
      slug: true,
      settings: true,
      // NIE MA organization: true
    },
  });
}
```

### BillingService

```typescript
// ✅ DOBRZE - Site może tylko odczytać podstawowe info
async getSiteSubscription(siteId: string) {
  // Zwraca tylko plan, status - NIE zwraca danych org
  return {
    siteId,
    plan: subscription.plan,
    status: subscription.status,
    // NIE MA orgId, organization, itp.
  };
}

// ❌ ŹLE - Site nie powinno móc modyfikować subskrypcji
// TODO: Ograniczyć do org-level tylko
async updateSiteSubscription(siteId: string, dto: UpdateSiteSubscriptionDto) {
  // ...
}
```

## Middleware i Guards

### OrgSiteContextMiddleware

- Ustawia `app.current_org_id` dla Organization level
- Ustawia `app.current_site_id` dla Site level
- Waliduje że Site należy do Organization

### Guards

- `@CurrentOrg()` - dostęp do orgId (Organization level)
- `@CurrentSite()` - dostęp do siteId (Site level)
- Site endpoints nie powinny mieć dostępu do `@CurrentOrg()` z pełnymi danymi

## Przykłady użycia

### Organization Level

```typescript
// ✅ Organization może zarządzać billingiem
@Get('/billing')
async getBilling(@CurrentOrg() orgId: string) {
  return this.billingService.listSubscriptions(orgId);
}

// ✅ Organization może zarządzać Site'ami
@Get('/sites')
async getSites(@CurrentOrg() orgId: string) {
  return this.siteService.findByOrgId(orgId);
}
```

### Site Level

```typescript
// ✅ Site może zarządzać contentem
@Get('/content-types')
async getContentTypes(@CurrentSite() siteId: string) {
  return this.contentTypesService.list(siteId);
}

// ✅ Site może zarządzać rolami SITE scope
@Get('/rbac/roles')
async getSiteRoles(@CurrentSite() siteId: string, @CurrentOrg() orgId: string) {
  return this.rbacService.getRoles(orgId, 'SITE'); // Tylko SITE scope
}

@Post('/rbac/roles')
async createSiteRole(@CurrentSite() siteId: string, @CurrentOrg() orgId: string, dto: CreateRoleDto) {
  // Automatycznie ustawia scope: 'SITE'
  return this.rbacService.createRole(orgId, { ...dto, scope: 'SITE' });
}

// ❌ Site NIE MOŻE zarządzać rolami ORG scope
// @Post('/rbac/roles') z scope: 'ORG' - powinno być zablokowane

// ✅ Site może odczytać podstawowe info o subskrypcji (tylko odczyt)
@Get('/subscription')
async getSubscription(@CurrentSite() siteId: string) {
  return this.billingService.getSiteSubscription(siteId);
  // Zwraca tylko plan, status - NIE zwraca danych org
}

// ❌ Site NIE MOŻE zarządzać billingiem
// @Post('/billing/update') - powinno być zablokowane lub przeniesione do org level
```

## Bezpieczeństwo

1. **RLS (Row-Level Security)**: Automatycznie filtruje dane po `orgId` lub `siteId`
2. **Guards**: Sprawdzają dostęp użytkownika do org/site
3. **Service Layer**: Site services nie zwracają danych org
4. **API Endpoints**: Site endpoints nie powinny eksponować danych org

## Migracja

Podczas migracji z `Site` na `Organization + Site`:
- `Site` → `Organization` (billing, hosting, RBAC)
- `Site` → `Site` (content, media, pages)
- Zachować backward compatibility przez mapowanie `siteId` → `orgId`
