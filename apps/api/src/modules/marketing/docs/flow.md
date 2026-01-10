# Marketing & Distribution Flow - "Publish Everywhere" (Omnichannel)

## Przegląd

Moduł Marketing & Distribution umożliwia publikację równoległą treści na stronie, w mediach społecznościowych i w reklamach. System zapisuje joby publikacji i statusy dla każdego kanału.

## Flow Publikacji

### 1. Editor tworzy content (draft)

Editor (z capability `content.create` lub `content.edit`) tworzy treść w CMS:
- Tworzy wpis w kolekcji lub content entry
- Status: `draft`

### 2. Marketing Editor tworzy wersje postów (draft)

Marketing Editor (z capability `marketing.content.edit`) tworzy wersje postów dla różnych kanałów:
- Tworzy `DistributionDraft` z:
  - `title`: Tytuł posta
  - `content`: JSON z wersjami dla różnych kanałów (np. `{ "site": {...}, "facebook": {...}, "twitter": {...} }`)
  - `channels`: Lista kanałów: `["site", "facebook", "twitter", "linkedin", "instagram", "ads"]`
  - `campaignId`: Opcjonalne powiązanie z kampanią
  - `contentId`: Opcjonalne powiązanie z treścią z CMS
  - `scheduledAt`: Opcjonalna zaplanowana data publikacji
- Status: `draft` → `ready`

### 3. Marketing Manager lub Publisher publikuje

Marketing Manager (z capability `marketing.publish`) lub Publisher publikuje treść:

**Opcje publikacji:**
- **a) tylko strona**: `channels: ["site"]`
- **b) strona + social**: `channels: ["site", "facebook", "twitter", "linkedin", "instagram"]`
- **c) strona + social + ads**: `channels: ["site", "facebook", "twitter", "linkedin", "instagram", "ads"]`

**Weryfikacja RBAC:**
- `marketing.publish` - wymagane dla wszystkich kanałów
- `marketing.ads.manage` - wymagane dla kanału `ads` (jeśli policy włączone)

**Proces publikacji:**
1. System tworzy `PublishJob` ze statusem `pending`
2. Job jest przetwarzany asynchronicznie (w produkcji: queue)
3. Dla każdego kanału:
   - System publikuje treść (stub - w produkcji użyj integracji z API)
   - Tworzy `PublishResult` z statusem `success` lub `failed`
   - Zapisuje `externalId` (ID posta w zewnętrznym systemie) i `url`
4. Job status: `success` (wszystkie kanały) lub `failed` (wszystkie kanały) lub `success` (częściowy sukces)

## Encje

### Campaign
- Kampanie marketingowe
- Pola: `name`, `description`, `status`, `startDate`, `endDate`
- Relacje: `distributionDrafts[]`, `publishJobs[]`

### DistributionDraft
- Wersje postów do publikacji (draft)
- Pola: `title`, `content` (JSON), `channels[]`, `status`, `scheduledAt`
- Relacje: `campaign?`, `publishJobs[]`

### ChannelConnection
- Połączenia z kanałami social media (stub)
- Pola: `channel`, `channelId`, `channelName`, `status`, `credentials` (JSON), `metadata` (JSON)
- Wymaga: `marketing.social.connect` (tylko Admin modułu / Owner)

### PublishJob
- Joby publikacji
- Pola: `channels[]`, `status`, `startedAt`, `completedAt`
- Relacje: `campaign?`, `draft?`, `publishResults[]`

### PublishResult
- Wyniki publikacji per kanał
- Pola: `channel`, `status`, `externalId`, `url`, `error`, `publishedAt`
- Relacja: `job`

## RBAC

### Capabilities

- `marketing.view` - Podgląd dashboardu i list
- `marketing.content.edit` - Edycja treści marketingowych (tworzenie draftów)
- `marketing.publish` - Publikacja treści
- `marketing.schedule` - Planowanie postów (⚠️ może być wyłączone policy)
- `marketing.campaign.manage` - Zarządzanie kampaniami
- `marketing.social.connect` - Łączenie kont social media (tylko Admin modułu / Owner)
- `marketing.ads.manage` - Zarządzanie reklamami (⚠️ może być wyłączone policy)
- `marketing.stats.view` - Podgląd statystyk

### Weryfikacja

System weryfikuje uprawnienia w następujący sposób:
1. Sprawdza czy użytkownik ma capability w swojej roli (ORG lub SITE scope)
2. Sprawdza czy capability jest włączone przez org policy (jeśli `canBePolicyControlled: true`)
3. Jeśli capability jest wyłączone przez policy → zwraca 403 z `reason: 'policy_disabled'`

### Przykłady

**Publikacja bez ads:**
- Wymaga: `marketing.publish`
- Kanały: `["site", "facebook", "twitter"]`

**Publikacja z ads:**
- Wymaga: `marketing.publish` + `marketing.ads.manage`
- Kanały: `["site", "facebook", "twitter", "ads"]`
- Jeśli `marketing.ads.manage` jest wyłączone przez policy → błąd 403

**Łączenie kont social:**
- Wymaga: `marketing.social.connect`
- Tylko Admin modułu / Owner

## API Endpoints

