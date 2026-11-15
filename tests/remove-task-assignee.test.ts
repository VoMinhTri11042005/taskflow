import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Prisma } from '@prisma/client'
import { removeTaskAssignee } from '../src/lib/remove-task-assignee'

test('removing a primary member preserves other assignees and limits cleanup to the selected project', async () => {
  const tasks = [
    { id: 't1', projectId: 'p1', assigneeId: 'a' as string | null },
    { id: 't2', projectId: 'p2', assigneeId: 'a' as string | null },
  ]
  let assignments = [
    { taskId: 't1', memberId: 'a' }, { taskId: 't1', memberId: 'b' },
    { taskId: 't2', memberId: 'a' },
  ]
  const tx = {
    task: {
      findMany: async ({ where }: { where: { assigneeId: string; projectId?: { in: string[] } } }) =>
        tasks.filter((t) => t.assigneeId === where.assigneeId && (!where.projectId || where.projectId.in.includes(t.projectId))),
      updateMany: async ({ where, data }: { where: { id: string; assigneeId: string }; data: { assigneeId: string | null } }) => {
        const task = tasks.find((t) => t.id === where.id && t.assigneeId === where.assigneeId)
        if (task) task.assigneeId = data.assigneeId
      },
    },
    taskAssignee: {
      deleteMany: async ({ where }: { where: { memberId: string; task?: { projectId: { in: string[] } } } }) => {
        assignments = assignments.filter((assignment) => {
          const task = tasks.find((t) => t.id === assignment.taskId)!
          return assignment.memberId !== where.memberId || Boolean(where.task && !where.task.projectId.in.includes(task.projectId))
        })
      },
      findFirst: async ({ where }: { where: { taskId: string } }) => assignments.find((a) => a.taskId === where.taskId) ?? null,
    },
  } as unknown as Prisma.TransactionClient
  await removeTaskAssignee(tx, 'a', ['p1'])
  assert.equal(tasks[0].assigneeId, 'b')
  assert.equal(tasks[1].assigneeId, 'a')
  assert.deepEqual(assignments, [{ taskId: 't1', memberId: 'b' }, { taskId: 't2', memberId: 'a' }])
})
