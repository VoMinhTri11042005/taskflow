-- Existing polls cannot safely be associated with a project automatically.
-- Keep the relation nullable during this transition: new polls must select a
-- project in the application, while Leaders can manually classify old polls.
ALTER TABLE "polls" ADD COLUMN "project_id" TEXT;

CREATE INDEX "polls_project_id_status_idx" ON "polls"("project_id", "status");

ALTER TABLE "polls"
  ADD CONSTRAINT "polls_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
