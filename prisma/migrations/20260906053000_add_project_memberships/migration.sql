-- A Member can belong to multiple independent projects owned by a Leader.
CREATE TABLE "project_members" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_invites" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "use_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "project_id" TEXT NOT NULL,

    CONSTRAINT "project_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");
CREATE INDEX "project_members_user_id_status_idx" ON "project_members"("user_id", "status");
CREATE UNIQUE INDEX "project_invites_token_key" ON "project_invites"("token");
CREATE INDEX "project_invites_project_id_is_active_idx" ON "project_invites"("project_id", "is_active");

ALTER TABLE "project_members"
  ADD CONSTRAINT "project_members_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_members"
  ADD CONSTRAINT "project_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_invites"
  ADD CONSTRAINT "project_invites_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Legacy installs predate users.leader_id. Infer that relationship only where
-- the Member's assigned tasks all point to one unambiguous active Leader;
-- ambiguous data is intentionally left for an explicit Leader decision.
UPDATE "users" AS "users"
SET "leader_id" = "inferred"."leader_id"
FROM (
  SELECT "users"."id", MIN("projects"."leader_id") AS "leader_id"
  FROM "tasks"
  INNER JOIN "team_members" ON "team_members"."id" = "tasks"."assignee_id"
  INNER JOIN "users" ON "users"."email" = "team_members"."email"
  INNER JOIN "projects" ON "projects"."id" = "tasks"."project_id"
  WHERE "users"."role" = 'member'
    AND "users"."status" = 'approved'
    AND "users"."leader_id" IS NULL
    AND "projects"."leader_id" IS NOT NULL
  GROUP BY "users"."id"
  HAVING COUNT(DISTINCT "projects"."leader_id") = 1
) AS "inferred"
WHERE "users"."id" = "inferred"."id";

-- Preserve access for legacy Members who already have an assigned task.
INSERT INTO "project_members" ("id", "status", "created_at", "updated_at", "project_id", "user_id")
SELECT
  'legacy_' || md5("tasks"."project_id" || ':' || "users"."id"),
  'approved',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  "tasks"."project_id",
  "users"."id"
FROM "tasks"
INNER JOIN "team_members" ON "team_members"."id" = "tasks"."assignee_id"
INNER JOIN "users" ON "users"."email" = "team_members"."email" AND "users"."role" = 'member'
INNER JOIN "projects" ON "projects"."id" = "tasks"."project_id"
WHERE "tasks"."assignee_id" IS NOT NULL
  AND "users"."status" = 'approved'
  AND "users"."leader_id" = "projects"."leader_id"
ON CONFLICT ("project_id", "user_id") DO NOTHING;
