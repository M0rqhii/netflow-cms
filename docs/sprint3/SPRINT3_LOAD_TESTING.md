# Sprint 3: Load Testing & Optimization

**Status:** ✅ Completed  
**Completed Date:** 2024-01-09  
**Sprint:** Sprint 3

---

## Summary

Dokumentacja i narzędzia do load testing oraz optymalizacji wydajności API.

---

## Load Testing Tools

### 1. Artillery.js

**Installation:**
```bash
npm install -D artillery
```

**Configuration:** `artillery.config.yml`

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Spike test"
  processor: "./artillery-processor.js"
scenarios:
  - name: "API Load Test"
    flow:
      - post:
          url: "/api/v1/auth/login"
          json:
            email: "{{ $randomString() }}@example.com"
            password: "test123"
      - get:
          url: "/api/v1/collections"
          headers:
            Authorization: "Bearer {{ token }}"
            X-Tenant-ID: "{{ tenantId }}"
```

### 2. k6

**Installation:**
```bash
# Download from https://k6.io/docs/getting-started/installation/
```

**Script:** `load-test.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Login
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: 'test@example.com',
    password: 'test123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login status 200': (r) => r.status === 200,
  });

  const token = loginRes.json('access_token');
  const tenantId = loginRes.json('user.tenantId');

  // Get collections
  const collectionsRes = http.get(`${BASE_URL}/api/v1/collections`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': tenantId,
    },
  });

  check(collectionsRes, {
    'collections status 200': (r) => r.status === 200,
  });

  sleep(1);
}
```

### 3. Apache Bench (ab)

**Basic Usage:**
```bash
ab -n 1000 -c 10 -H "Authorization: Bearer TOKEN" -H "X-Tenant-ID: TENANT_ID" http://localhost:3000/api/v1/collections
```

---

## Performance Metrics

### Key Metrics to Monitor

1. **Response Time**
   - p50 (median)
   - p95 (95th percentile)
   - p99 (99th percentile)
   - Max response time

2. **Throughput**
   - Requests per second (RPS)
   - Transactions per second (TPS)

3. **Error Rate**
   - HTTP 4xx errors
   - HTTP 5xx errors
   - Timeout errors

4. **Resource Usage**
   - CPU usage
   - Memory usage
   - Database connection pool
   - Redis connection pool

### Target Metrics

- **Response Time (p95):** < 500ms
- **Response Time (p99):** < 1000ms
- **Error Rate:** < 1%
- **Throughput:** > 100 RPS
- **Database Query Time:** < 100ms (p95)

---

## Optimization Strategies

### 1. Database Query Optimization

**Indexes:**
- Ensure indexes on frequently queried fields
- Composite indexes for multi-field queries
- Monitor slow queries

**Query Optimization:**
- Use `select` to fetch only needed fields
- Avoid N+1 queries (use `include` or `select`)
- Use pagination for large datasets
- Use batch operations for multiple updates

**Connection Pooling:**
- Configure Prisma connection pool size
- Monitor connection pool usage
- Set appropriate timeout values

### 2. Caching Strategy

**Cache Layers:**
1. **Application Cache (Redis)**
   - Cache frequently accessed data
   - Set appropriate TTL
   - Invalidate on updates

2. **HTTP Cache (ETag)**
   - Use ETag for conditional requests
   - Set appropriate cache headers
   - Use CDN for static assets

**Cache Keys:**
- Use tenant-scoped cache keys
- Include version/ETag in cache keys
- Use consistent key format

### 3. API Optimization

**Response Compression:**
- Enable gzip compression
- Use compression middleware

**Pagination:**
- Implement cursor-based pagination for large datasets
- Set reasonable page size limits
- Use `skip` and `take` efficiently

**Rate Limiting:**
- Implement rate limiting per user/tenant
- Use sliding window algorithm
- Set appropriate limits

### 4. Horizontal Scaling

**Load Balancing:**
- Use round-robin or least-connections algorithm
- Health check endpoints
- Session affinity (if needed)

**Stateless Design:**
- Store session data in Redis
- Use JWT for authentication
- Avoid server-side session storage

**Database Scaling:**
- Read replicas for read-heavy workloads
- Connection pooling
- Query optimization

---

## Load Testing Scenarios

### Scenario 1: Normal Load
- **Duration:** 10 minutes
- **RPS:** 50
- **Purpose:** Baseline performance

### Scenario 2: Sustained Load
- **Duration:** 30 minutes
- **RPS:** 100
- **Purpose:** Long-term stability

### Scenario 3: Spike Test
- **Duration:** 5 minutes
- **RPS:** 500 (spike to 1000)
- **Purpose:** Handle traffic spikes

### Scenario 4: Stress Test
- **Duration:** 15 minutes
- **RPS:** 200 (gradual increase)
- **Purpose:** Find breaking point

---

## Monitoring & Observability

### 1. Application Metrics

**Prometheus Metrics:**
- Request duration histogram
- Request count counter
- Error rate gauge
- Database query duration
- Cache hit/miss ratio

### 2. Database Metrics

- Query execution time
- Connection pool usage
- Slow query log
- Database size

### 3. Redis Metrics

- Cache hit/miss ratio
- Memory usage
- Connection count
- Command latency

### 4. System Metrics

- CPU usage
- Memory usage
- Network I/O
- Disk I/O

---

## Performance Testing Checklist

- [ ] Load test with normal traffic
- [ ] Stress test to find breaking point
- [ ] Spike test for traffic bursts
- [ ] Endurance test for long-term stability
- [ ] Database query optimization
- [ ] Cache hit rate optimization
- [ ] Response time optimization
- [ ] Error rate monitoring
- [ ] Resource usage monitoring
- [ ] Horizontal scaling validation

---

## Notes

- Load testing should be performed in a staging environment
- Monitor all metrics during load testing
- Document all findings and optimizations
- Set up alerts for performance degradation
- Regular load testing as part of CI/CD pipeline

---

**Completed by:** Backend Codex  
**Review Status:** Ready for Review  
**Next Review:** After production deployment

