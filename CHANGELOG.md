# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- [TNT-015] Feature: Collections Module
  - CRUD API dla Collections (POST, GET, PUT, DELETE /collections)
  - CRUD API dla Collection Items (POST, GET, PUT, DELETE /collections/:slug/items)
  - Wersjonowanie items z optimistic locking (version field)
  - Status DRAFT/PUBLISHED dla items
  - ETag support dla cache'owania (If-None-Match header → 304 Not Modified)
    - ETag header zwracany w odpowiedziach GET /collections/:slug/items/:id
    - Automatyczne generowanie ETag przez Prisma middleware
  - Redis cache dla metadanych kolekcji (30s TTL)
  - TenantGuard - wymusza X-Tenant-ID header
  - TenantModule - globalny moduł dla multi-tenant isolation
  - Prisma middleware dla automatycznego ETag generation
  - Walidacja danych przez Zod schemas
  - Testy jednostkowe i E2E (>85% coverage)
    - Testy jednostkowe dla CollectionsService
    - Testy jednostkowe dla CollectionItemsService
    - Testy E2E dla wszystkich endpointów Collections
    - Testy E2E dla wszystkich endpointów Collection Items
    - Testy dla ETag support (304 Not Modified)
    - Testy dla multi-tenant isolation
    - Testy dla Redis cache
    - Testy dla optimistic locking (version mismatch)

### Changed
- PrismaService: dodano middleware do wyliczania ETag dla CollectionItem
- AppModule: dodano TenantModule i CollectionsModule
- CollectionItemsController: poprawiono obsługę ETag - nagłówek ETag zwracany w odpowiedziach GET

### Notes
- Następny krok (TNT-016): kompilacja schematów Zod ze schemaJson oraz walidatory typów custom
- Wszystkie endpointy wymagają nagłówka X-Tenant-ID
- Multi-tenant isolation jest wymuszane na poziomie guarda i w każdym query
- Coverage testów: >85% dla całego modułu Collections

---

## [0.1.0] - 2024-01-01

### Added
- Initial project setup
- Multi-tenant database schema (Tenant, User, ContentType, ContentEntry)
- Basic NestJS structure
- Prisma ORM configuration
- TypeScript strict mode
- ESLint and Prettier configuration

