# Demo Organization Seed Script

## Opis

Skrypt tworzy demo organizację "TechFlow Solutions" z pełnym setupem:
- Organizacja: TechFlow Solutions
- 3 użytkowników z odpowiednimi rolami
- Systemowe role (ORG i SITE scope)
- Environments (DRAFT, PRODUCTION)
- Demo strona "home" w DRAFT environment

## Wymagania

1. **Baza danych**: PostgreSQL musi być uruchomiona
2. **Zmienna środowiskowa**: `DATABASE_URL` musi być ustawiona
3. **Prisma Client**: Wygenerowany (`npm run db:generate`)

## Uruchomienie

```bash
# Z głównego katalogu projektu
cd apps/api

# Upewnij się, że DATABASE_URL jest ustawione
# Windows PowerShell:
$env:DATABASE_URL="postgresql://netflow:netflow_dev_password@localhost:5432/netflow_cms?schema=public"

# Linux/Mac:
export DATABASE_URL="postgresql://netflow:netflow_dev_password@localhost:5432/netflow_cms?schema=public"

# Uruchom seed
npm run db:seed:demo
```

## Utworzone dane

### Organizacja
- **Nazwa**: TechFlow Solutions
- **Slug**: `techflow-solutions`
- **Plan**: professional

### Użytkownicy
1. **Anna Nowak** (Owner)
   - Email: `anna.nowak@techflow-solutions.com`
   - Hasło: `demo123`
   - Role: Org Owner (ORG) + Owner (SITE)

2. **Tomasz Wiśniewski** (Editor)
   - Email: `tomasz.wisniewski@techflow-solutions.com`
   - Hasło: `demo123`
   - Role: Org Member (ORG) + Editor (SITE)

3. **Maria Kowalska** (Marketing Manager)
   - Email: `maria.kowalska@techflow-solutions.com`
   - Hasło: `demo123`
   - Role: Org Member (ORG) + Marketing Manager (SITE)

### Strona
- **Slug**: `home`
- **Tytuł**: "TechFlow Solutions - Transformacja Cyfrowa"
- **Environment**: DRAFT
- **Status**: DRAFT
- **Zawartość**: Pełna struktura z sekcjami (Hero, Features, Testimonials, CTA)

## Dokumentacja

Pełna dokumentacja demo organizacji znajduje się w:
`docs/demo/DEMO_ORGANIZATION.md`

## Troubleshooting

### Błąd: "DATABASE_URL environment variable is not set"
**Rozwiązanie**: Ustaw zmienną środowiskową `DATABASE_URL` przed uruchomieniem skryptu.

### Błąd: "Capability not found"
**Rozwiązanie**: Najpierw uruchom główny seed script: `npm run db:seed` (tworzy capabilities).

### Błąd: "Prisma Client not generated"
**Rozwiązanie**: Uruchom `npm run db:generate` przed seed.





