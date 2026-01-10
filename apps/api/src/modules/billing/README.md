# Billing Module

Moduł do zarządzania billingiem, subskrypcjami, fakturami i płatnościami.

## Funkcjonalności

- **Subskrypcje** - zarządzanie subskrypcjami planów (free, professional, enterprise)
- **Faktury** - przeglądanie faktur i historii płatności
- **Płatności** - śledzenie płatności za faktury
- **Stripe Integration** - integracja z Stripe dla płatności online
- **Webhooks** - obsługa webhooków Stripe dla automatycznego aktualizowania statusów

## Endpointy API

### Subskrypcje

- `GET /billing/subscription/status` - Status subskrypcji dla aktualnego tenant
- `GET /billing/subscriptions` - Lista subskrypcji z paginacją
- `GET /billing/subscriptions/:id` - Szczegóły subskrypcji
- `POST /billing/subscriptions` - Utworzenie nowej subskrypcji
- `PATCH /billing/subscriptions/:id` - Aktualizacja subskrypcji
- `DELETE /billing/subscriptions/:id` - Anulowanie subskrypcji

### Faktury

- `GET /billing/invoices` - Lista faktur z paginacją
- `GET /billing/invoices/:id` - Szczegóły faktury

### Płatności

- `GET /billing/payments` - Lista płatności z paginacją

### Webhooks

- `POST /billing/webhooks/stripe` - Webhook endpoint dla Stripe (public)

## Uprawnienia

- `BILLING_READ` - odczyt danych billingowych (subskrypcje, faktury, płatności)
- `BILLING_WRITE` - zarządzanie subskrypcjami (tworzenie, aktualizacja, anulowanie)

**Domyślnie dostępne dla:** `TENANT_ADMIN` (super_admin ma wszystkie uprawnienia)

## Modele Danych

### Subscription
- `id` - UUID subskrypcji
- `tenantId` - ID tenant
- `plan` - Plan (free, professional, enterprise)
- `status` - Status (active, cancelled, past_due, trialing)
- `currentPeriodStart` - Data rozpoczęcia okresu
- `currentPeriodEnd` - Data zakończenia okresu
- `cancelAtPeriodEnd` - Czy anulować na końcu okresu
- `stripeSubscriptionId` - ID subskrypcji w Stripe (opcjonalne)
- `stripeCustomerId` - ID klienta w Stripe (opcjonalne)

### Invoice
- `id` - UUID faktury
- `tenantId` - ID tenant
- `subscriptionId` - ID subskrypcji (opcjonalne)
- `amount` - Kwota
- `currency` - Waluta (USD)
- `status` - Status (draft, open, paid, void, uncollectible)
- `invoiceNumber` - Numer faktury
- `stripeInvoiceId` - ID faktury w Stripe (opcjonalne)

### Payment
- `id` - UUID płatności
- `tenantId` - ID tenant
- `invoiceId` - ID faktury (opcjonalne)
- `amount` - Kwota
- `currency` - Waluta
- `status` - Status (pending, succeeded, failed, refunded)
- `paymentMethod` - Metoda płatności
- `stripePaymentIntentId` - ID payment intent w Stripe (opcjonalne)

## Integracja ze Stripe

Moduł obsługuje webhooki Stripe dla automatycznego aktualizowania:
- Statusów subskrypcji (`customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`)
- Statusów płatności (`invoice.payment_succeeded`, `invoice.payment_failed`)

## Przykłady Użycia

### Utworzenie subskrypcji

```typescript
POST /billing/subscriptions
{
  "plan": "professional",
  "trialDays": 14
}
```

### Anulowanie subskrypcji

```typescript
DELETE /billing/subscriptions/:id
```

### Lista faktur

```typescript
GET /billing/invoices?status=paid&page=1&pageSize=20
```

## Uwagi

- Webhook endpoint dla Stripe jest publiczny (bez autentykacji), ale w produkcji powinien weryfikować podpis Stripe
- Subskrypcje są automatycznie synchronizowane z planem tenant przez StripeService
- Anulowanie subskrypcji automatycznie downgrade'uje tenant do planu "free"










