# Project Relay Backend

## Run
```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## Stack
- Node.js + Express
- Socket.IO
- PostgreSQL + Prisma