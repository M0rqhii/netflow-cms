# Product Requirements Document (PRD)
## Netflow CMS - Platform Hosting + Site Management System

**Wersja:** 2.0.0  
**Data:** 2025-01-16  
**Status:** Draft → In Review → Approved

---

## 1. Executive Summary

### 1.1 Opis Produktu

Netflow CMS to system typu "panel klienta + hosting + CMS", który łączy:
- Panel hostingu (jak OVH / CyberFolks)
- Centralny panel do zarządzania stronami (jak WordPress.com / WP Engine)
- Headless CMS oparty na własnym systemie zarządzania treścią

System składa się z dwóch poziomów:

1. **Platform Panel (TERAZ)** - Główny panel zarządzania platformą
   - Zarządzanie wszystkimi stronami (sites)
   - Zarządzanie użytkownikami i uprawnieniami
   - Zarządzanie płatnościami i planami
   - Zarządzanie kontem użytkownika

2. **Site Panel / Page Builder (NA PÓŹNIEJ)** - Panel konkretnej strony
   - Page Builder (drag & drop)
   - Content Management
   - Site Settings

**Obecny Focus:** Platform Panel - panel zarządzania platformą hostingową i stronami.

### 1.2 Problem do Rozwiązania
- Organizacje potrzebują elastycznego CMS bez konieczności zarządzania własną infrastrukturą
- Potrzeba skalowalnego rozwiązania dla wielu klientów
- Wymagana pełna izolacja danych między tenantami
- Potrzeba nowoczesnego API-first podejścia do zarządzania treścią

### 1.3 Cele Biznesowe
- **Krótkoterminowe (3 miesiące):**
  - MVP z podstawową funkcjonalnością CMS
  - Obsługa do 10 tenantów
  - RESTful API dla zarządzania treścią
  
- **Średnioterminowe (6 miesięcy):**
  - Obsługa do 100 tenantów
  - Zaawansowane funkcje CMS (media management, workflow)
  - GraphQL API
  
- **Długoterminowe (12 miesięcy):**
  - Obsługa do 1000+ tenantów
  - Marketplace z pluginami
  - White-label rozwiązania

---

## 2. User Personas

### 2.1 Tenant Administrator
- **Rola:** Administrator organizacji korzystającej z CMS
- **Potrzeby:**
  - Zarządzanie użytkownikami w swojej organizacji
  - Konfiguracja struktury treści
  - Zarządzanie uprawnieniami
- **Pain Points:**
  - Brak kontroli nad własnymi danymi
  - Skomplikowane interfejsy administracyjne

### 2.2 Content Editor
- **Rola:** Osoba tworząca i edytująca treści
- **Potrzeby:**
  - Intuicyjny edytor treści
  - Zarządzanie mediami
  - Podgląd przed publikacją
- **Pain Points:**
  - Wolne ładowanie interfejsu
  - Brak możliwości współpracy w czasie rzeczywistym

### 2.3 Developer (API Consumer)
- **Rola:** Deweloper integrujący CMS z aplikacjami frontend
- **Potrzeby:**
  - Dokumentowane API
  - Elastyczne query
  - Webhooks dla real-time updates
- **Pain Points:**
  - Niezgodność API z dokumentacją
  - Ograniczenia w query

### 2.4 Platform Administrator
- **Rola:** Administrator platformy multi-tenant
- **Potrzeby:**
  - Zarządzanie tenantami
  - Monitoring i metryki
  - Billing i rozliczenia
- **Pain Points:**
  - Trudność w skalowaniu
  - Problemy z izolacją danych

---

## 3. Funkcjonalne Wymagania

### 3.1 Zarządzanie Tenantami (FR-001)

#### FR-001.1 Tworzenie Tenantów
- **Opis:** System musi umożliwiać tworzenie nowych tenantów
- **Akceptacja:**
  - [ ] Możliwość utworzenia tenantów przez API i UI
  - [ ] Automatyczne tworzenie izolowanej przestrzeni danych
  - [ ] Generowanie unikalnego subdomain (opcjonalnie)
  - [ ] Konfiguracja domyślnych ustawień tenantów

**Przykład użycia:**
```json
POST /api/v1/tenants
{
  "name": "Acme Corporation",
  "slug": "acme",
  "plan": "professional",
  "settings": {
    "default_language": "pl",
    "timezone": "Europe/Warsaw"
  }
}
```

