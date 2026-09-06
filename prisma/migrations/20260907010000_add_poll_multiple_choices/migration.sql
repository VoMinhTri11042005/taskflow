-- Polls created before this migration keep their original single-choice rule.
ALTER TABLE "polls"
  ADD COLUMN "allow_multiple_choices" BOOLEAN NOT NULL DEFAULT false;

-- A participant can now vote once per option. This preserves all existing
-- votes while allowing multi-choice polls to store several options per user.
DROP INDEX IF EXISTS "poll_votes_user_id_poll_id_key";

CREATE UNIQUE INDEX "poll_votes_user_id_option_id_key"
  ON "poll_votes"("user_id", "option_id");

CREATE INDEX "poll_votes_poll_id_user_id_idx"
  ON "poll_votes"("poll_id", "user_id");
