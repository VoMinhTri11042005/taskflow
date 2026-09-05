# TaskFlow

TaskFlow is a team task-management application built with Next.js App Router, TypeScript, PostgreSQL, and Prisma.

## Requirements

- Node.js 22 LTS
- PostgreSQL 16 or newer

## Quick start

1. Install dependencies: `npm ci`
2. Copy `.env.example` to `.env` and configure `DATABASE_URL`.
3. Generate Prisma Client: `npm run db:generate`
4. Sync the development schema: `npm run db:push`
5. Optionally load sample data: `npm run db:seed`
6. Start development: `npm run dev`

To initialise only an administrator account without deleting existing data, add
`DATABASE_URL` and `ADMIN_PASSWORD` to `.env` and run `npm run setup:admin`.
The production UI does not expose demo accounts; `npm run db:seed` is for local
sample data only.

The application runs at `http://localhost:3000` by default.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run lint` | Run lint checks |
| `npm run build` | Generate Prisma Client and production build |
| `npm run start` | Start the production build |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:push` | Sync Prisma schema without accepting data loss automatically |
| `npm run db:migrate` | Create a development migration |
| `npm run db:seed` | Load sample data from `prisma/seed.ts` |

## Structure

```text
src/
  app/          # App Router, layout, and API route handlers
  components/   # UI primitives, layouts, views, and auth UI
  hooks/        # Shared React hooks
  lib/          # Prisma client, authentication, and utilities
  stores/       # Zustand client state
  types/        # Shared TypeScript types
prisma/         # Prisma schema and TypeScript seed data
public/         # Static assets
```

## Deployment

- Docker: `docker compose up --build`
- Render/Vercel: configure at least `DATABASE_URL`, then use `npm run build`.

Never commit `.env` or production credentials. For production schema changes, use reviewed Prisma migrations rather than `db:push`.
