# --- panel stage: build the admin panel SPA ---
FROM node:24-bookworm-slim AS panel

RUN corepack enable
WORKDIR /panel

COPY panel/package.json panel/pnpm-lock.yaml panel/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY panel/ .
RUN pnpm build

# --- build stage: install deps, generate prisma client, compile the API ---
FROM node:24-bookworm-slim AS build

# Build tools for native modules (msgpackr-extract, unrs-resolver, ...).
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable

WORKDIR /app

# postinstall runs `prisma generate`, so the schema and config must be in
# place before install. Generate never connects, but prisma.config.ts reads
# DATABASE_URL, so give it a dummy value for the build.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY src/prisma ./src/prisma
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# --- runtime stage ---
FROM node:24-bookworm-slim

# Prisma needs libssl at runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# node_modules carries the prisma CLI used by `migrate deploy` at startup.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/prisma ./src/prisma
COPY --from=panel /panel/dist ./panel/dist
COPY package.json pnpm-lock.yaml prisma.config.ts ./

EXPOSE 3000

# Apply pending migrations, then start the server.
#
# The prisma binary directly, never `pnpm prisma`: pnpm reconciles node_modules
# against the lockfile before running anything, and under NODE_ENV=production
# that means fetching the whole tree over the network on every boot.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/src/main"]
