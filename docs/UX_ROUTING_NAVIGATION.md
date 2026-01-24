# Routing i Nawigacja - Dashboard jako centrum, Site Panel jako tryb pracy

## Zasada nadrzedna
- Dashboard = centrum (hub organizacji i zarzadzania).
- Site Panel = tryb pracy dla konkretnej strony (tylko praca nad strona).

## Mapa nawigacji (przed)

### Global / Hub
- /
- /login
- /dashboard
- /sites
- /sites/new
- /sites/[slug]
- /billing
- /account
- /dev
- /dev/*

### Site Panel (lewy sidebar)
- /sites/[slug]/panel/overview
- /sites/[slug]/panel/pages
- /sites/[slug]/panel/page-builder
- /sites/[slug]/panel/content
- /sites/[slug]/panel/collections
- /sites/[slug]/panel/media
- /sites/[slug]/panel/design
- /sites/[slug]/panel/seo
- /sites/[slug]/panel/marketing
- /sites/[slug]/panel/deployments
- /sites/[slug]/panel/snapshots
- /sites/[slug]/panel/activity
- /sites/[slug]/panel/settings

## Mapa nawigacji (po)

### Dashboard (centrum / hub)
- /dashboard
- /sites
- /sites/new
- /sites/[slug]
- /sites/[slug]/users
- /sites/[slug]/billing
- /billing
- /account
- /dev
- /dev/*

### Site Panel (tryb pracy)
- /sites/[slug]/panel/overview
- /sites/[slug]/panel/pages
- /sites/[slug]/panel/page-builder
- /sites/[slug]/panel/content
- /sites/[slug]/panel/media
- /sites/[slug]/panel/marketing
- /sites/[slug]/panel/deployments
- /sites/[slug]/panel/activity
- /sites/[slug]/panel/settings
- /sites/[slug]/panel/seo (opcjonalnie, tylko jesli realnie potrzebne)

## Trasy, ktore musza zawsze wracac do dashboardu (hub)
- /dashboard
- /sites
- /sites/new
- /sites/[slug]
- /sites/[slug]/users
- /sites/[slug]/billing
- /billing (Owner only)
- /account
- /dev/* (privileged only)

## Trasy tylko "work mode" (Site Panel)
- /sites/[slug]/panel/overview
- /sites/[slug]/panel/pages
- /sites/[slug]/panel/page-builder
- /sites/[slug]/panel/content
- /sites/[slug]/panel/media
- /sites/[slug]/panel/marketing
- /sites/[slug]/panel/deployments
- /sites/[slug]/panel/activity
- /sites/[slug]/panel/settings
- /sites/[slug]/panel/seo (opcjonalnie)

## Trasy do deprecated / ukrycia
- /sites/[slug]/panel/design (duplikat Pages/Builder)
- globalne: /media, /collections, /content-types (jesli sa globalne)
- /dev oraz /dev/* widoczne tylko dla privileged

## Zasady breadcrumbs
- Zawsze start od Dashboard.
- Wejscie w Site Panel: Dashboard > Sites > [Site] > Panel > [Section].
- Builder zawsze pod Pages: Dashboard > Sites > [Site] > Pages > [Page] > Builder.
- Marketing/Deployments/Content tylko w ramach Site Panel.
- Widoczne CTA "Exit Work Mode" prowadzi do /sites/[slug].

## Widocznosc per rola (hub)

### Owner
- Pelny dostep do /billing i /sites/[slug]/billing.

### Org Admin
- Brak /billing (brak wejscia do platnosci, faktur, metod platnosci, zmiany planu).
- Widok read-only "Plan + limity/zuzycie" jako informacja operacyjna.

### Org Member
- Dostep do hub tylko w zakresie przypisan do stron i uprawnien.

### Privileged only
- /dev i /dev/* tylko dla super_admin, org_admin, platform_admin.

## Widocznosc per rola (Site Panel)
- Site Admin / Owner: pelny panel.
- Editor / Editor-in-Chief: builder.edit, draft.save, content.* bez publish.
- Publisher: tylko publish/rollback (jesli policy pozwala).
- Viewer: builder.view, content.view, analytics.view.

## Zasady policy (org policy)
- Ads toggle (marketing.ads.manage):
  - Modul Marketing jest widoczny.
  - Akcje Ads disabled + tooltip "Wylaczone polityka organizacji".
  - CTA: "Popros Ownera o wlaczenie".
- Marketing module toggle (jesli istnieje na poziomie org):
  - Gdy OFF: caly modul Marketing moze byc ukryty z menu.
  - Gdy ON: standardowe blokady per capability.
