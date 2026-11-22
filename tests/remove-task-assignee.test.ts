import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Prisma } from '@prisma/client'
import { removeTaskAssignee } from '../src/lib/remove-task-assignee'

test('removing a primary member preserves other assignees and limits cleanup to the selected project', async () => {
  const tasks = [
    { id: 't1', projectId: 'p1', assigneeId: 'a' as string | null, updatedAt: new Date('2099-01-01') },
    { id: 't2', projectId: 'p2', assigneeId: 'a' as string | null, updatedAt: new Date('2099-01-01') },
    { id: 't3', projectId: 'p1', assigneeId: 'b' as string | null, updatedAt: new Date('2099-01-01') },
  ]
  let assignments = [
    { taskId: 't1', memberId: 'a' }, { taskId: 't1', memberId: 'b' },
    { taskId: 't2', memberId: 'a' },
    { taskId: 't3', memberId: 'a' }, { taskId: 't3', memberId: 'b' },
  ]
  const originalVersion = tasks[0].updatedAt.getTime()
  const events: string[] = []
  const tx = {
    $queryRaw: async (query: { sql: string; values: string[] }) => {
      events.push('bump')
      assert.match(query.sql, /UPDATE "tasks"/)
      assert.match(query.sql, /INTERVAL '1 millisecond'/)
      const [memberId, , ...projectIds] = query.values
      const affected = tasks.filter((task) => (!projectIds.length || projectIds.includes(task.projectId)) &&
        (task.assigneeId === memberId || assignments.some((a) => a.taskId === task.id && a.memberId === memberId)))
      for (const task of affected) task.updatedAt = new Date(task.updatedAt.getTime() + 1)
      return affected.map(({ id, assigneeId, updatedAt }) => ({ id, assigneeId, updatedAt }))
    },
    task: {
      updateMany: async ({ where, data }: { where: { id: string; assigneeId: string }; data: { assigneeId: string | null; updatedAt: Date } }) => {
        const task = tasks.find((t) => t.id === where.id && t.assigneeId === where.assigneeId)
        if (task) { task.assigneeId = data.assigneeId; task.updatedAt = data.updatedAt }
      },
    },
    taskAssignee: {
      deleteMany: async ({ where }: { where: { memberId: string; task?: { projectId: { in: string[] } } } }) => {
        events.push('delete')
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
  assert.equal(tasks[2].assigneeId, 'b')
  assert.deepEqual(assignments, [{ taskId: 't1', memberId: 'b' }, { taskId: 't2', memberId: 'a' }, { taskId: 't3', memberId: 'b' }])
  assert.equal(tasks[0].updatedAt.getTime(), originalVersion + 1)
  assert.equal(tasks[1].updatedAt.getTime(), originalVersion)
  assert.equal(tasks[2].updatedAt.getTime(), originalVersion + 1)
  assert.deepEqual(events, ['bump', 'delete'])
})
