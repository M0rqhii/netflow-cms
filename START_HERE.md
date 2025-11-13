# START HERE - Quick Setup Guide

## 5-Minute Setup

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Start Docker Services
```bash
docker-compose up -d
```

### 3. Configure Environment

**Create `apps/api/.env`:**
```env
DATABASE_URL="postgresql://netflow:netflow_dev_password@localhost:5432/netflow_cms?schema=public"
REDIS_URL="redis://localhost:6379"
PORT=4000
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
```

**Create `apps/admin/.env`:**
```env
NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV=development
```

### 4. Setup Database
```bash
pnpm db:generate
pnpm db:migrate
```

### 5. Start Development
```bash
pnpm dev
```

**That's it!**

- API: http://localhost:4000/api/v1
- Admin: http://localhost:3000
- Prisma Studio: `pnpm db:studio`

---

## Next Steps

1. Read **[SETUP_COMPLETE.md](docs/guides/SETUP_COMPLETE.md)** for detailed instructions
2. Check **[docs/plan.md](docs/plan.md)** for development tasks
3. Review **[context-instructions.md](context-instructions.md)** for AI agent guidelines

---

## Troubleshooting

### Port already in use
```bash
# Change PORT in apps/api/.env
PORT=4001
```

### Database connection error
```bash
# Check if Docker is running
docker ps

# Restart Docker services
docker-compose restart
```

### Prisma errors
```bash
# Regenerate Prisma Client
pnpm db:generate

# Reset database (WARNING: deletes all data)
pnpm --filter api db:migrate reset
```

---

**Ready to code!**

