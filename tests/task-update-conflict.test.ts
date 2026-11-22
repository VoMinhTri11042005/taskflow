import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NextRequest } from 'next/server'
import { PUT } from '../src/app/api/tasks/[id]/route'
import { createSessionValue } from '../src/lib/auth'
import { db } from '../src/lib/db'

test('task updates compare versions atomically, preserve legacy clients and avoid side effects on conflict', async () => {
  const originals = {
    taskFind: db.task.findUnique, taskUpdate: db.task.update,
    userFind: db.user.findFirst, projectFind: db.project.findFirst,
    activity: db.taskActivity.create,
  }
  let version = new Date('2099-01-01T00:00:00.000Z')
  let title = 'Ban đầu'
  let exists = true
  let deleteOnUpdate = false
  let activityCount = 0
  const observations: Array<{ expected: Date; next: Date }> = []
  db.task.findUnique = (async ({ select }: { select: Record<string, unknown> }) => {
    if (!exists) return null
    if (select.projectId && !select.title) return { projectId: 'project' }
    if (select.id) return { id: 'task' }
    return { updatedAt: version, title, projectId: 'project', status: 'todo', reviewStatus: null, assigneeId: null, assignee: null, assignments: [] }
  }) as unknown as typeof db.task.findUnique
  db.user.findFirst = (async () => ({ id: 'leader' })) as unknown as typeof db.user.findFirst
  db.project.findFirst = (async () => ({ id: 'project' })) as unknown as typeof db.project.findFirst
  db.taskActivity.create = (async () => { activityCount++; return {} }) as unknown as typeof db.taskActivity.create
  db.task.update = (async ({ where, data }: { where: { id: string; updatedAt: Date }; data: { title: string; updatedAt: Date; expectedUpdatedAt?: unknown } }) => {
    assert.equal(data.expectedUpdatedAt, undefined)
    observations.push({ expected: where.updatedAt, next: data.updatedAt })
    if (deleteOnUpdate) exists = false
    if (!exists || where.updatedAt.getTime() !== version.getTime()) throw { code: 'P2025' }
    title = data.title
    version = data.updatedAt
    return { id: 'task', title, updatedAt: version, status: 'todo', assignee: null, assignments: [], project: { id: 'project', name: 'Project', leaderId: 'leader' } }
  }) as unknown as typeof db.task.update

  const session = createSessionValue({ id: 'leader', email: 'leader@example.test', name: 'Leader', role: 'leader', color: '#000' })
  const admin = createSessionValue({ id: 'admin', email: 'admin@example.test', name: 'Admin', role: 'admin', color: '#000' })
  const request = (body: object) => new NextRequest('http://localhost/api/tasks/task', { method: 'PUT', headers: { cookie: `session=${session}`, 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const params = { params: Promise.resolve({ id: 'task' }) }
  try {
    const initialVersion = version.toISOString()
    const [first, second] = await Promise.all([
      PUT(request({ title: 'A', expectedUpdatedAt: initialVersion }), params),
      PUT(request({ title: 'B', expectedUpdatedAt: initialVersion }), params),
    ])
    assert.deepEqual([first.status, second.status].sort(), [200, 409])
    const conflict = first.status === 409 ? first : second
    assert.equal((await conflict.json()).code, 'TASK_CONFLICT')
    assert.equal(activityCount, 1)
    assert.equal(version.getTime(), new Date(initialVersion).getTime() + 1)
    assert.equal(observations.length, 2)

    const prior = version.getTime()
    assert.equal((await PUT(request({ title: 'Ancien client' }), params)).status, 200)
    assert.equal(version.getTime(), prior + 1)
    assert.equal(activityCount, 2)
    assert.equal((await PUT(request({ title: 'Invalide', expectedUpdatedAt: 'bad' }), params)).status, 400)
    assert.equal(activityCount, 2)
    const unauthorized = new NextRequest('http://localhost/api/tasks/task', { method: 'PUT', headers: { cookie: `session=${admin}`, 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Denied', expectedUpdatedAt: initialVersion }) })
    assert.equal((await PUT(unauthorized, params)).status, 403)
    assert.equal(activityCount, 2)
    deleteOnUpdate = true
    assert.equal((await PUT(request({ title: 'Supprimé', expectedUpdatedAt: initialVersion }), params)).status, 404)
  } finally {
    db.task.findUnique = originals.taskFind
    db.task.update = originals.taskUpdate
    db.user.findFirst = originals.userFind
    db.project.findFirst = originals.projectFind
    db.taskActivity.create = originals.activity
  }
})
