# TNT-026: Metryki (Prometheus/Grafana) - Roadmap

**Status:** 📋 Roadmap  
**Priority:** P2 (Medium)  
**Estimated Time:** 2-3 dni

---

## Summary

Dokumentacja roadmap dla implementacji metryk używając Prometheus i Grafana. Obecnie system używa console.log dla audit logging (MVP), ale w przyszłości można rozszerzyć o pełne metryki.

---

## 1. Obecny Stan (MVP)

### ✅ Audit Logging
- ✅ `AuditService` - console.log dla audit events
- ✅ `AuditInterceptor` - automatyczne logowanie requestów
- ✅ Manual audit logging w `AuthController`

**Status:** ✅ Zaimplementowane (MVP)

### ⏳ Metryki
- ⏳ Prometheus metrics endpoint
- ⏳ Grafana dashboards
- ⏳ Alerting rules

**Status:** ⏳ Roadmap

---

## 2. Metryki do Implementacji

### 2.1 Authentication Metrics

**Metryki:**
- `auth_login_total` - Total login attempts (counter)
- `auth_login_success_total` - Successful logins (counter)
- `auth_login_failure_total` - Failed logins (counter)
- `auth_logout_total` - Total logouts (counter)
- `auth_token_exchange_total` - Tenant token exchanges (counter)

**Labels:**
- `tenant_id` (optional)
- `platform_role`
- `tenant_role`

**Status:** ⏳ Roadmap

### 2.2 Hub Metrics

**Metryki:**
- `hub_access_total` - Hub access count (counter)
- `hub_tenants_count` - Average tenants per user (gauge)
- `hub_active_users` - Active users in Hub (gauge)

**Labels:**
- `user_id`
- `tenant_count`

**Status:** ⏳ Roadmap

### 2.3 Tenant Switch Metrics

**Metryki:**
- `tenant_switch_total` - Tenant switches (counter)
- `tenant_switch_duration_seconds` - Time to switch tenant (histogram)
- `tenant_cms_access_total` - Tenant CMS access (counter)

**Labels:**
- `tenant_id`
- `user_id`
- `from_tenant_id` (optional)
- `to_tenant_id`

**Status:** ⏳ Roadmap

### 2.4 Role Change Metrics

**Metryki:**
- `user_role_change_total` - Role changes (counter)
- `platform_role_change_total` - Platform role changes (counter)

**Labels:**
- `user_id`
- `tenant_id` (optional)
- `from_role`
- `to_role`
- `changed_by`

**Status:** ⏳ Roadmap

### 2.5 API Metrics

**Metryki:**
- `http_requests_total` - Total HTTP requests (counter)
- `http_request_duration_seconds` - Request duration (histogram)
- `http_request_size_bytes` - Request size (histogram)
- `http_response_size_bytes` - Response size (histogram)

**Labels:**
- `method`
- `route`
- `status_code`
- `tenant_id` (optional)

**Status:** ⏳ Roadmap

---

## 3. Prometheus Integration

### 3.1 Prometheus Client

**Package:**
```bash
npm install prom-client
```

**Status:** ⏳ Roadmap

### 3.2 Metrics Endpoint

**Endpoint:**
```
GET /metrics
```

**Response:**
```
# HELP auth_login_total Total login attempts
# TYPE auth_login_total counter
auth_login_total{tenant_id="...",platform_role="user"} 42

# HELP hub_access_total Hub access count
# TYPE hub_access_total counter
hub_access_total{user_id="...",tenant_count="3"} 10
```

**Status:** ⏳ Roadmap

### 3.3 Metrics Service

**Plik:** `apps/api/src/common/metrics/metrics.service.ts`

**Implementacja:**
```typescript
import { Injectable } from '@nestjs/common';
import * as promClient from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly authLoginTotal = new promClient.Counter({
    name: 'auth_login_total',
    help: 'Total login attempts',
    labelNames: ['tenant_id', 'platform_role'],
  });

  private readonly hubAccessTotal = new promClient.Counter({
    name: 'hub_access_total',
    help: 'Hub access count',
    labelNames: ['user_id', 'tenant_count'],
  });

  // ... more metrics
}
```

**Status:** ⏳ Roadmap

---

## 4. Grafana Dashboards

### 4.1 Dashboard: Authentication

**Panels:**
- Login attempts over time
- Login success/failure rate
- Token exchanges over time
- Logout count

**Status:** ⏳ Roadmap

### 4.2 Dashboard: Hub

**Panels:**
- Hub access over time
- Average tenants per user
- Active users in Hub
- Tenant distribution

**Status:** ⏳ Roadmap

### 4.3 Dashboard: Tenant Operations

**Panels:**
- Tenant switches over time
- Tenant switch duration
- Tenant CMS access
- Most active tenants

**Status:** ⏳ Roadmap

### 4.4 Dashboard: API Performance

**Panels:**
- Request rate
- Request duration (p50, p95, p99)
- Error rate
- Request/response size

**Status:** ⏳ Roadmap

---

## 5. Alerting Rules

### 5.1 Authentication Alerts

**Alerts:**
- High login failure rate (> 10% failures)
- Unusual login patterns
- Token exchange failures

**Status:** ⏳ Roadmap

### 5.2 Hub Alerts

**Alerts:**
- Hub access failures
- Unusual hub activity

**Status:** ⏳ Roadmap

### 5.3 API Alerts

**Alerts:**
- High error rate (> 5%)
- High latency (p95 > 1s)
- High request rate (unusual traffic)

**Status:** ⏳ Roadmap

---

## 6. Implementation Steps

### Step 1: Prometheus Client Setup
1. Install `prom-client` package
2. Create `MetricsService`
3. Create `/metrics` endpoint
4. Register metrics

### Step 2: Metrics Collection
1. Add metrics to `AuthService`
2. Add metrics to `AuthController`
3. Add metrics to `AuditService`
4. Add metrics to API interceptor

### Step 3: Grafana Setup
1. Configure Prometheus data source
2. Create dashboards
3. Set up alerting rules

### Step 4: Testing
1. Test metrics collection
2. Test Grafana dashboards
3. Test alerting rules

---

## 7. Next Steps

1. **Phase 1 (MVP):** Console logging (✅ Done)
2. **Phase 2 (Future):** Prometheus metrics endpoint
3. **Phase 3 (Future):** Grafana dashboards
4. **Phase 4 (Future):** Alerting rules

---

## 8. Notes

- Obecnie system używa console.log dla audit logging (MVP)
- W przyszłości można rozszerzyć o Prometheus metrics
- Grafana dashboards można utworzyć po implementacji Prometheus
- Alerting rules można dodać po implementacji Grafana

---

**Status:** 📋 Roadmap  
**Priority:** P2 (Medium)  
**Estimated Time:** 2-3 dni

