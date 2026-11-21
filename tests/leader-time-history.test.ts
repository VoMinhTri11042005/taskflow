import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NextRequest } from 'next/server'
import { db } from '../src/lib/db'
import { createSessionValue } from '../src/lib/auth'
import { encodeHistoryCursor } from '../src/lib/time-log-history'
import { GET } from '../src/app/api/time-logs/route'

const leaderId = 'leader-1'
const token = createSessionValue({ id: leaderId, email: 'leader@example.test', name: 'Leader', role: 'leader', color: '#000' })
const request = (query: string) => new NextRequest(`http://localhost/api/time-logs?${query}`, { headers: { cookie: `session=${token}` } })

test('Leader can paginate the history of an approved member in their team', async () => {
  const originalUser = db.user.findFirst
  const originalLogs = db.timeLog.findMany
  const checkIn = new Date('2026-11-17T12:00:00.000Z')
  const rows = ['log3', 'log2', 'log1'].map((id) => ({ id, userId: 'member-1', checkIn, checkOut: null, note: null, createdAt: checkIn }))
  let queries = 0
  db.user.findFirst = (async (args: { where: { id: string; role?: string; leaderId?: string; status?: string } }) => {
    const where = args.where
    if (where.id === leaderId && where.role === 'leader' && where.status === 'approved') return { id: leaderId }
    if (where.id === 'member-1' && where.role === 'member' && where.leaderId === leaderId) return { id: 'member-1' }
    return null
  }) as unknown as typeof originalUser
  db.timeLog.findMany = (async (args: { where: { userId: string; OR?: Array<{ checkIn: Date | { lt: Date }; id?: { lt: string } }> }; take: number }) => {
    queries++
    assert.equal(args.where.userId, 'member-1')
    assert.equal(args.take, 3)
    const olderThan = args.where.OR?.[1].id?.lt
    return rows.filter((row) => !olderThan || row.id < olderThan).slice(0, args.take)
  }) as unknown as typeof originalLogs
  try {
    const firstResponse = await GET(request('mode=history&userId=member-1&limit=2'))
    assert.equal(firstResponse.status, 200)
    const first = await firstResponse.json() as { logs: Array<{ id: string }>; nextCursor: string | null }
    assert.deepEqual(first.logs.map((row) => row.id), ['log3', 'log2'])
    assert.ok(first.nextCursor)
    const secondResponse = await GET(request(`mode=history&userId=member-1&limit=2&cursor=${encodeURIComponent(first.nextCursor)}`))
    assert.equal(secondResponse.status, 200)
    const second = await secondResponse.json() as { logs: Array<{ id: string }>; nextCursor: string | null }
    assert.deepEqual(second.logs.map((row) => row.id), ['log1'])
    assert.equal(second.nextCursor, null)
    assert.equal(queries, 2)
  } finally {
    db.user.findFirst = originalUser
    db.timeLog.findMany = originalLogs
  }
})

test('Leader cannot query an outside member, even with their cursor', async () => {
  const originalUser = db.user.findFirst
  const originalLogs = db.timeLog.findMany
  let logQueries = 0
  db.user.findFirst = (async (args: { where: { id: string; role?: string; status?: string } }) =>
    args.where.id === leaderId && args.where.role === 'leader' && args.where.status === 'approved' ? { id: leaderId } : null
  ) as unknown as typeof originalUser
  db.timeLog.findMany = (async () => { logQueries++; return [] }) as unknown as typeof originalLogs
  const cursor = encodeHistoryCursor({ v: 1, userId: 'outside-member', id: 'log1', checkIn: '2026-01-01T00:00:00.000Z', from: null, to: null })
  try {
    const response = await GET(request(`mode=history&userId=outside-member&cursor=${encodeURIComponent(cursor)}`))
    assert.equal(response.status, 403)
    assert.equal(logQueries, 0)
  } finally {
    db.user.findFirst = originalUser
    db.timeLog.findMany = originalLogs
  }
})

test('a Leader cannot reuse one team member’s cursor for another', async () => {
  const originalUser = db.user.findFirst
  const originalLogs = db.timeLog.findMany
  let logQueries = 0
  db.user.findFirst = (async (args: { where: { id: string; role?: string; leaderId?: string; status?: string } }) => {
    if (args.where.id === leaderId && args.where.role === 'leader' && args.where.status === 'approved') return { id: leaderId }
    if (args.where.id === 'member-2' && args.where.role === 'member' && args.where.leaderId === leaderId) return { id: 'member-2' }
    return null
  }) as unknown as typeof originalUser
  db.timeLog.findMany = (async () => { logQueries++; return [] }) as unknown as typeof originalLogs
  const cursor = encodeHistoryCursor({ v: 1, userId: 'member-1', id: 'log1', checkIn: '2026-01-01T00:00:00.000Z', from: null, to: null })
  try {
    const response = await GET(request(`mode=history&userId=member-2&cursor=${encodeURIComponent(cursor)}`))
    assert.equal(response.status, 400)
    assert.equal(logQueries, 0)
  } finally {
    db.user.findFirst = originalUser
    db.timeLog.findMany = originalLogs
  }
})

test('revoked Leader accounts cannot retrieve team history', async () => {
  const originalUser = db.user.findFirst
  const originalLogs = db.timeLog.findMany
  let logQueries = 0
  db.user.findFirst = (async () => null) as unknown as typeof originalUser
  db.timeLog.findMany = (async () => { logQueries++; return [] }) as unknown as typeof originalLogs
  try {
    assert.equal((await GET(request('mode=history&userId=member-1'))).status, 401)
    assert.equal(logQueries, 0)
  } finally {
    db.user.findFirst = originalUser
    db.timeLog.findMany = originalLogs
  }
})
