import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NextRequest } from 'next/server'
import { GET, POST } from '../src/app/api/tasks/[id]/comments/route'
import { createSessionValue, type SessionData } from '../src/lib/auth'
import { db } from '../src/lib/db'

type User = { id: string; email: string; role: string; status: string; leaderId: string | null; memberId?: string }
type Comment = { id: string; taskId: string; userId: string; content: string; user: { id: string; name: string } }
type Notification = { userId: string; title: string; message: string; type: string }

test('task comment access, notifications and transaction behavior', async (t) => {
  const users: User[] = [
    { id: 'leader', email: 'leader@example.test', role: 'leader', status: 'approved', leaderId: null },
    { id: 'other-leader', email: 'other@example.test', role: 'leader', status: 'approved', leaderId: null },
    ...['a', 'b', 'c'].map((id) => ({ id, email: `${id}@example.test`, role: 'member', status: 'approved', leaderId: 'leader', memberId: `member-${id}` })),
    { id: 'admin', email: 'admin@example.test', role: 'admin', status: 'approved', leaderId: null },
  ]
  const members = new Set(['a', 'b', 'c'])
  let primary: string | null = 'member-a'
  let assignments = ['member-a', 'member-b']
  const comments: Comment[] = []
  const activities: string[] = []
  const notifications: Notification[] = []
  let failActivity = false
  let failNotifications = false

  const originals = {
    taskUnique: db.task.findUnique, taskFirst: db.task.findFirst,
    userFirst: db.user.findFirst, userMany: db.user.findMany,
    projectFirst: db.project.findFirst, membership: db.projectMember.findUnique,
    commentMany: db.taskComment.findMany, transaction: db.$transaction,
    notificationMany: db.notification.createMany,
  }

  db.task.findUnique = (async ({ where, select }: { where: { id: string }; select: Record<string, unknown> }) => {
    if (where.id !== 'task') return null
    if (select.projectId) return { projectId: 'project' }
    const email = (memberId: string) => users.find((user) => user.memberId === memberId)!.email
    return {
      id: 'task', title: 'Công việc chung',
      assignee: primary ? { email: email(primary) } : null,
      assignments: assignments.map((id) => ({ member: { email: email(id) } })),
      project: { id: 'project', leaderId: 'leader' },
    }
  }) as unknown as typeof db.task.findUnique
  db.task.findFirst = (async ({ where }: { where: { id: string; OR: Array<{ assigneeId?: string; assignments?: { some: { memberId: string } } }> } }) => {
    const matched = where.OR.some((clause) =>
      (clause.assigneeId !== undefined && primary === clause.assigneeId) ||
      (clause.assignments !== undefined && assignments.includes(clause.assignments.some.memberId)))
    return where.id === 'task' && matched ? { projectId: 'project' } : null
  }) as unknown as typeof db.task.findFirst
  db.user.findFirst = (async ({ where }: { where: { id: string; role: string; status: string } }) =>
    users.find((user) => user.id === where.id && user.role === where.role && user.status === where.status) ?? null
  ) as unknown as typeof db.user.findFirst
  db.project.findFirst = (async ({ where }: { where: { id: string; leaderId: string } }) =>
    where.id === 'project' && where.leaderId === 'leader' ? { id: 'project' } : null
  ) as unknown as typeof db.project.findFirst
  db.projectMember.findUnique = (async ({ where }: { where: { projectId_userId: { projectId: string; userId: string } } }) => {
    const { projectId, userId } = where.projectId_userId
    const user = users.find((candidate) => candidate.id === userId)
    return projectId === 'project' && user && members.has(userId)
      ? { status: 'approved', user, project: { leaderId: 'leader' } } : null
  }) as unknown as typeof db.projectMember.findUnique
  db.taskComment.findMany = (async ({ where }: { where: { taskId: string } }) => comments.filter((comment) => comment.taskId === where.taskId)) as unknown as typeof db.taskComment.findMany
  db.user.findMany = (async ({ where }: { where: { id: { not: string }; status: string; OR: Array<{ id?: string; role: string; email?: { in: string[] }; leaderId?: string; projectMemberships?: { some: { projectId: string; status: string } } }> } }) =>
    users.filter((user) => user.id !== where.id.not && user.status === where.status && where.OR.some((clause) => {
      if (user.role !== clause.role) return false
      if (clause.id !== undefined && user.id !== clause.id) return false
      if (clause.email && !clause.email.in.includes(user.email)) return false
      if (clause.leaderId !== undefined && user.leaderId !== clause.leaderId) return false
      if (clause.projectMemberships && (clause.projectMemberships.some.projectId !== 'project' || clause.projectMemberships.some.status !== 'approved' || !members.has(user.id))) return false
      return true
    })).map(({ id }) => ({ id }))
  ) as unknown as typeof db.user.findMany
  db.notification.createMany = (async ({ data }: { data: Notification[] }) => {
    if (failNotifications) throw new Error('notification unavailable')
    notifications.push(...data)
    return { count: data.length }
  }) as unknown as typeof db.notification.createMany
  db.$transaction = (async (callback: (tx: unknown) => Promise<unknown>) => {
    const pendingComments: Comment[] = []
    const pendingActivities: string[] = []
    const result = await callback({
      taskComment: { create: async ({ data }: { data: { taskId: string; userId: string; content: string } }) => {
        const created = { ...data, id: `comment-${comments.length + 1}`, user: { id: data.userId, name: data.userId } }
        pendingComments.push(created)
        return created
      } },
      taskActivity: { create: async ({ data }: { data: { action: string } }) => {
        if (failActivity) throw new Error('activity unavailable')
        pendingActivities.push(data.action)
      } },
    })
    comments.push(...pendingComments)
    activities.push(...pendingActivities)
    return result
  }) as unknown as typeof db.$transaction

  const request = (userId: string | null, method: 'GET' | 'POST' = 'GET', content?: string) => {
    const user = users.find((candidate) => candidate.id === userId)
    const headers: Record<string, string> = {}
    if (user) {
      const session: SessionData = { id: user.id, email: user.email, name: user.id, role: user.role, color: '#000', teamMemberId: user.memberId }
      headers.cookie = `session=${createSessionValue(session)}`
    }
    if (method === 'POST') headers['content-type'] = 'application/json'
    return new NextRequest('http://localhost/api/tasks/task/comments', { method, headers, ...(method === 'POST' ? { body: JSON.stringify({ content }) } : {}) })
  }
  const params = { params: Promise.resolve({ id: 'task' }) }

  try {
    await t.test('only the task leader and assigned members can read or post', async () => {
      for (const userId of ['leader', 'a', 'b']) {
        const response = await GET(request(userId), params)
        assert.equal(response.status, 200, userId)
        assert.match(response.headers.get('cache-control') ?? '', /no-store/)
      }
      for (const userId of ['c', 'other-leader', 'admin']) {
        assert.equal((await GET(request(userId), params)).status, 403, userId)
        assert.equal((await POST(request(userId, 'POST', 'outside'), params)).status, 403, userId)
      }
      assert.equal((await GET(request(null), params)).status, 401)
      assert.equal((await POST(request(null, 'POST', 'outside'), params)).status, 401)
    })

    await t.test('comments are shared and notify the other current participants once', async () => {
      const response = await POST(request('a', 'POST', '  Xin chào  '), params)
      assert.equal(response.status, 201)
      assert.equal((await response.json()).content, 'Xin chào')
      assert.deepEqual(activities, ['comment_created'])
      assert.deepEqual(notifications.map((item) => item.userId).sort(), ['b', 'leader'])
      assert.ok(notifications.every((item) => item.message.includes('Xin chào')))
      for (const userId of ['leader', 'a', 'b']) {
        const visible = await (await GET(request(userId), params)).json()
        assert.deepEqual(visible.map((comment: Comment) => comment.content), ['Xin chào'])
      }
      notifications.length = 0
      assert.equal((await POST(request('leader', 'POST', 'Thông báo'), params)).status, 201)
      assert.deepEqual(notifications.map((item) => item.userId).sort(), ['a', 'b'])
      assert.ok(notifications.every((item) => item.type === 'leader_comment'))
    })

    await t.test('removed assignees and revoked project members lose access and notifications', async () => {
      assignments = ['member-a']
      assert.equal((await GET(request('b'), params)).status, 403)
      assert.equal((await POST(request('b', 'POST', 'removed'), params)).status, 403)
      notifications.length = 0
      await POST(request('a', 'POST', 'Cập nhật'), params)
      assert.deepEqual(notifications.map((item) => item.userId), ['leader'])
      assignments.push('member-b')
      members.delete('b')
      assert.equal((await GET(request('b'), params)).status, 403)
      assert.equal((await POST(request('b', 'POST', 'revoked'), params)).status, 403)
      notifications.length = 0
      await POST(request('a', 'POST', 'Tiếp tục'), params)
      assert.deepEqual(notifications.map((item) => item.userId), ['leader'])
      assert.equal((await GET(request('a'), params)).status, 200)
      members.add('b')
      assignments.push('member-c')
      const previous = await (await GET(request('c'), params)).json()
      assert.equal(previous[0].content, 'Xin chào')
    })

    await t.test('invalid text and failed transaction do not save comments', async () => {
      const before = comments.length
      assert.equal((await POST(request('a', 'POST', '   '), params)).status, 400)
      assert.equal((await POST(request('a', 'POST', 'x'.repeat(4001)), params)).status, 400)
      assert.equal(comments.length, before)
      failActivity = true
      const originalError = console.error
      console.error = () => {}
      try { assert.equal((await POST(request('a', 'POST', 'rollback'), params)).status, 500) } finally { console.error = originalError; failActivity = false }
      assert.equal(comments.length, before)
    })

    await t.test('notification failure does not discard a saved comment', async () => {
      const before = comments.length
      failNotifications = true
      const originalError = console.error
      console.error = () => {}
      try { assert.equal((await POST(request('a', 'POST', 'saved'), params)).status, 201) } finally { console.error = originalError; failNotifications = false }
      assert.equal(comments.length, before + 1)
      assert.equal(comments.at(-1)?.content, 'saved')
    })
  } finally {
    db.task.findUnique = originals.taskUnique
    db.task.findFirst = originals.taskFirst
    db.user.findFirst = originals.userFirst
    db.user.findMany = originals.userMany
    db.project.findFirst = originals.projectFirst
    db.projectMember.findUnique = originals.membership
    db.taskComment.findMany = originals.commentMany
    db.$transaction = originals.transaction
    db.notification.createMany = originals.notificationMany
  }
})
