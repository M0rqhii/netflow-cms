FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@8.15.0

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/ui/package.json ./packages/ui/
COPY apps/admin/package.json ./apps/admin/

RUN pnpm install --frozen-lockfile

FROM deps AS builder

COPY packages/schemas ./packages/schemas
COPY packages/sdk ./packages/sdk
COPY packages/ui ./packages/ui
COPY apps/admin ./apps/admin

WORKDIR /app/apps/admin

RUN pnpm --filter @repo/admin build

FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder /app/apps/admin/public ./apps/admin/public

EXPOSE 3000

CMD ["node", "apps/admin/server.js"]
