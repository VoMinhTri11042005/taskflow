import { Prisma } from '@prisma/client'

/** Remove access and keep the legacy primary assignee in sync, within the caller's transaction. */
export async function removeTaskAssignee(
  tx: Prisma.TransactionClient,
  memberId: string,
  projectIds?: string[],
) {
  if (projectIds && projectIds.length === 0) return
  const taskScope = projectIds ? { projectId: { in: projectIds } } : {}
  // Bump and lock every affected task before changing its assignments. This
  // includes secondary assignees: their removal must invalidate editor forms
  // just as removing the legacy primary assignee does. PostgreSQL performs the
  // increment under the row lock, even for two changes in one millisecond.
  const projectFilter = projectIds
    ? Prisma.sql`AND t."project_id" IN (${Prisma.join(projectIds)})`
    : Prisma.empty
  const affectedTasks = await tx.$queryRaw<Array<{ id: string; assigneeId: string | null; updatedAt: Date }>>(Prisma.sql`
    UPDATE "tasks" AS t
    SET "updated_at" = GREATEST(t."updated_at" + INTERVAL '1 millisecond', CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
    WHERE (t."assignee_id" = ${memberId} OR EXISTS (
      SELECT 1 FROM "task_assignees" a WHERE a."task_id" = t."id" AND a."member_id" = ${memberId}
    )) ${projectFilter}
    RETURNING t."id", t."assignee_id" AS "assigneeId", t."updated_at" AS "updatedAt"
  `)
  await tx.taskAssignee.deleteMany({
    where: { memberId, ...(projectIds ? { task: taskScope } : {}) },
  })
  for (const task of affectedTasks) {
    if (task.assigneeId !== memberId) continue
    const next = await tx.taskAssignee.findFirst({
      where: { taskId: task.id },
      orderBy: { memberId: 'asc' },
      select: { memberId: true },
    })
    await tx.task.updateMany({
      where: { id: task.id, assigneeId: memberId },
      data: { assigneeId: next?.memberId ?? null, updatedAt: task.updatedAt },
    })
  }
}
