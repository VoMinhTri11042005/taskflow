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

To initialise only the single administrator account without deleting existing data,
add `DATABASE_URL`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` to `.env` and run
`npm run setup:admin`. Use the same database URL in Vercel and run this command
once from a trusted machine before the first production login.
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
- Render/Vercel: configure `DATABASE_URL` and a long random `SESSION_SECRET`, then
  deploy from `main`. The build is network-independent (fonts are system fonts),
  and the existing Vercel adapter no longer expects standalone tracing. Run
  `npm run setup:admin` once against the production database before signing in.

Never commit `.env` or production credentials. For production schema changes, use reviewed Prisma migrations rather than `db:push`.

### One server for multiple devices (LAN)

Run Docker Compose on **one** server only. Every other computer must open the
same browser address; do not run a separate Compose stack on each computer,
because each stack creates its own PostgreSQL volume and therefore its own
accounts, approvals, and projects.

Before the first build, add these values to the server's uncommitted `.env`:

```dotenv
# Generate one with:
# node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
SESSION_SECRET="replace-with-one-long-random-value"

# The address that other devices can actually reach. Do not use localhost here.
NEXT_PUBLIC_APP_URL="http://192.168.1.10:3002"

# Only when serving a trusted private LAN over HTTP. Use HTTPS for public use.
SESSION_COOKIE_SECURE="false"
```

Then run `docker compose up --build` on the server, allow inbound TCP port
`3002` through the server firewall, and have everyone browse
`http://192.168.1.10:3002` (replace the address with the server's LAN IP or
internal DNS name). `NEXT_PUBLIC_APP_URL` is compiled into invitation QR codes,
so rebuild the image after changing it. For an internet-facing deployment, put
the app behind HTTPS and leave `SESSION_COOKIE_SECURE` blank (or set it to
`true`).

Approving a Member account allows that person to sign in, but does not
automatically add them to a project. Add the approved Member from the
project's **Thành viên** screen or use that project's QR/link invite.

## Project membership and invitations

- A Leader can own many projects. `ProjectMember` records are the source of truth
  for which Member belongs to which project; a Member may belong to several
  projects from the same Leader.
- Add an approved Member from the project&apos;s **Thành viên** action, or create a
  QR/link for that specific project. A new person registers as pending; an
  existing Member sends a pending join request after opening the link.
- Only the owning Leader can approve a project join request. The generic account
  approval queue deliberately excludes project-link requests, preventing an
  account from being approved without project access.
- Task assignment is validated server-side against the selected project roster.
  Removing or transferring a Member clears their project membership and current
  task assignments safely.
