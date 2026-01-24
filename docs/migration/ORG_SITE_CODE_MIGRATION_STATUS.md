# Status Migracji Kodu: Site → Organization + Site

**Data rozpoczęcia:** 2025-01-16  
**Status:** 🚧 W trakcie (główne serwisy zakończone)

---

## ✅ Zakończone

### 1. Schemat Prisma
- ✅ Dodano modele `Organization` i `Site`
- ✅ Zaktualizowano wszystkie relacje (siteId → orgId / siteId)
- ✅ Zachowano backward compatibility (model `Site` jako DEPRECATED)

### 2. Nowe Serwisy i Moduły
- ✅ `OrganizationService` - zarządzanie organizacjami
- ✅ `SiteService` - zarządzanie stronami (BEZ dostępu do danych org)
- ✅ `OrganizationModule` i `SiteModule`
- ✅ `OrgSiteContextMiddleware` - middleware dla org/site context
- ✅ `OrgSiteModule`

### 3. Interfejsy i Typy
- ✅ `JwtPayload` - dodano `orgId`, zachowano `siteId` (DEPRECATED)
- ✅ `CurrentUserPayload` - dodano `orgId`, zachowano `siteId` (DEPRECATED)
- ✅ `AuthResponse` - dodano `orgId`
- ✅ `CurrentOrg` decorator - pobiera orgId z requestu
- ✅ `CurrentSite` decorator - pobiera siteId z requestu

### 4. Auth Service
- ✅ `findUserByEmail()` - zmieniono na `orgId`
- ✅ `validateUser()` - zmieniono na `orgId`
- ✅ `login()` - używa `orgId`, wspiera backward compatibility
- ✅ `register()` - używa `orgId`
- ✅ `getUserOrgs()` - nowa metoda (zastępuje `getUserSites()`)
- ✅ `issueOrgToken()` - nowa metoda (zastępuje `issueSiteToken()`)
- ✅ `resolveOrgForUser()` - nowa metoda (zastępuje `resolveSiteForUser()`)
- ✅ `getProfile()` - używa `orgId`
- ✅ `LoginDto` - dodano `orgId`, zachowano `siteId` (DEPRECATED)
- ✅ `RegisterDto` - dodano `orgId`, zachowano `siteId` (DEPRECATED)

### 5. Billing Service
- ✅ Wszystkie metody używają `orgId` zamiast `siteId`
- ✅ `getSiteSubscription()` - zwraca tylko podstawowe info (plan, status) - BEZ danych org
- ✅ `updateSiteSubscription()` - ma ostrzeżenie (powinno być tylko na poziomie org)
- ✅ `getMyBillingInfo()` - zwraca organizacje zamiast siteów

### 6. Content Services (Site-level)
- ✅ `ContentTypesService` - `siteId` → `siteId`
- ✅ `ContentEntriesService` - `siteId` → `siteId`
- ✅ `CollectionsService` - `siteId` → `siteId`
- ✅ `CollectionItemsService` - `siteId` → `siteId`
- ✅ `MediaService` - `siteId` → `siteId`, usunięto relację do `site`

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
- [ ] Zaktualizować `rbac.service.ts` - używać `orgId` zamiast `siteId`
- [ ] Sprawdzić czy wszystkie metody RBAC używają `orgId`

### 2. Pozostałe Serwisy
- [ ] `WorkflowConfigService` - `siteId` → `siteId`
- [ ] `ContentVersioningService` - `siteId` → `siteId`
- [ ] `WebhooksService` - `siteId` → `siteId`
- [ ] `HooksService` - `siteId` → `siteId`
- [ ] `SiteEventsService` - `siteId` → `siteId`
- [ ] `SiteSeoService` - `siteId` → `siteId`
- [ ] `SitePagesService` - `siteId` → `siteId`
- [ ] `SiteDeploymentsService` - `siteId` → `siteId`
- [ ] `SnapshotsService` - `siteId` → `siteId`
- [ ] `CollectionRolesService` - `siteId` → `siteId`

### 3. Kontrolery
- [ ] Wszystkie kontrolery używające `siteId` → `orgId` / `siteId`
- [ ] Zaktualizować endpointy w kontrolerach
- [ ] Dodać guards dla Site-level endpoints

### 4. Moduły
- [ ] `SitesModule` → `OrganizationsModule` + `SitesModule`
- [ ] Zaktualizować importy w `app.module.ts`
- [ ] Zaktualizować middleware registration

### 5. GraphQL
- [ ] Zaktualizować resolvery GraphQL
- [ ] `site.resolver.ts` → `organization.resolver.ts` + `site.resolver.ts`

### 6. Testy
- [ ] Zaktualizować wszystkie testy
- [ ] Dodać testy dla nowych serwisów

---

## 📝 Notatki

- **Backward Compatibility:** Zachowujemy `siteId` w interfejsach dla kompatybilności wstecznej
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