#### FR-001.2 Aktualizacja Tenantów
- **Opis:** Możliwość modyfikacji danych tenantów
- **Akceptacja:**
  - [ ] Aktualizacja podstawowych danych
  - [ ] Zmiana planu subskrypcji
  - [ ] Aktualizacja ustawień

#### FR-001.3 Usuwanie Tenantów
- **Opis:** Bezpieczne usuwanie tenantów z opcją soft delete
- **Akceptacja:**
  - [ ] Soft delete z możliwością przywrócenia (30 dni)
  - [ ] Hard delete po okresie retencji
  - [ ] Automatyczne czyszczenie powiązanych danych

#### FR-001.4 Listowanie Tenantów
- **Opis:** Lista wszystkich tenantów z paginacją i filtrowaniem
- **Akceptacja:**
  - [ ] Paginacja (domyślnie 20 na stronę)
  - [ ] Filtrowanie po statusie, planie, dacie utworzenia
  - [ ] Sortowanie po różnych kolumnach

---

### 3.2 Zarządzanie Treścią (FR-002)

#### FR-002.1 Content Types (Typy Treści)
- **Opis:** Elastyczny system definiowania typów treści
- **Akceptacja:**
  - [ ] Definiowanie custom content types przez API
  - [ ] Wsparcie dla różnych typów pól (text, number, date, media, relation)
  - [ ] Walidacja pól
  - [ ] Wersjonowanie schematów content types

**Przykład:**
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

#### FR-002.2 Tworzenie Treści
- **Opis:** Tworzenie wpisów treści zgodnie z zdefiniowanymi content types
- **Akceptacja:**
  - [ ] Walidacja danych przed zapisem
  - [ ] Automatyczne generowanie slugów
  - [ ] Wsparcie dla draftów i publikacji
  - [ ] Automatyczne SEO metadata

#### FR-002.3 Edycja Treści
- **Opis:** Modyfikacja istniejących treści
- **Akceptacja:**
  - [ ] Wersjonowanie zmian
  - [ ] Historia edycji
  - [ ] Rollback do poprzednich wersji
  - [ ] Współpraca w czasie rzeczywistym (opcjonalnie)

#### FR-002.4 Usuwanie Treści
- **Opis:** Usuwanie treści z opcją soft delete
- **Akceptacja:**
  - [ ] Soft delete z możliwością przywrócenia
  - [ ] Cascade delete dla powiązanych treści (konfigurowalne)

#### FR-002.5 Query Treści
- **Opis:** Zaawansowane query do pobierania treści
- **Akceptacja:**
  - [ ] Filtrowanie po polach
  - [ ] Sortowanie
  - [ ] Paginacja
  - [ ] Wyszukiwanie pełnotekstowe
  - [ ] Filtrowanie po statusie (draft/published)

**Przykład:**
```
GET /api/v1/content/article?filter[publishedAt][$gte]=2024-01-01&sort=-publishedAt&page=1&limit=10
```

---

### 3.3 Zarządzanie Mediami (FR-003)

#### FR-003.1 Upload Plików
- **Opis:** Przesyłanie plików multimedialnych
- **Akceptacja:**
  - [ ] Wsparcie dla obrazów, video, dokumentów
  - [ ] Walidacja typów plików i rozmiarów
  - [ ] Automatyczne generowanie thumbnaili
  - [ ] CDN integration
  - [ ] Progress tracking dla dużych plików

#### FR-003.2 Zarządzanie Biblioteką Mediów
- **Opis:** Przeglądanie i zarządzanie przesłanymi plikami
- **Akceptacja:**
  - [ ] Galeria z podglądem
  - [ ] Metadane plików (rozmiar, typ, data uploadu)
  - [ ] Tagi i kategorie
  - [ ] Wyszukiwanie

---

### 3.4 Autentykacja i Autoryzacja (FR-004)

#### FR-004.1 Autentykacja Użytkowników
- **Opis:** System logowania i rejestracji
- **Akceptacja:**
  - [ ] Email/password authentication
  - [ ] JWT tokens
  - [ ] Refresh tokens
  - [ ] OAuth2 (Google, GitHub) - opcjonalnie
  - [ ] 2FA - opcjonalnie

