# Production-safe migration path

This project was refactored from tenant-based isolation to org/site. The original migration chain is not order-safe for `prisma migrate deploy` (older timestamps depended on tables created later).

We now use a **baseline migration** that reflects the current `schema.prisma`. Legacy migrations are preserved in `prisma/migrations_legacy` for historical reference.

## New (empty) database

```
# Ensure DATABASE_URL is set
pnpm -C apps/api db:migrate:deploy
pnpm -C apps/api db:seed  # optional for demo data
```

## Existing database (already has schema/data)

1) **Verify schema matches** `schema.prisma` (manual sanity or compare via `prisma db pull`).
2) Mark the baseline as applied (no changes to data):

```
# Ensure DATABASE_URL is set
pnpm -C apps/api exec prisma migrate resolve --applied 20260124120000_baseline
```

3) Deploy migrations (no-op if baseline is applied):

```
pnpm -C apps/api db:migrate:deploy
```

## Notes
- Legacy migrations are in `prisma/migrations_legacy`.
- If you need to rebuild dev data, use:
  `pnpm -C apps/api exec prisma db push --force-reset` then `pnpm -C apps/api db:seed`.
- Do **not** run `db push --force-reset` on production.
