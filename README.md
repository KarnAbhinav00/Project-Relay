# Project Relay

Project Relay is a full-stack real-time chat platform with a Next.js frontend, Express + Socket.IO backend, and Prisma-powered persistence.

## Features

- Real-time messaging over WebSockets (Socket.IO)
- JWT-based authentication with secure cookie support
- Direct and group conversations
- Message delivery idempotency via `clientMessageId`
- CORS and security hardening (Helmet + rate limits)
- Prisma data layer with migrations
- Render-ready deployment config

## Tech Stack

- Frontend: Next.js 15, React 19
- Backend: Express, Socket.IO
- Database: Prisma (SQLite in current config)
- Tooling: ESLint, Node test runner, nodemon

## Repository Structure

```text
backend/     API, auth, chat routes, socket handlers, Prisma
frontend/    Next.js UI and client logic
.github/     CI workflow
render.yaml  Render deployment blueprint
```

## Prerequisites

- Node.js 18+
- npm 9+

## Local Development

1. Install dependencies:

```bash
npm run install:all
```

2. Create backend env file from example:

```bash
cp backend/.env.example backend/.env
```

3. (Optional) Create frontend local env file:

```bash
cp frontend/.env.example frontend/.env.local
```

4. Start backend + frontend together:

```bash
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:3000` (or `3001` if 3000 is occupied)
- Backend: `http://localhost:5000`

## Environment Variables

### Backend (`backend/.env`)

- `PORT` (default: `5000`)
- `FRONTEND_URL`
- `DATABASE_URL`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`
- `AUTH_COOKIE_SAMESITE`
- `MESSAGE_RETENTION_DAYS`

### Frontend (`frontend/.env.local`)

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SOCKET_URL`

## Useful Scripts

From repository root:

- `npm run dev` - start frontend + backend
- `npm run lint` - run backend syntax checks + frontend lint
- `npm run test` - run backend tests + frontend placeholder tests
- `npm run build` - build frontend production bundle
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:migrate` - run Prisma dev migrations

## Deployment (Render)

The repo includes `render.yaml` for deployment.

Current blueprint behavior:

- Runs as a Node web service
- Installs root/backend/frontend dependencies
- Builds frontend
- Starts backend in production mode (`start:prod`)

## Security Notes

- Set a strong `JWT_SECRET` in production
- Keep `ALLOWED_ORIGINS` strict and explicit
- Do not commit `.env` files or local DB artifacts

## Additional Project Docs

- `PRODUCTION_ROADMAP.md`
- `IMPLEMENTATION_LOG.md`
- `OPERATIONS.md`

## License

See `LICENSE`.