#### FR-004.2 Role i Uprawnienia
- **Opis:** System RBAC (Role-Based Access Control)
- **Akceptacja:**
  - [ ] Predefiniowane role (Admin, Editor, Viewer)
  - [ ] Custom role creation
  - [ ] Granularne uprawnienia (CRUD per resource)
  - [ ] Uprawnienia na poziomie tenantów

**Przykład ról:**
- **Super Admin:** Pełny dostęp do platformy
- **Tenant Admin:** Pełny dostęp w obrębie tenantów
- **Editor:** Tworzenie i edycja treści
- **Viewer:** Tylko odczyt

---

### 3.5 API (FR-005)

#### FR-005.1 RESTful API
- **Opis:** RESTful API zgodne z best practices
- **Akceptacja:**
  - [ ] RESTful endpoints
  - [ ] JSON responses
  - [ ] Proper HTTP status codes
  - [ ] Rate limiting
  - [ ] API versioning (/api/v1/)

#### FR-005.2 GraphQL API (Opcjonalnie)
- **Opis:** GraphQL endpoint dla elastycznych query
- **Akceptacja:**
  - [ ] GraphQL schema
  - [ ] Query i mutations
  - [ ] Subscriptions dla real-time updates

#### FR-005.3 Dokumentacja API
- **Opis:** Kompletna dokumentacja API
- **Akceptacja:**
  - [ ] OpenAPI/Swagger specification
  - [ ] Interactive API explorer
  - [ ] Przykłady requestów i odpowiedzi
  - [ ] Changelog API

---

## 4. Niefunkcjonalne Wymagania

### 4.1 Wydajność (NFR-001)
- **Response Time:** < 200ms dla 95% requestów
- **Throughput:** Obsługa 1000+ requestów/sekundę
- **Database:** Query optimization, indexing strategy
- **Caching:** Redis dla cache'owania często używanych danych

### 4.2 Skalowalność (NFR-002)
- **Horizontal Scaling:** Aplikacja musi być skalowalna horyzontalnie
- **Database:** Wsparcie dla read replicas
- **Load Balancing:** Automatyczne load balancing
- **Tenant Capacity:** Obsługa 1000+ aktywnych tenantów

### 4.3 Bezpieczeństwo (NFR-003)
- **Data Isolation:** Pełna izolacja danych między tenantami (row-level security)
- **Encryption:** Encryption at rest i in transit (TLS 1.3)
- **Authentication:** Secure token handling
- **Authorization:** Sprawdzanie uprawnień przy każdym request
- **Audit Logging:** Logowanie wszystkich operacji na danych
- **SQL Injection:** Ochrona przed SQL injection
- **XSS/CSRF:** Ochrona przed XSS i CSRF

### 4.4 Dostępność (NFR-004)
- **Uptime:** 99.9% availability (SLA)
- **Monitoring:** Real-time monitoring i alerting
- **Backup:** Automatyczne backupy (codziennie)
- **Disaster Recovery:** RTO < 4h, RPO < 1h

### 4.5 Utrzymanie (NFR-005)
- **Logging:** Structured logging (JSON)
- **Monitoring:** Metryki aplikacji i infrastruktury
- **Error Tracking:** Centralized error tracking (Sentry)
- **Documentation:** Aktualna dokumentacja techniczna

---

## 5. Architektura Techniczna

### 5.1 Stack Technologiczny
- **Backend:** Node.js (Express/Fastify) lub Python (FastAPI/Django)
- **Database:** PostgreSQL (primary), Redis (cache)
- **Search:** Elasticsearch (opcjonalnie)
- **Storage:** S3-compatible storage dla mediów
- **Message Queue:** RabbitMQ lub Redis (dla async tasks)
- **Containerization:** Docker, Kubernetes

### 5.2 Multi-Tenancy Strategy
**Approach:** Database-per-tenant z shared schema i row-level security

**Uzasadnienie:**
- Lepsza izolacja danych niż shared database
- Łatwiejsze backup i restore per tenant
- Możliwość skalowania per tenant
- Wsparcie dla custom schematów w przyszłości

**Implementacja:**
- Wszystkie tabele zawierają `tenant_id`
- Row-level security policies w PostgreSQL
- Middleware do automatycznego filtrowania po `tenant_id`

### 5.3 API Design
- **RESTful:** Zgodne z REST principles
- **Versioning:** URL-based (/api/v1/)
- **Pagination:** Cursor-based pagination
- **Filtering:** Query parameter filtering
- **Sorting:** Query parameter sorting
- **Error Handling:** Consistent error format

