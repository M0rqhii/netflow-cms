# Status Migracji Kodu: Tenant → Organization + Site

**Data rozpoczęcia:** 2025-01-16  
**Status:** 🚧 W trakcie (główne serwisy zakończone)

---

## ✅ Zakończone

### 1. Schemat Prisma
- ✅ Dodano modele `Organization` i `Site`
- ✅ Zaktualizowano wszystkie relacje (tenantId → orgId / siteId)
- ✅ Zachowano backward compatibility (model `Tenant` jako DEPRECATED)

### 2. Nowe Serwisy i Moduły
- ✅ `OrganizationService` - zarządzanie organizacjami
- ✅ `SiteService` - zarządzanie stronami (BEZ dostępu do danych org)
- ✅ `OrganizationModule` i `SiteModule`
- ✅ `OrgSiteContextMiddleware` - middleware dla org/site context
- ✅ `OrgSiteModule`

### 3. Interfejsy i Typy
- ✅ `JwtPayload` - dodano `orgId`, zachowano `tenantId` (DEPRECATED)
- ✅ `CurrentUserPayload` - dodano `orgId`, zachowano `tenantId` (DEPRECATED)
- ✅ `AuthResponse` - dodano `orgId`
- ✅ `CurrentOrg` decorator - pobiera orgId z requestu
- ✅ `CurrentSite` decorator - pobiera siteId z requestu

### 4. Auth Service
- ✅ `findUserByEmail()` - zmieniono na `orgId`
- ✅ `validateUser()` - zmieniono na `orgId`
- ✅ `login()` - używa `orgId`, wspiera backward compatibility
- ✅ `register()` - używa `orgId`
- ✅ `getUserOrgs()` - nowa metoda (zastępuje `getUserTenants()`)
- ✅ `issueOrgToken()` - nowa metoda (zastępuje `issueTenantToken()`)
- ✅ `resolveOrgForUser()` - nowa metoda (zastępuje `resolveTenantForUser()`)
- ✅ `getProfile()` - używa `orgId`
- ✅ `LoginDto` - dodano `orgId`, zachowano `tenantId` (DEPRECATED)
- ✅ `RegisterDto` - dodano `orgId`, zachowano `tenantId` (DEPRECATED)

### 5. Billing Service
- ✅ Wszystkie metody używają `orgId` zamiast `tenantId`
- ✅ `getSiteSubscription()` - zwraca tylko podstawowe info (plan, status) - BEZ danych org
- ✅ `updateSiteSubscription()` - ma ostrzeżenie (powinno być tylko na poziomie org)
- ✅ `getMyBillingInfo()` - zwraca organizacje zamiast tenantów

### 6. Content Services (Site-level)
- ✅ `ContentTypesService` - `tenantId` → `siteId`
- ✅ `ContentEntriesService` - `tenantId` → `siteId`
- ✅ `CollectionsService` - `tenantId` → `siteId`
- ✅ `CollectionItemsService` - `tenantId` → `siteId`
- ✅ `MediaService` - `tenantId` → `siteId`, usunięto relację do `tenant`

### 7. RBAC
- ✅ `SiteRbacController` - nowy kontroler dla Site-level RBAC
- ✅ Site może zarządzać tylko rolami SITE scope
- ✅ Site NIE MOŻE zarządzać rolami ORG scope
- ✅ Org może zarządzać rolami ORG i SITE scope (przez `/orgs/:orgId/rbac`)

### 8. Hierarchia i Dokumentacja
- ✅ `SiteService` - usunięto dostęp do danych Organization
- ✅ `docs/architecture/ORG_SITE_HIERARCHY.md` - dokumentacja hierarchii
- ✅ Zaktualizowano komentarze w kodzie zgodnie z hierarchią

---

## ⏳ W trakcie / Do zrobienia

### 1. RBAC Service
- [ ] Zaktualizować `rbac.service.ts` - używać `orgId` zamiast `tenantId`
- [ ] Sprawdzić czy wszystkie metody RBAC używają `orgId`

### 2. Pozostałe Serwisy
- [ ] `WorkflowConfigService` - `tenantId` → `siteId`
- [ ] `ContentVersioningService` - `tenantId` → `siteId`
- [ ] `WebhooksService` - `tenantId` → `siteId`
- [ ] `HooksService` - `tenantId` → `siteId`
- [ ] `SiteEventsService` - `tenantId` → `siteId`
- [ ] `SiteSeoService` - `tenantId` → `siteId`
- [ ] `SitePagesService` - `tenantId` → `siteId`
- [ ] `SiteDeploymentsService` - `tenantId` → `siteId`
- [ ] `SnapshotsService` - `tenantId` → `siteId`
- [ ] `CollectionRolesService` - `tenantId` → `siteId`

### 3. Kontrolery
- [ ] Wszystkie kontrolery używające `tenantId` → `orgId` / `siteId`
- [ ] Zaktualizować endpointy w kontrolerach
- [ ] Dodać guards dla Site-level endpoints

### 4. Moduły
- [ ] `TenantsModule` → `OrganizationsModule` + `SitesModule`
- [ ] Zaktualizować importy w `app.module.ts`
- [ ] Zaktualizować middleware registration

### 5. GraphQL
- [ ] Zaktualizować resolvery GraphQL
- [ ] `tenant.resolver.ts` → `organization.resolver.ts` + `site.resolver.ts`

### 6. Testy
- [ ] Zaktualizować wszystkie testy
- [ ] Dodać testy dla nowych serwisów

---

## 📝 Notatki

- **Backward Compatibility:** Zachowujemy `tenantId` w interfejsach dla kompatybilności wstecznej
- **Migracja danych:** SQL migracja jest gotowa, ale nie została jeszcze uruchomiona
- **Hierarchia:** 
  - Organization zarządza: billing, hosting, domeny, RBAC (ORG + SITE scope), wiele Site'ów
  - Site zarządza: content, media, pages, SEO, workflow, RBAC (tylko SITE scope)
  - Site NIE MA dostępu do danych Organization

---

## 🎯 Następne kroki

1. ✅ Zaktualizować główne serwisy (auth, billing, content, media, collections)
2. ⏳ Zaktualizować pozostałe serwisy (workflow, webhooks, hooks, itp.)
3. ⏳ Zaktualizować wszystkie kontrolery
4. ⏳ Zaktualizować GraphQL resolvers
5. ⏳ Uruchomić migrację SQL
6. ⏳ Zaktualizować testy
