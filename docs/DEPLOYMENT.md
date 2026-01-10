# Deployment Guide - Netflow CMS

Szczegółowy przewodnik deployment dla środowiska produkcyjnego.

## Spis Treści

1. [Wymagania](#wymagania)
2. [Przygotowanie środowiska](#przygotowanie-środowiska)
3. [Konfiguracja zmiennych środowiskowych](#konfiguracja-zmiennych-środowiskowych)
4. [Deployment z Docker](#deployment-z-docker)
5. [Deployment bez Docker](#deployment-bez-docker)
6. [Health Checks](#health-checks)
7. [Monitoring](#monitoring)
8. [Backup i Disaster Recovery](#backup-i-disaster-recovery)
9. [Security Checklist](#security-checklist)
10. [Troubleshooting](#troubleshooting)

---

## Wymagania

### Minimalne wymagania systemowe

- **CPU**: 2 cores
- **RAM**: 4GB
- **Disk**: 20GB (SSD recommended)
- **OS**: Linux (Ubuntu 20.04+ / Debian 11+ / Alpine Linux) lub Windows Server 2019+

### Wymagane oprogramowanie

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **PostgreSQL**: >= 15.0
- **Redis**: >= 7.0
- **Docker** (opcjonalnie): >= 20.10
- **Docker Compose** (opcjonalnie): >= 2.0

---

## Przygotowanie środowiska

### 1. Instalacja zależności systemowych

#### Ubuntu/Debian

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm@8.15.0

# Install PostgreSQL
sudo apt install -y postgresql-15 postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Docker (optional)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

#### Alpine Linux

```bash
apk add --no-cache nodejs npm postgresql15 redis docker docker-compose
npm install -g pnpm@8.15.0
```

### 2. Konfiguracja PostgreSQL

```bash
# Create database user
sudo -u postgres psql << EOF
CREATE USER netflow WITH PASSWORD 'your-secure-password';
CREATE DATABASE netflow_cms OWNER netflow;
GRANT ALL PRIVILEGES ON DATABASE netflow_cms TO netflow;
\q
EOF

# Configure PostgreSQL for production
sudo nano /etc/postgresql/15/main/postgresql.conf
# Set:
# max_connections = 100
# shared_buffers = 256MB
# effective_cache_size = 1GB
# maintenance_work_mem = 64MB
# checkpoint_completion_target = 0.9
# wal_buffers = 16MB
# default_statistics_target = 100
# random_page_cost = 1.1
# effective_io_concurrency = 200
# work_mem = 4MB
# min_wal_size = 1GB
# max_wal_size = 4GB

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 3. Konfiguracja Redis

```bash
# Configure Redis
sudo nano /etc/redis/redis.conf
# Set:
# maxmemory 256mb
# maxmemory-policy allkeys-lru
# requirepass your-redis-password

# Restart Redis
sudo systemctl restart redis
```

---

## Konfiguracja zmiennych środowiskowych

### Tworzenie pliku .env

Skopiuj `env.example` do `.env` i wypełnij wartości:

```bash
cp env.example .env
nano .env
```

### Wymagane zmienne środowiskowe

```env
# Database
DATABASE_URL=postgresql://netflow:your-secure-password@localhost:5432/netflow_cms?schema=public&connection_limit=20&pool_timeout=20

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_URL=redis://:your-redis-password@localhost:6379

# API
PORT=4000
NODE_ENV=production
API_PREFIX=/api/v1

# Frontend
FRONTEND_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1

# Security (GENERATE SECURE SECRETS!)
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_SECRET=your-super-secure-refresh-token-secret-min-32-chars
REFRESH_TOKEN_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://yourdomain.com

# Logging
LOG_LEVEL=info

# Application
APP_NAME=Netflow CMS
APP_VERSION=1.0.0
APP_PROFILE=production
```

### Generowanie bezpiecznych sekretów

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate REFRESH_TOKEN_SECRET
openssl rand -base64 32
```

---

## Deployment z Docker

### 1. Przygotowanie Docker Compose

Użyj `docker-compose.prod.yml`:

```bash
cp docker-compose.prod.yml docker-compose.yml
nano docker-compose.yml
```

### 2. Build i uruchomienie

```bash
# Build images
docker-compose build

# Run database migrations
docker-compose run --rm api pnpm --filter api db:migrate:deploy

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 3. Health checks

```bash
# Check API health
curl http://localhost:4000/api/v1/health

# Check readiness
curl http://localhost:4000/api/v1/health/readiness

# Check liveness
curl http://localhost:4000/api/v1/health/liveness
```

---

## Deployment bez Docker

### 1. Build aplikacji

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Generate Prisma Client
pnpm db:generate

# Build API
pnpm --filter api build

# Build Admin
pnpm --filter admin build
```

### 2. Uruchomienie z PM2 (recommended)

```bash
# Install PM2
npm install -g pm2

# Start API
cd apps/api
pm2 start dist/main.js --name netflow-api --env production

# Start Admin
cd ../admin
pm2 start .next/standalone/server.js --name netflow-admin --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

### 3. Uruchomienie z systemd

#### API Service

```bash
sudo nano /etc/systemd/system/netflow-api.service
```

```ini
[Unit]
Description=Netflow CMS API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=netflow
WorkingDirectory=/opt/netflow-cms/apps/api
Environment=NODE_ENV=production
EnvironmentFile=/opt/netflow-cms/.env
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable netflow-api
sudo systemctl start netflow-api
sudo systemctl status netflow-api
```

#### Admin Service

```bash
sudo nano /etc/systemd/system/netflow-admin.service
```

```ini
[Unit]
Description=Netflow CMS Admin
After=network.target netflow-api.service

[Service]
Type=simple
User=netflow
WorkingDirectory=/opt/netflow-cms/apps/admin
Environment=NODE_ENV=production
EnvironmentFile=/opt/netflow-cms/.env
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable netflow-admin
sudo systemctl start netflow-admin
sudo systemctl status netflow-admin
```

---

## Health Checks

### Endpointy health check

- **GET /api/v1/health** - Full health check (database, Redis, memory, disk)
- **GET /api/v1/health/readiness** - Readiness check (database, Redis)
- **GET /api/v1/health/liveness** - Liveness check (basic)

### Konfiguracja Kubernetes

```yaml
livenessProbe:
  httpGet:
    path: /api/v1/health/liveness
    port: 4000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/v1/health/readiness
    port: 4000
  initialDelaySeconds: 10
  periodSeconds: 5
```

---

## Monitoring

### Prometheus Metrics

Endpoint: `GET /api/v1/metrics`

### Grafana Dashboards

Zobacz `docs/observability/TNT-026_METRICS_ROADMAP.md` dla szczegółów.

### Logging

Structured logging jest dostępne przez `StructuredLoggerService`. W produkcji użyj:

- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Loki + Grafana**
- **CloudWatch** (AWS)
- **Azure Monitor** (Azure)

---

## Backup i Disaster Recovery

### Automatyczne backupy bazy danych

Zobacz `scripts/backup/` dla skryptów backup.

### RTO i RPO

- **RTO (Recovery Time Objective)**: < 4h
- **RPO (Recovery Point Objective)**: < 1h

### Backup strategy

1. **Database**: Codzienne backupy (retention: 30 dni)
2. **Media files**: Codzienne backupy (retention: 90 dni)
3. **Configuration**: Wersjonowane w Git

---

## Security Checklist

- [ ] Wszystkie zmienne środowiskowe są ustawione
- [ ] JWT_SECRET i REFRESH_TOKEN_SECRET są bezpieczne (min. 32 znaki)
- [ ] CORS jest skonfigurowany tylko dla dozwolonych domen
- [ ] Helmet security headers są włączone
- [ ] Rate limiting jest aktywny
- [ ] HTTPS jest włączony (użyj reverse proxy: Nginx/Caddy)
- [ ] Firewall jest skonfigurowany
- [ ] Database ma silne hasło
- [ ] Redis ma hasło (jeśli dostępny z sieci)
- [ ] Regularne aktualizacje systemu
- [ ] Monitoring i alerting są skonfigurowane

### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Troubleshooting

### Problem: Aplikacja nie startuje

1. Sprawdź logi: `pm2 logs` lub `journalctl -u netflow-api`
2. Sprawdź zmienne środowiskowe: `env | grep -E 'DATABASE|REDIS|JWT'`
3. Sprawdź health endpoint: `curl http://localhost:4000/api/v1/health`

### Problem: Database connection failed

1. Sprawdź czy PostgreSQL działa: `sudo systemctl status postgresql`
2. Sprawdź connection string w `.env`
3. Sprawdź firewall: `sudo ufw status`

### Problem: Redis connection failed

1. Sprawdź czy Redis działa: `sudo systemctl status redis`
2. Sprawdź hasło w `.env`
3. Test connection: `redis-cli -a your-password ping`

### Problem: High memory usage

1. Sprawdź connection pooling w `DATABASE_URL`
2. Sprawdź cache configuration
3. Monitoruj z Prometheus/Grafana

---

## Aktualizacja aplikacji

### Process

1. **Backup database**: `scripts/backup/backup-db.sh`
2. **Pull latest code**: `git pull origin main`
3. **Install dependencies**: `pnpm install --frozen-lockfile`
4. **Run migrations**: `pnpm db:migrate:deploy`
5. **Build**: `pnpm build`
6. **Restart services**: `pm2 restart all` lub `sudo systemctl restart netflow-api`

### Rollback

1. **Restore database**: `scripts/backup/restore-db.sh <backup-file>`
2. **Checkout previous version**: `git checkout <previous-tag>`
3. **Rebuild and restart**

---

## Support

W razie problemów:
- Sprawdź dokumentację: `docs/`
- Sprawdź logi aplikacji
- Sprawdź health endpoints
- Skontaktuj się z zespołem deweloperskim

---

**Ostatnia aktualizacja**: 2025-01-20
