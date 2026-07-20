# zar-auth

The authentication and authorization service for zar.mx apps.

A NestJS auth microservice: email/password sign-up and sign-in, Redis-backed
sessions (httpOnly cookies), email verification and password setup via Resend
(queued with BullMQ), and an admin bootstrap on startup.

Built for a microservice setup:

- **Roles** (`USER`, `ADMIN`) live here; each downstream service maps roles to
  its own permissions. This service's own map is `src/auth/permissions.ts`,
  enforced with `@RequirePermissions()`.
- **`POST /auth/token`** exchanges a valid session cookie for a short-lived
  HS256 JWT (`sub`, `email`, `role`) that other services verify offline with
  `AUTH_SECRET`.
- **App settings** (`/settings`, admin-only): toggle open sign-up and manage an
  email whitelist (exact or `*@domain`) used while sign-up is disabled.
- **Account disabling**: admins can disable/enable users; disabling blocks
  sign-in and destroys all their sessions instantly.

## Stack

- NestJS 11 + Express
- Prisma 7 / PostgreSQL (`citext` extension)
- Redis (sessions) + BullMQ (email queue, Bull Board dashboard)
- Zod-validated environment, Pino logging, Swagger / OpenAPI

## Getting started

```bash
pnpm install
cp .env.example .env   # then fill in real values
pnpm migrate:deploy    # apply migrations
pnpm start:dev
```

## API docs

- Swagger UI at `/docs` (non-production only).
- `openapi.json` is the generated OpenAPI spec — never edit it by hand;
  regenerate with `pnpm openapi:export` after changing routes or DTOs.
  Frontends can generate typed clients from it (e.g. `openapi-typescript`),
  and Postman/Bruno can import it directly.
- Ready-made Bruno collections are in `bruno/`.