### Campaigns
- `GET /marketing/campaigns` - Lista kampanii (wymaga: `marketing.view`)
- `GET /marketing/campaigns/:id` - Szczegóły kampanii (wymaga: `marketing.view`)
- `POST /marketing/campaigns` - Utworzenie kampanii (wymaga: `marketing.campaign.manage`)
- `PATCH /marketing/campaigns/:id` - Aktualizacja kampanii (wymaga: `marketing.campaign.manage`)
- `DELETE /marketing/campaigns/:id` - Usunięcie kampanii (wymaga: `marketing.campaign.manage`)

### Distribution Drafts
- `GET /marketing/drafts` - Lista draftów (wymaga: `marketing.view`)
- `GET /marketing/drafts/:id` - Szczegóły draftu (wymaga: `marketing.view`)
- `POST /marketing/drafts` - Utworzenie draftu (wymaga: `marketing.content.edit`)
- `PATCH /marketing/drafts/:id` - Aktualizacja draftu (wymaga: `marketing.content.edit`)
- `DELETE /marketing/drafts/:id` - Usunięcie draftu (wymaga: `marketing.content.edit`)

### Publish
- `POST /marketing/publish` - Publikacja omnichannel (wymaga: `marketing.publish`)
- `GET /marketing/jobs` - Lista jobów publikacji (wymaga: `marketing.view`)
- `GET /marketing/jobs/:id` - Szczegóły joba publikacji (wymaga: `marketing.view`)

### Channel Connections
- `GET /marketing/channels` - Lista połączeń (wymaga: `marketing.view`)
- `GET /marketing/channels/:id` - Szczegóły połączenia (wymaga: `marketing.view`)
- `POST /marketing/channels` - Utworzenie połączenia (wymaga: `marketing.social.connect`)
- `PATCH /marketing/channels/:id` - Aktualizacja połączenia (wymaga: `marketing.social.connect`)
- `DELETE /marketing/channels/:id` - Usunięcie połączenia (wymaga: `marketing.social.connect`)

## Integracje (Stub)

Na razie integracje są stub/mock. W produkcji należy zaimplementować:

- **Facebook**: Graph API
- **Twitter**: Twitter API v2
- **LinkedIn**: LinkedIn API
- **Instagram**: Instagram Graph API
- **Ads**: Facebook Ads API, Google Ads API, etc.

## Statusy

### Campaign Status
- `draft` - Szkic
- `active` - Aktywna
- `paused` - Wstrzymana
- `completed` - Zakończona
- `archived` - Zarchiwizowana

### DistributionDraft Status
- `draft` - Szkic
- `ready` - Gotowa do publikacji
- `published` - Opublikowana
- `archived` - Zarchiwizowana

### PublishJob Status
- `pending` - Oczekuje na przetworzenie
- `processing` - W trakcie przetwarzania
- `success` - Sukces (wszystkie lub część kanałów)
- `failed` - Błąd (wszystkie kanały)
- `cancelled` - Anulowana

### PublishResult Status
- `success` - Sukces
- `failed` - Błąd
- `skipped` - Pominięta (np. brak połączenia z kanałem)

## Przykładowy Flow

1. **Editor tworzy content:**
   ```json
   POST /collections/blog/items
   {
     "title": "Nowy post",
     "content": "..."
   }
   ```

2. **Marketing Editor tworzy draft:**
   ```json
   POST /marketing/drafts
   {
     "siteId": "site-123",
     "contentId": "content-456",
     "title": "Nowy post",
     "content": {
       "site": { "title": "Nowy post", "body": "..." },
       "facebook": { "message": "Sprawdź nasz nowy post!" },
       "twitter": { "text": "Nowy post na blogu! #blog" }
     },
     "channels": ["site", "facebook", "twitter"]
   }
   ```

3. **Marketing Manager publikuje:**
   ```json
   POST /marketing/publish
   {
     "siteId": "site-123",
     "draftId": "draft-789",
     "channels": ["site", "facebook", "twitter"]
   }
   ```

4. **System tworzy job i przetwarza:**
   - Tworzy `PublishJob` ze statusem `pending`
   - Przetwarza asynchronicznie
   - Dla każdego kanału tworzy `PublishResult`
   - Aktualizuje status joba

5. **Sprawdzenie statusu:**
   ```json
   GET /marketing/jobs/job-123
   {
     "id": "job-123",
     "status": "success",
     "publishResults": [
       { "channel": "site", "status": "success", "url": "https://example.com/posts/123" },
       { "channel": "facebook", "status": "success", "externalId": "fb_123", "url": "https://facebook.com/posts/123" },
       { "channel": "twitter", "status": "success", "externalId": "tw_123", "url": "https://twitter.com/posts/123" }
     ]
   }
   ```

## Uwagi

- Integracje są stub - w produkcji użyj prawdziwych API
- Publikacja jest asynchroniczna - użyj queue (Bull, BullMQ, etc.)
- Credentials są przechowywane w JSON (stub) - w produkcji użyj vault (HashiCorp Vault, AWS Secrets Manager, etc.)
- Policy toggle (⚠️) - niektóre capabilities mogą być wyłączone globalnie w organizacji





