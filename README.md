<<<<<<< HEAD
﻿# TaskFlow

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
- Build script trong repo Ä‘Ã£ bao gá»“m `prisma db push` Ä‘á»ƒ táº¡o schema khi deploy
- NÃªn cháº¡y má»™t láº§n ban Ä‘áº§u: `npx prisma db push` vÃ  `npx prisma db seed`
- CÃ³ thá»ƒ dÃ¹ng file [vercel.json](vercel.json) Ä‘á»ƒ Ä‘á»‹nh nghÄ©a config deploy náº¿u cáº§n

> Lỗi `The table public.users does not exist` thÆ°á»ng xuáº¥t hiá»‡n khi DB production chÆ°a Ä‘Æ°á»£c sync. CÃ n chÃ­nh `DATABASE_URL` vÃ  cháº¡y `prisma db push` trÆ°á»›c khi user login/đăng ký.

=======
﻿# 🚀 TaskFlow - Team & Task Management Platform

Ứng dụng web quản lý công việc và dự án nhóm hiện đại, hỗ trợ 2 giao diện độc lập (**Quản trị viên** & **Thành viên**), tích hợp tài liệu Google Workspace, chấm công thời gian thực và biểu quyết nội bộ.

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

- **Frontend:** [Next.js](https://nextjs.org/) (App Router, React 19, TypeScript)
- **Styling & UI:** [Tailwind CSS v4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/) / Radix UI, Lucide Icons, Framer Motion
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)
- **Database & ORM:** [PostgreSQL](https://www.postgresql.org/) với [Prisma ORM](https://www.prisma.io/)
- **Xác thực (Auth):** Cookie-based session, bảo mật mật khẩu với cryptjs
- **Containerization:** [Docker](https://www.docker.com/) & Docker Compose

---

## 📁 Cấu trúc thư mục dự án

`	ext
taskflow/
├── prisma/
│   ├── schema.prisma          # Định nghĩa cấu trúc Database (Users, Tasks, Projects, TimeLogs...)
│   └── seed.ts                # Dữ liệu khởi tạo mẫu
├── public/                    # Tài nguyên tĩnh (images, icons, fonts)
├── src/
│   ├── app/
│   │   ├── api/               # Next.js API Routes (auth, tasks, projects, polls, time-logs...)
│   │   ├── globals.css        # Cấu hình CSS toàn cục & Tailwind theme
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Entry page điều hướng theo Phân quyền & Views
│   ├── components/
│   │   ├── auth/              # Form đăng nhập (có quick-fill tài khoản demo)
│   │   ├── layout/            # Sidebar Admin & Member (hỗ trợ mobile drawer)
│   │   ├── ui/                # UI Components (Button, Dialog, Card, Tabs, Table...)
│   │   └── views/             # Giao diện chức năng chính
│   │       ├── admin/         # Giao diện Quản trị (Reports, Activity, Polls, Settings)
│   │       ├── member/        # Giao diện Thành viên (MyTasks, TimeTracking, Polls, Profile)
│   │       ├── board-view.tsx # Bảng Kanban
│   │       ├── dashboard-view.tsx # Thống kê tổng quan
│   │       ├── members-view.tsx   # Quản lý nhân sự
│   │       └── projects-view.tsx  # Quản lý dự án
│   ├── hooks/                 # Custom React Hooks (use-mobile, use-toast)
│   ├── lib/                   # Database client & utilities
│   ├── stores/                # Zustand global state management
│   └── types/                 # TypeScript interfaces & types
├── .dockerignore              # Danh sách loại trừ khi build Docker
├── .env.example               # Mẫu biến môi trường
├── docker-compose.yml         # Cấu hình Docker Compose (App + PostgreSQL)
├── Dockerfile                 # Multi-stage Docker build cho Next.js Standalone
├── package.json               # Danh sách thư viện và scripts
└── README.md                  # Tài liệu dự án
`

---

## ⚡ Hướng dẫn cài đặt & Chạy ứng dụng

### 1. Chạy với Docker (Khuyên dùng - Nhanh nhất)

Chỉ cần 1 lệnh duy nhất để khởi động cả Ứng dụng lẫn Database PostgreSQL:

`ash
# Khởi chạy container
docker compose up -d --build

# Khởi tạo Database schema và nạp dữ liệu mẫu
="postgresql://taskflow_user:taskflow_password_secret@localhost:5432/taskflow_db?schema=public"
npx prisma db push
npm run seed  # hoặc npx tsx prisma/seed.ts
`

Truy cập ứng dụng tại: http://localhost:3002 (hoặc cổng cấu hình trong docker-compose.yml).

---

### 2. Chạy môi trường Local Development

1. **Cài đặt thư viện phụ thuộc:**
   `ash
   bun install
   # hoặc
   npm install
   `

2. **Cấu hình biến môi trường:**
   Tạo file .env từ .env.example:
   `env
   DATABASE_URL="postgresql://user:password@localhost:5432/taskflow_db?schema=public"
   PORT=3000
   `

3. **Khởi tạo Database:**
   `ash
   bunx prisma db push
   bun run prisma/seed.ts
   `

4. **Khởi động Dev Server:**
   `ash
   bun run dev
   # hoặc
   npm run dev
   `
   Mở trình duyệt tại: http://localhost:3000.

---

## 👥 Tài khoản Demo

Sau khi chạy seed, hệ thống có sẵn các tài khoản để thử nghiệm:

| Vai trò | Email | Mật khẩu | Mô tả |
| :--- | :--- | :--- | :--- |
| **Admin** | dmin@taskflow.vn | dmin123 | Toàn quyền quản trị: Dashboard, Kanban, Thành viên, Báo cáo, Khảo sát, Cài đặt |
| **Member** | lan@taskflow.vn | member123 | Thành viên: Công việc cá nhân, Chấm công, Dự án, Biểu quyết, Hồ sơ |
| **Member** | minh@taskflow.vn | member123 | Thành viên nhóm |
| **Member** | hoa@taskflow.vn | member123 | Thành viên nhóm |

---

## 🚀 Hướng dẫn Triển khai (Deploy)

- **Vercel (Serverless):** Kết nối repository với Vercel, cấu hình biến DATABASE_URL từ Neon.tech / Supabase.
- **VPS / Docker (Self-hosted):** Sử dụng docker-compose.yml có sẵn để chạy production container.
>>>>>>> 335a714 (refactor: standardize project structure, add docker & ci workflows, optimize for Vercel and Neon)
