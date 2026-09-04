# TaskFlow

TaskFlow là ứng dụng quản lý công việc nhóm với hai giao diện chính:
- Admin: dashboard, board, projects, members, reports, settings
- Member: my tasks, time tracking, projects, team, notifications, profile

## Cấu trúc repo

- `src/` – source code ứng dụng
  - `app/` – route, layout, page chính
  - `components/` – UI và view components được phân theo admin/member/layout/ui
  - `config/` – cấu hình môi trường và biến runtime
  - `constants/` – hằng số ứng dụng
  - `hooks/` – custom hooks
  - `lib/` – helper, DB, auth utilities
  - `stores/` – Zustand store
  - `types/` – shared type definitions
- `prisma/` – Prisma schema và seed data
- `public/` – static assets
- `scripts/` – scripts chạy dev / server
- `Caddyfile` – cấu hình reverse proxy
- `components.json` – cấu hình shadcn/ui
- `render.yaml` – cấu hình deploy trên Render
- `vercel.json` – cấu hình deploy trên Vercel

## Chạy dự án

1. Cài dependencies:
   ```bash
   npm install
   ```
2. Tạo file `.env` dựa trên `.env.example`
3. Sinh Prisma client:
   ```bash
   npm run db:generate
   ```
4. Đồng bộ schema với DB:
   ```bash
   npm run db:push
   ```
5. Khởi chạy môi trường dev:
   ```bash
   npm run dev
   ```

## Scripts quan trọng

- `npm run dev` – chạy ứng dụng Next.js ở môi trường phát triển
- `npm run build` – build production
- `npm run start` – chạy phiên bản production
- `npm run lint` – kiểm tra lint
- `npm run db:push` – đồng bộ schema Prisma với PostgreSQL
- `npm run db:generate` – sinh Prisma client
- `npm run db:seed` – chạy seed data

## Môi trường

Dùng file `.env` theo mẫu `.env.example`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taskflow?schema=public"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-strong-random-secret"
```

## Deploy

### Render
- Tạo Web Service trên Render
- Dùng file [render.yaml](render.yaml) hoặc cấu hình thủ công:
  - Build Command: `npm install && npx prisma generate && npm run build`
  - Start Command: `npm run start`
- Cung cấp biến môi trường: `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`

### Vercel
- Import repo vào Vercel
- Thiết lập environment variables tương tự
- Build command sẽ auto-detect Next.js
- Có thể dùng file [vercel.json](vercel.json) để định nghĩa config deploy nếu cần
