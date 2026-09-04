# TaskFlow

TaskFlow lÃ  á»©ng dá»¥ng quáº£n lÃ½ cÃ´ng viá»‡c nhÃ³m vá»›i hai giao diá»‡n chÃ­nh:
- Admin: dashboard, board, projects, members, reports, settings
- Member: my tasks, time tracking, projects, team, notifications, profile

## Cáº¥u trÃºc repo

- `src/` â€“ source code á»©ng dá»¥ng
  - `app/` â€“ route, layout, page chÃ­nh
  - `components/` â€“ UI vÃ  view components Ä‘Æ°á»£c phÃ¢n theo admin/member/layout/ui
  - `config/` â€“ cáº¥u hÃ¬nh mÃ´i trÆ°á»ng vÃ  biáº¿n runtime
  - `constants/` â€“ háº±ng sá»‘ á»©ng dá»¥ng
  - `hooks/` â€“ custom hooks
  - `lib/` â€“ helper, DB, auth utilities
  - `stores/` â€“ Zustand store
  - `types/` â€“ shared type definitions
- `prisma/` â€“ Prisma schema vÃ  seed data
- `public/` â€“ static assets
- `scripts/` â€“ scripts cháº¡y dev / server
- `Caddyfile` â€“ cáº¥u hÃ¬nh reverse proxy
- `components.json` â€“ cáº¥u hÃ¬nh shadcn/ui
- `render.yaml` â€“ cáº¥u hÃ¬nh deploy trÃªn Render
- `vercel.json` â€“ cáº¥u hÃ¬nh deploy trÃªn Vercel

## Cháº¡y dá»± Ã¡n

1. CÃ i dependencies:
   ```bash
   npm install
   ```
2. Táº¡o file `.env` dá»±a trÃªn `.env.example`
3. Sinh Prisma client:
   ```bash
   npm run db:generate
   ```
4. Äá»“ng bá»™ schema vá»›i DB:
   ```bash
   npm run db:push
   ```
5. Khá»Ÿi cháº¡y mÃ´i trÆ°á»ng dev:
   ```bash
   npm run dev
   ```

## Scripts quan trá»ng

- `npm run dev` â€“ cháº¡y á»©ng dá»¥ng Next.js á»Ÿ mÃ´i trÆ°á»ng phÃ¡t triá»ƒn
- `npm run build` â€“ build production
- `npm run start` â€“ cháº¡y phiÃªn báº£n production
- `npm run lint` â€“ kiá»ƒm tra lint
- `npm run db:push` â€“ Ä‘á»“ng bá»™ schema Prisma vá»›i PostgreSQL
- `npm run db:generate` â€“ sinh Prisma client
- `npm run db:seed` â€“ cháº¡y seed data

## MÃ´i trÆ°á»ng

DÃ¹ng file `.env` theo máº«u `.env.example`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taskflow?schema=public"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-strong-random-secret"
```

## Deploy

### Render
- Táº¡o Web Service trÃªn Render
- DÃ¹ng file [render.yaml](render.yaml) hoáº·c cáº¥u hÃ¬nh thá»§ cÃ´ng:
  - Build Command: `npm install && npx prisma generate && npm run build`
  - Start Command: `npm run start`
- Cung cáº¥p biáº¿n mÃ´i trÆ°á»ng: `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`

### Vercel
- Import repo vÃ o Vercel
- Thiáº¿t láº­p environment variables tÆ°Æ¡ng tá»±
- Build command sáº½ auto-detect Next.js
- CÃ³ thá»ƒ dÃ¹ng file [vercel.json](vercel.json) Ä‘á»ƒ Ä‘á»‹nh nghÄ©a config deploy náº¿u cáº§n

