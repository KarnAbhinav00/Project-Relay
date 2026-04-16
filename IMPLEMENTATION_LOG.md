# Implementation Log

Date: 2026-04-16

## Session Start
- Received instruction to proceed through all roadmap phases and log all work.
- Execution mode: phased implementation with in-repo logging.

## Phase Progress

### P0 - Stop-the-bleed
- Added production-safe env loading and fail-fast JWT checks in `backend/src/config/env.js`.
- Tightened security headers and wired auth-specific rate limiter in `backend/src/app.js`.
- Removed hardcoded frontend backend URL injection and disabled PWA in dev in `frontend/next.config.js`.
- Sanitized committed data in `backend/data/store.json`.
- Updated `.env.example` files to safe placeholders.

### P1 - Data and API correctness
- Replaced fake file-based Prisma shim with real Prisma Client in `backend/src/lib/prisma.js`.
- Expanded Prisma schema to include app fields and room roles in `backend/prisma/schema.prisma`.
- Added missing delete APIs for conversations and messages in `backend/src/routes/chat.routes.js`.
- Added pagination for conversations/messages and improved payload validation.
- Fixed profile-update semantics to avoid accidental blank overwrites in `frontend/src/components/ChatApp.jsx`.

### P2 - Security hardening
- Added adaptive login lockout/backoff in `backend/src/routes/auth.routes.js`.
- Added structured auth audit events via `backend/src/lib/logger.js` integration.
- Kept credentialed API fetch enabled for migration-ready hardened auth mode in `frontend/src/lib/api.js`.

### P3 - Realtime reliability
- Added socket message ack handling and client message idempotency in `backend/src/socket/index.js` and `frontend/src/components/ChatApp.jsx`.
- Added reconnect sync event (`messages:sync`) and client reconciliation logic.

### P4 - Quality gates and CI/CD
- Added root/backend/frontend lint and test scripts in package manifests.
- Added backend smoke tests in `backend/tests/health.test.js`.
- Added CI workflow in `.github/workflows/ci.yml`.

### P5 - Observability and ops
- Added request-id propagation and structured request logs in `backend/src/app.js`.
- Added readiness endpoint backed by DB query in `backend/src/app.js`.
- Added structured application logger (`backend/src/lib/logger.js`).
- Added operations runbook and SLO/backup guidance in `OPERATIONS.md`.

### P6 - Scale and product completeness
- Added group role model scaffolding in Prisma schema and invite authorization in chat routes.
- Added message retention configuration and query enforcement (`backend/src/config/retention.js`, chat routes).
- Added conversation/message pagination support with cursor-based responses.

## Verification
- Installed dependencies at root/backend/frontend and generated Prisma client.
- Applied DB migration `20260415203939_production_hardening` successfully.
- Lint passes (clean, no warnings).
- Tests pass (`backend/tests/health.test.js`: 2/2).
- Frontend production build passes.
- Re-ran `npm run lint ; npm run test ; npm run build` after final auth/UI/CI updates: all successful.

## Finalization Pass (UI/UX + Publish Readiness)
- Implemented cookie-based auth support with secure HttpOnly cookie (`relay_auth`) while keeping bearer compatibility:
	- `backend/src/routes/auth.routes.js`
	- `backend/src/middleware/auth.js`
	- `backend/src/socket/index.js`
	- `backend/src/lib/cookies.js`
	- `backend/src/config/env.js`
- Added logout endpoint and client-side logout flow to clear server auth cookie.
- Removed frontend auth reliance on localStorage token restore; app now boots from `/api/auth/me` cookie session.
- Improved mobile responsiveness with sidebar section switcher in `frontend/src/components/ChatApp.jsx`.
- Added image `alt` attributes across chat UI and resolved prior lint warnings.
- Disabled `@next/next/no-img-element` for dynamic external avatars in `frontend/.eslintrc.json`.
- Hardened socket CORS origin handling and removed debug logs in `backend/src/server.js`.
- Updated `backend/.env.example` with `AUTH_COOKIE_SAMESITE` and `MESSAGE_RETENTION_DAYS`.
- Marked roadmap phase checklist complete in `PRODUCTION_ROADMAP.md`.

### Security/dependency notes
- `npm audit` reports vulnerabilities in transitive dependencies; follow-up hardening step is required (`npm audit fix` / dependency bump strategy).

## Runtime Hotfixes (Local Connectivity)
- Fixed local CORS connectivity for frontend on `http://localhost:3001` by:
	- extending fallback trusted origins in `backend/src/config/env.js`;
	- adding secure localhost-origin allowance in non-production only in `backend/src/app.js`.
- Verified CORS preflight from `http://localhost:3001` to `http://localhost:5000/api/auth/me` returns `204` with `Access-Control-Allow-Origin`.
- Removed hydration-risky localStorage reads during initial render in `frontend/src/components/ChatApp.jsx` by moving settings hydration into mount-time effects.
- Added `suppressHydrationWarning` on root html in `frontend/src/app/layout.js` to avoid false-positive mismatch noise from browser extension-injected attributes.

## Runtime Hotfixes (Styling + Deployment)
- Diagnosed missing styling root cause as frontend static runtime assets returning `404` (`/_next/static/css/app/layout.css`, `/_next/static/chunks/main-app.js`).
- Fixed dev asset resolution by disabling `next-pwa` wrapping in development (`frontend/next.config.js`).
- Fixed production build blocker (`PageNotFoundError: /_document`) by removing `next-pwa` wrapping from active Next config.
- Updated Render service name to deployment-safe format in `render.yaml` (`project-relay`).
- Revalidated local runtime after patch:
	- Frontend root `200`.
	- Frontend stylesheet and core chunks `200`.
	- Backend health `200`.
	- Backend CORS preflight from `http://localhost:3001` to `POST /api/auth/login` returns `204` with expected allow-origin/credentials headers.
- Re-ran full project checks post-fix: `npm run lint`, `npm run test`, and `npm run build` all successful.

## Runtime Hotfixes (Production Origin Wiring)
- Found deployed frontend defaulting to same-origin API/socket URLs in production, which breaks the split Render setup.
- Updated frontend API/socket clients to default to the live backend origin `https://project-relay-backends-for-main.onrender.com` when no public env override is provided.
- Added the production frontend origin `https://project-relay.onrender.com` to Render CORS allowlist config in `render.yaml` for future blueprint-based deploys.

## Runtime Hotfixes (CORS Normalization)
- Normalized configured and incoming origins in `backend/src/config/env.js` and `backend/src/app.js` so a trailing slash in Render env values cannot break CORS preflight.
