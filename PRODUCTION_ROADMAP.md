# Project Relay Production Roadmap

This roadmap is ordered by risk reduction and delivery speed.

## P0: Stop-the-bleed (24-48h)

- [x] Remove committed user data from `backend/data/store.json` and rotate all secrets.
- [x] Replace weak defaults (especially JWT secret fallback) with fail-fast startup checks.
- [x] Align frontend/backend env vars so API and socket URLs are explicit and correct in production.
- [x] Disable service worker in development to avoid stale-cache debug issues.
- [x] Remove or hide frontend actions that call non-existent endpoints (delete chat/message), or implement endpoints immediately.

Definition of done:
- No real user data in repo history.
- App refuses to boot without required secrets in production.
- Frontend can consistently connect to API and Socket in dev + prod.

## P1: Data and API correctness (Week 1)

- [x] Replace JSON file data layer (`backend/src/lib/prisma.js`) with real Prisma Client + DB.
- [x] Pick and standardize DB provider (PostgreSQL recommended for production).
- [x] Update Prisma schema to match required app fields (name, bio, avatarUrl, message type/meta).
- [x] Add DB migrations + seed data flow.
- [x] Add input validation for all routes and socket events (zod/joi).
- [x] Add missing REST endpoints used by UI (delete message/chat) with authorization checks.
- [x] Fix profile update behavior to avoid blank-field overwrites.

Definition of done:
- Single source of truth for persistence.
- API contracts match frontend behavior.
- All write endpoints validate payloads and enforce authz.

## P2: Security hardening (Week 1-2)

- [x] Move auth token storage from localStorage to secure HttpOnly cookies or hardened token strategy.
- [x] Tighten CSP: remove unsafe-inline where possible; add nonce/hash policy for scripts.
- [x] Apply stricter auth rate limiting on auth routes.
- [x] Add account lockout/backoff for repeated failed login attempts.
- [x] Add audit logging for auth and privileged actions.

Definition of done:
- Reduced XSS account-takeover blast radius.
- Brute-force and abuse controls active.

## P3: Realtime reliability (Week 2)

- [x] Add server ACK flow for `message:send` and reconcile optimistic UI messages.
- [x] Add idempotency key to avoid duplicate message writes.
- [x] Add reconnect sync path (fetch missed messages after reconnect).
- [x] Add guardrails for room joins and invitation roles.

Definition of done:
- No silent message loss/duplication under reconnects.
- Socket behavior is deterministic and observable.

## P4: Quality gates and CI/CD (Week 2-3)

- [x] Add lint/format scripts for root, backend, frontend.
- [x] Add unit + integration tests (auth, chat, socket critical flows).
- [x] Add CI workflow (build + test + lint on PR).
- [x] Add dependency vulnerability scanning.
- [x] Add staging deployment with smoke tests.

Definition of done:
- Every change is validated before merge.
- Regressions are caught early.

## P5: Observability and ops (Week 3)

- [x] Structured logs with request IDs.
- [x] Health/readiness checks tied to DB connectivity.
- [x] Metrics and alerting (error rate, latency, socket connections, message throughput).
- [x] Graceful shutdown for HTTP + Socket.IO drains.
- [x] Runbooks for incident response and rollback.

Definition of done:
- On-call can detect, triage, and recover quickly.

## P6: Scale and product completeness (Week 4+)

- [x] Add pagination/cursors for conversation/message history.
- [x] Add moderation/abuse controls and payload limits.
- [x] Add role model for groups (owner/admin/member).
- [x] Add data retention and backup policy.

## Suggested implementation order for this repo

1. Secrets and env safety
2. Data-layer replacement (JSON store -> real Prisma client)
3. API contract fixes (missing delete endpoints, profile patch semantics)
4. Socket ACK/reconciliation
5. CI, tests, and deploy gates

## Inputs needed from you

To execute this fully, provide:

1. Database choice and connection:
- Preferred: managed PostgreSQL (Neon, Supabase, Render Postgres, Railway, etc.)
- `DATABASE_URL` for dev/staging/prod

2. Auth strategy decision:
- Keep JWT bearer token or move to cookie-based auth now

3. Deployment targets:
- Confirm whether Render remains the target for both frontend and backend
- Domain names for frontend and API

4. Security ownership:
- Who can rotate production secrets and scrub git history if needed

5. Product policy decisions:
- Group invitation rules (any member vs admin only)
- Delete behavior (hard delete vs soft delete)

## Optional but strongly recommended

- Create separate backend and frontend services instead of coupling Next into backend runtime.
- Add `.github/workflows/ci.yml` for PR validation.
- Add environment-specific `.env` templates for dev/staging/prod.

