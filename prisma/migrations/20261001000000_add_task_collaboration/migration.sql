-- Evolve a task from a simple card into a durable collaboration workspace.
ALTER TABLE "tasks"
  ADD COLUMN "story_points" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "review_notes" TEXT,
  ADD COLUMN "review_status" TEXT;

CREATE TABLE "task_comments" (
  "id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "task_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,

  CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_checklist_items" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "is_completed" BOOLEAN NOT NULL DEFAULT false,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "task_id" TEXT NOT NULL,

  CONSTRAINT "task_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_activities" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "details" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "task_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,

  CONSTRAINT "task_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tasks_project_id_idx" ON "tasks"("project_id");
CREATE INDEX "tasks_assignee_id_status_idx" ON "tasks"("assignee_id", "status");
CREATE INDEX "task_comments_task_id_created_at_idx" ON "task_comments"("task_id", "created_at");
CREATE INDEX "task_checklist_items_task_id_position_idx" ON "task_checklist_items"("task_id", "position");
CREATE INDEX "task_activities_task_id_created_at_idx" ON "task_activities"("task_id", "created_at");

ALTER TABLE "task_comments"
  ADD CONSTRAINT "task_comments_task_id_fkey"
  FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_comments"
  ADD CONSTRAINT "task_comments_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_checklist_items"
  ADD CONSTRAINT "task_checklist_items_task_id_fkey"
  FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_activities"
  ADD CONSTRAINT "task_activities_task_id_fkey"
  FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_activities"
  ADD CONSTRAINT "task_activities_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
