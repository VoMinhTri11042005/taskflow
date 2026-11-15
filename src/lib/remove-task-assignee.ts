import type { Prisma } from '@prisma/client'

/** Remove access and keep the legacy primary assignee in sync, within the caller's transaction. */
export async function removeTaskAssignee(
  tx: Prisma.TransactionClient,
  memberId: string,
  projectIds?: string[],
) {
  if (projectIds && projectIds.length === 0) return
  const taskScope = projectIds ? { projectId: { in: projectIds } } : {}
  const primaryTasks = await tx.task.findMany({
    where: { ...taskScope, assigneeId: memberId },
    select: { id: true },
  })
  await tx.taskAssignee.deleteMany({
    where: { memberId, ...(projectIds ? { task: taskScope } : {}) },
  })
  for (const task of primaryTasks) {
    const next = await tx.taskAssignee.findFirst({
      where: { taskId: task.id },
      orderBy: { memberId: 'asc' },
      select: { memberId: true },
    })
    await tx.task.updateMany({
      where: { id: task.id, assigneeId: memberId },
      data: { assigneeId: next?.memberId ?? null },
    })
  }
}
