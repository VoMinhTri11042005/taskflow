---
Task ID: 1
Agent: Main
Task: Design and implement team task management app with Google Docs & Sheets integration

Work Log:
- Designed Prisma schema with TeamMember, Project, Task, TaskLink models
- Pushed schema to SQLite database
- Created 9 API route files for full CRUD on all models + stats endpoint
- Built Zustand store for client-side state management
- Created AppSidebar component with navigation and project quick filter
- Created DashboardView with stats cards, progress, priority breakdown, upcoming deadlines, member workload
- Created ProjectsView with CRUD, color picker, archive toggle
- Created BoardView (Kanban) with 4 columns, task CRUD, status change, Google Doc/Sheet link management
- Created MembersView with CRUD, role management, color assignment
- Created main page.tsx with responsive layout, mobile sidebar, sticky footer
- Updated layout.tsx with Vietnamese metadata and Sonner toaster
- Fixed JSX comment syntax issues
- Verified all functionality via Agent Browser

Stage Summary:
- Full task management app with 4 views: Dashboard, Projects, Kanban Board, Members
- Google Docs & Sheets integration via link management on each task
- All CRUD operations verified working
- Responsive design with mobile sidebar overlay
- Lint passes with zero errors
- All API endpoints return 200

---
Task ID: 2
Agent: Main
Task: Migrate from SQLite to PostgreSQL

Work Log:
- Installed embedded-postgres npm package which bundles PG 18.4 binaries
- Initialized PostgreSQL data directory and started server on port 5432
- Created 'taskflow' database
- Updated Prisma schema: provider=postgresql, added @@map for snake_case table/column names, added @map for field names
- Removed @map from relation fields (not supported by Prisma)
- Updated .env with postgres:// connection URL (note: 'postgres://' works, 'postgresql://' has WASM validation bug in Prisma 6.19.2)
- Pushed schema to PostgreSQL - created tables: projects, tasks, team_members, task_links
- Installed pg and @prisma/adapter-pg npm packages
- Found @prisma/adapter-pg causes server crashes, reverted to native PrismaClient
- Configured postgresql.conf with listen_addresses=localhost for TCP connections
- Verified data persistence: created project via UI, confirmed in PostgreSQL via direct SQL query
- All queries now use proper PostgreSQL syntax: "public"."table_name", $1 $2 parameters, snake_case columns

Stage Summary:
- Successfully migrated to PostgreSQL 18.4
- Prisma schema uses @@map for snake_case convention
- Native PrismaClient (no adapter) for stability
- DATABASE_URL=postgres://z@localhost:5432/taskflow
- Lint passes, all APIs return 200, data persists correctly