-- Link each Member account to the Leader responsible for that team.
ALTER TABLE "users" ADD COLUMN "leader_id" TEXT;

-- Persist revocable invitation links created by Leaders.
CREATE TABLE "member_invites" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "use_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "leader_id" TEXT NOT NULL,

    CONSTRAINT "member_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "member_invites_token_key" ON "member_invites"("token");
CREATE INDEX "users_leader_id_idx" ON "users"("leader_id");
CREATE INDEX "member_invites_leader_id_is_active_idx" ON "member_invites"("leader_id", "is_active");

ALTER TABLE "users"
  ADD CONSTRAINT "users_leader_id_fkey"
  FOREIGN KEY ("leader_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "member_invites"
  ADD CONSTRAINT "member_invites_leader_id_fkey"
  FOREIGN KEY ("leader_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
