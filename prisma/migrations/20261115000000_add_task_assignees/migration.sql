-- Preserve existing assignments while allowing a task to have several members.
CREATE TABLE "task_assignees" (
  "task_id" TEXT NOT NULL,
  "member_id" TEXT NOT NULL,
  CONSTRAINT "task_assignees_pkey" PRIMARY KEY ("task_id", "member_id"),
  CONSTRAINT "task_assignees_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "task_assignees_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "task_assignees_member_id_idx" ON "task_assignees"("member_id");

INSERT INTO "task_assignees" ("task_id", "member_id")
SELECT "id", "assignee_id" FROM "tasks" WHERE "assignee_id" IS NOT NULL;
