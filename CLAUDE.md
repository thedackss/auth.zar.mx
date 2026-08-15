# zar-auth

Reusable auth microservice for all zar.mx apps, deployed at `auth.zar.mx`
(panel at root, API under `/api`; `/docs` and `/admin/queues` stay backend).
NestJS 11 + Prisma 7 (Postgres, `citext`) + Redis/BullMQ. Package manager: pnpm.

## Architecture decisions (settled — don't re-litigate)

- **Hybrid auth**: clients authenticate with Redis-backed sessions (httpOnly
  cookies); `POST /app/token` (app-key + session) exchanges a session for a
  short-lived HS256 JWT that internal services verify offline with
  `AUTH_SECRET`. Tokens are app-scoped: `aud` is the issuing app's id and
  each app must reject other audiences.
- **App registry & per-app access**: downstream apps register in the `apps`
  table and authenticate server-to-server with an `X-App-Key` (sha256 hash
  stored). Public apps accept any zar user; private apps require an
  `AppAccess` grant (existing user, or a pre-authorized email that converts
  to a user grant when that email signs up through the app —
  `POST /app/sign-up`). One central account works across all zar apps; each
  app keeps its own per-user data keyed by the JWT `sub`.
- **Roles are central, permissions are per-service**: only `USER`/`ADMIN` roles
  live here. Each downstream service maps roles to its own permissions. This
  service's own auth-scoped permissions (e.g. `auth.signin`, `auth.signup`)
  are in `src/auth/permissions.ts`, enforced via `@RequirePermissions()`.
- **Sign-up gating**: `AppSettings.signupEnabled` (default false) governs
  direct sign-up on auth.zar.mx only; app-mediated sign-up is governed per
  app (public flag / access grants). The old email whitelist was replaced by
  per-app grants. Disabling a user blocks sign-in and destroys all their
  sessions.
- **Audit trail**: `AuthEvent` records auth events with no FK to users
  (rows must survive user changes; failed sign-ins may not resolve to a user).
- **Admin bootstrap**: on startup, creates the admin from env and queues a
  set-password invite. Deliberately does NOT auto-resend if the password was
  never set (a crash-looping server would spam and blacklist the sender);
  recovery is via the password-recover flow.
- **Email**: Resend, queued through BullMQ. In dev, emails are logged
  (`[mail:log]`) instead of sent. Bull Board at `/admin/queues` is protected
  by our own session auth (any ADMIN), not basic auth.
- **Language**: English is the default everywhere (panel, API errors, emails).
  Sign-up accepts an optional `lang` (`en`/`es`) stored as `User.locale`;
  all emails to that user render in it. User-facing API error messages are
  translated by `AllExceptionsFilter` via the `src/common/i18n.ts` catalog
  (keyed by the exact English text) when the request carries `X-Lang: es` —
  consumer apps set that header per page language; the panel never sends it,
  so the admin UI stays English.

## Panel (`panel/`)

Plain standalone Vite + React project — intentionally NOT a pnpm workspace
(Diego dislikes monorepo scaffolding). Install deps with `pnpm add` inside
`panel/`. Built `panel/dist` is served by Nest at `/`; `pnpm panel:dev` runs
Vite at :5173 proxying `/api` to :3000. Frontend styling is being redone from
scratch — don't reintroduce old styles or routes.

## Commands

- `pnpm dev` — one-command dev: starts docker postgres+redis, then API + panel
  concurrently.
- `pnpm format` — Biome (the formatter/linter; no ESLint/Prettier).
- `pnpm test` / `pnpm test:e2e` — Jest.
- `pnpm migrate:dev` — Prisma migrations (schema at `src/prisma/schema.prisma`,
  client generated into `src/prisma/generated/`).
- `pnpm openapi:export` — regenerates `openapi.json`; never edit it by hand.
  Run it after changing routes or DTOs, and keep the Bruno collection in
  `bruno/` in sync with route changes.

## Conventions

- `.env.example` keeps placeholder values only (`domain.tld`, `change-me`);
  real values live in `.env`. Every var carries a comment saying what it's for.
- `@/*` path alias maps to `src/*` (API) and `panel/src/*` (panel).
- Startup failures (Postgres/Redis down) go through
  `src/common/utils/startup-error.ts` for friendly messages — keep new
  connection errors consistent with that.
- User-facing emails are in Spanish.