**Przykład error response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  }
}
```

---

## 6. Integracje

### 6.1 Webhooks
- **Opis:** Webhooks dla eventów (content created, updated, deleted)
- **Akceptacja:**
  - [ ] Konfiguracja webhooków per tenant
  - [ ] Retry mechanism
  - [ ] Signature verification

### 6.2 Third-party Integrations
- **CDN:** CloudFlare, AWS CloudFront
- **Email:** SendGrid, AWS SES
- **Storage:** AWS S3, Google Cloud Storage
- **Analytics:** Google Analytics, Mixpanel (opcjonalnie)

---

## 7. User Experience

### 7.1 Admin UI
- **Design:** Modern, responsive design
- **Framework:** React/Vue.js z Material UI/Tailwind CSS
- **Features:**
  - Intuicyjny edytor treści (WYSIWYG)
  - Drag-and-drop dla mediów
  - Real-time preview
  - Dark mode

### 7.2 Mobile Support
- **Responsive:** Pełna responsywność na mobile
- **Mobile App:** Opcjonalnie native mobile app (future)

---

## 8. Metryki Sukcesu

### 8.1 Business Metrics
- **Liczba tenantów:** Cel: 100 tenantów w 6 miesięcy
- **Aktywni użytkownicy:** Cel: 1000 aktywnych użytkowników/miesiąc
- **API Usage:** Cel: 1M requestów/miesiąc

### 8.2 Technical Metrics
- **Uptime:** > 99.9%
- **Response Time:** P95 < 200ms
- **Error Rate:** < 0.1%
- **Test Coverage:** > 80%

---

## 9. Roadmap

### Phase 1: MVP (Miesiące 1-3)
- [ ] Podstawowa funkcjonalność multi-tenant
- [ ] RESTful API
- [ ] Content management (CRUD)
- [ ] Authentication i authorization
- [ ] Basic admin UI

### Phase 2: Enhancement (Miesiące 4-6)
- [ ] Media management
- [ ] Advanced content types
- [ ] Webhooks
- [ ] Improved admin UI
- [ ] Performance optimization

### Phase 3: Scale (Miesiące 7-9)
- [ ] GraphQL API
- [ ] Advanced search
- [ ] Workflow management
- [ ] Analytics dashboard
- [ ] Mobile app (opcjonalnie)

### Phase 4: Enterprise (Miesiące 10-12)
- [ ] White-label solutions
- [ ] Marketplace z pluginami
- [ ] Advanced security features
- [ ] Compliance (GDPR, SOC2)
- [ ] Multi-region deployment

---

## 10. Ryzyka i Mitigacja

### 10.1 Ryzyka Techniczne
- **Ryzyko:** Problemy z izolacją danych między tenantami
  - **Mitigacja:** Rigorous testing, security audits, row-level security
  
- **Ryzyko:** Problemy ze skalowalnością
  - **Mitigacja:** Load testing, horizontal scaling design, caching strategy

### 10.2 Ryzyka Biznesowe
- **Ryzyko:** Niska adopcja przez użytkowników
  - **Mitigacja:** User research, beta testing, iteracyjne ulepszenia

---

## 11. Dependencies i Assumptions

### 11.1 Dependencies
- Dostępność cloud infrastructure (AWS/GCP/Azure)
- Zespół deweloperski (3-5 osób)
- Design resources dla UI

### 11.2 Assumptions
- Użytkownicy mają podstawową wiedzę techniczną
- Internet connectivity jest stabilne
- Przeglądarki wspierają nowoczesne standardy (ES6+)

---

## 12. Appendix

### 12.1 Glosariusz
- **Tenant:** Organizacja korzystająca z platformy CMS
- **Content Type:** Definicja struktury treści (np. Article, Page)
- **Entry:** Pojedynczy wpis treści zgodny z content type
- **Headless CMS:** CMS bez frontendu, tylko API

### 12.2 Referencje
- [REST API Best Practices](https://restfulapi.net/)
- [Multi-Tenancy Patterns](https://docs.microsoft.com/en-us/azure/sql-database/saas-tenancy-app-design-patterns)
- [OpenAPI Specification](https://swagger.io/specification/)

---

**Status:** Draft  
**Ostatnia aktualizacja:** 2024-01-01  
**Następny review:** 2024-01-15


