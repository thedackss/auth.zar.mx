# zar-auth

Reusable auth microservice for all zar.mx apps, deployed at `auth.zar.mx`
(panel at root, API under `/api`; `/docs` and `/bullmq` stay backend).
NestJS 11 + Prisma 7 (Postgres, `citext`) + Redis/BullMQ. Package manager: pnpm.

## Architecture decisions (settled — don't re-litigate)

- **Hybrid auth**: clients authenticate with Redis-backed sessions (httpOnly
  cookies; `CsrfOriginGuard` rejects cookie-bearing unsafe requests whose
  `Origin` is not the panel, a `CORS_ORIGINS` entry or a registered app, since
  `SameSite=Strict` does not separate `*.zar.mx` hosts from each other); `POST /app/token` (app-key + session) exchanges a session for a
  short-lived HS256 JWT that internal services verify offline with
  `AUTH_SECRET`. Tokens are app-scoped: `aud` is the issuing app's id and
  each app must reject other audiences.
- **App registry & per-app access**: downstream apps register in the `apps`
  table and authenticate server-to-server with an `X-App-Key` (sha256 hash
  stored). Public apps accept any zar user; private apps require an
  `AppAccess` grant (existing user, or a pre-authorized email that converts
  to a user grant when that email signs up through the app —
  `POST /app/sign-up`). One central account works across all zar apps; each
  app keeps its own per-user data keyed by the JWT `sub`. Private apps also
  require a verified email before `POST /app/token` succeeds, because grants
  are keyed by email.
- **App backends proxy for their visitors**: the session cookie is host-only,
  so an app's server calls `/sign-in`, `/app/sign-up` (which also returns a
  session) and `/app/token` on the visitor's behalf. On any request carrying
  a valid `X-App-Key` (resolved globally by `AppKeyExtractGuard`), the
  backend MUST forward the visitor in `X-Client-IP` and `X-Client-User-Agent`;
  `common/client-ip.ts` uses them for rate limiting and audit rows instead of
  the backend's own address. Only apps flagged `confidential` (server-side
  key) are trusted for this; a key that ships in a browser/native bundle
  (nomi dashboard today) is public, so its forwarded headers are ignored.
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
  set-password invite. If the password is still unset on later startups it
  re-sends the invite at most once per 24h (Redis SET NX cooldown), so a
  crash-looping server cannot spam and blacklist the sender; an immediate
  resend is available via the password-recover flow.
- **Email**: Resend, queued through BullMQ. In dev, emails are logged
  (`[mail:log]`) instead of sent. Bull Board at `/bullmq` is protected
  by our own session auth (any ADMIN), not basic auth.
- **Language**: English is the default everywhere (panel, API errors, emails).
  Sign-up accepts an optional `lang` (`en`/`es`) stored as `User.locale`;
  all emails to that user render in it. User-facing API error messages are
  translated by `AllExceptionsFilter` via the `src/common/i18n.ts` catalog
  (keyed by the exact English text) when the request carries `X-Lang: es` —
  consumer apps set that header per page language; the panel never sends it,
  so the admin UI stays English.

- **OAuth authorization code + PKCE** (`src/oauth/`, GitHub issue #2): for
  public clients (native apps, web apps on other domains) that cannot send
  the first-party session cookie or keep a secret. `App.redirectUris` (exact
  match, https or custom scheme). Panel `/authorize` validates via
  `GET /app/authorize-check`, then `POST /app/authorize` (session) issues a
  60s single-use code in Redis bound to app, user, redirect URI and S256
  challenge. `POST /app/oauth/token` redeems it (`authorization_code`) or
  rotates a refresh token (`refresh_token`); refresh tokens are opaque,
  hashed in `app_refresh_tokens`, one family per device, sliding 90d expiry,
  and presenting a superseded token revokes the family
  (`APP_REFRESH_REUSE_DETECTED`). Access tokens from this flow live
  `OAUTH_ACCESS_TTL_SECONDS` (15 min) instead of 60s. Disabling a user,
  revoking an app or removing a grant revokes the matching refresh tokens
  (`RefreshTokensModule`, imported by Apps/Users to avoid a cycle). Users see
  and revoke their app sign-ins on the account page (`/app/oauth/sessions`).
  No `X-App-Key` on these endpoints: PKCE replaces the client secret.
- **Contact relay** (`src/contact/`): `POST /contact` with an app key stores a
  contact-form submission (`contact_messages`) and queues an email to
  `CONTACT_TO` (fallback `ADMIN_EMAIL`) with reply-to the sender. Throttled
  per visitor via `X-Client-IP`; `website` is a honeypot field. Admins read
  and mark messages in the panel's "messages" tab (`contact.read`). This is
  the "global zar API" zar.software was waiting for; if more non-auth
  endpoints appear, lift the module into its own service.

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
- User-facing emails and errors default to English and render in Spanish
  for users with `locale: es` (or requests carrying `X-Lang: es`).
