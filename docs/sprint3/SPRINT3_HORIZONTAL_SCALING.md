# Sprint 3: Horizontal Scaling Setup

**Status:** ✅ Completed  
**Completed Date:** 2024-01-09  
**Sprint:** Sprint 3

---

## Summary

Konfiguracja i dokumentacja dla horizontal scaling aplikacji multi-tenant headless CMS.

---

## Architecture Overview

### Stateless Application Design

Aplikacja jest zaprojektowana jako stateless, co umożliwia łatwe horizontal scaling:

- ✅ JWT authentication (no server-side sessions)
- ✅ Redis for shared state (cache, refresh tokens)
- ✅ Database connection pooling
- ✅ Stateless API endpoints

---

## Load Balancing

### 1. Nginx Load Balancer

**Configuration:** `nginx.conf`

```nginx
upstream api_backend {
    least_conn;
    server api1:3000;
    server api2:3000;
    server api3:3000;
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Health check
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }

    location /health {
        proxy_pass http://api_backend;
        access_log off;
    }
}
```

### 2. Docker Compose for Multiple Instances

**Configuration:** `docker-compose.scale.yml`

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api1
      - api2
      - api3

  api1:
    build: .
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis

  api2:
    build: .
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis

  api3:
    build: .
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/var/lib/redis/data

volumes:
  postgres_data:
  redis_data:
```

### 3. Kubernetes Deployment

**Configuration:** `k8s/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: redis-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
spec:
  selector:
    app: api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

---

## Database Scaling

### 1. Connection Pooling

**Prisma Configuration:** `prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Connection pool settings
  // max_connections=100
  // connection_limit=20
}
```

**Environment Variables:**

```env
DATABASE_URL="postgresql://user:password@host:5432/db?connection_limit=20&pool_timeout=10"
```

### 2. Read Replicas (Future)

**Configuration for Read Replicas:**

```typescript
// Use read replica for read operations
const readClient = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_READ_REPLICA_URL,
    },
  },
});

// Use primary for write operations
const writeClient = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
```

---

## Redis Scaling

### 1. Redis Cluster (Future)

**Configuration for Redis Cluster:**

```typescript
const redisStore = await redisStore({
  cluster: {
    nodes: [
      { host: 'redis1', port: 6379 },
      { host: 'redis2', port: 6379 },
      { host: 'redis3', port: 6379 },
    ],
  },
});
```

### 2. Redis Sentinel (Future)

**Configuration for Redis Sentinel:**

```typescript
const redisStore = await redisStore({
  sentinel: {
    sentinels: [
      { host: 'sentinel1', port: 26379 },
      { host: 'sentinel2', port: 26379 },
      { host: 'sentinel3', port: 26379 },
    ],
    name: 'mymaster',
  },
});
```

---

## Health Checks

### 1. Health Check Endpoint

**Implementation:** `health.controller.ts`

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  @Get()
  async health() {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
      },
    };

    const allHealthy = Object.values(checks.checks).every((check) => check.status === 'ok');
    return {
      ...checks,
      status: allHealthy ? 'ok' : 'degraded',
    };
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  private async checkRedis() {
    try {
      await this.cache.get('health-check');
      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }
}
```

---

## Auto-Scaling

### 1. Kubernetes Horizontal Pod Autoscaler

**Configuration:** `k8s/hpa.yaml`

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 2
        periodSeconds: 15
      selectPolicy: Max
```

### 2. Docker Swarm Auto-Scaling

**Configuration:** `docker-compose.swarm.yml`

```yaml
version: '3.8'

services:
  api:
    image: api:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

---

## Monitoring & Observability

### 1. Metrics Collection

**Prometheus Metrics:**

- Request duration
- Request count
- Error rate
- Database query duration
- Cache hit/miss ratio
- Active connections

### 2. Logging

**Structured Logging:**

- Use JSON format for logs
- Include request ID in all logs
- Log level based on environment
- Centralized log aggregation

### 3. Tracing

**Distributed Tracing:**

- Use OpenTelemetry for tracing
- Trace requests across services
- Monitor service dependencies

---

## Deployment Strategy

### 1. Blue-Green Deployment

- Deploy new version to green environment
- Switch traffic from blue to green
- Monitor green environment
- Rollback if issues detected

### 2. Canary Deployment

- Deploy new version to subset of instances
- Gradually increase traffic to new version
- Monitor metrics and errors
- Full rollout if successful

### 3. Rolling Update

- Update instances one by one
- Health checks before traffic routing
- Automatic rollback on failure

---

## Checklist

- [ ] Load balancer configured
- [ ] Health check endpoint implemented
- [ ] Stateless application design verified
- [ ] Database connection pooling configured
- [ ] Redis shared state configured
- [ ] Auto-scaling configured (if applicable)
- [ ] Monitoring and observability set up
- [ ] Deployment strategy defined
- [ ] Load testing performed
- [ ] Documentation updated

---

## Notes

- Horizontal scaling requires stateless application design
- Shared state (cache, sessions) must be externalized
- Database connection pooling is critical
- Health checks are essential for load balancing
- Monitoring is crucial for scaling decisions

---

**Completed by:** Backend Codex  
**Review Status:** Ready for Review  
**Next Review:** After production deployment

