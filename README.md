# TaskFlow

TaskFlow là ứng dụng quản lý công việc nhóm với hai giao diện chính:
- Admin: dashboard, board, projects, members, reports, settings
- Member: my tasks, time tracking, projects, team, notifications, profile

## Cấu trúc repo

- `src/` – source code ứng dụng
  - `app/` – route, layout, page chính
  - `components/` – UI và view components
  - `hooks/` – custom hooks
  - `lib/` – helper, DB, auth utilities
  - `stores/` – Zustand store
  - `types/` – shared type definitions
- `prisma/` – Prisma schema và seed data
- `public/` – static assets
- `scripts/` – scripts chạy dev / server
- `Caddyfile` – cấu hình reverse proxy
- `components.json` – cấu hình shadcn/ui

## Chạy dự án

1. Cài dependencies:
   ```bash
   bun install
   ```
2. Sinh Prisma client:
   ```bash
   bun run db:generate
   ```
3. Đồng bộ schema với DB:
   ```bash
   bun run db:push
   ```
4. Khởi chạy môi trường dev:
   ```bash
   bun run dev
   ```

## Scripts quan trọng

- `bun run dev` – chạy ứng dụng Next.js ở môi trường phát triển
- `bun run build` – build production
- `bun run start` – chạy phiên bản production
- `bun run lint` – kiểm tra lint

## Môi trường

Tạo file `.env` với biến `DATABASE_URL` theo cấu hình PostgreSQL của bạn.
