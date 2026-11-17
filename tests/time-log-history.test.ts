import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NextRequest } from 'next/server'
import { createSessionValue } from '../src/lib/auth'
import { db } from '../src/lib/db'
import { encodeHistoryCursor } from '../src/lib/time-log-history'
import { GET } from '../src/app/api/time-logs/route'

const cookie = createSessionValue({ id: 'u1', email: 'u@example.test', name: 'User', role: 'member', color: '#000' })
const request = (query: string) => new NextRequest(`http://localhost/api/time-logs${query}`, { headers: { cookie: `session=${cookie}` } })

test('keyset pagination visits all records with equal timestamps even if the cursor row is deleted', async () => {
  const originalUser = db.user.findFirst
  const originalLogs = db.timeLog.findMany
  let records = Array.from({ length: 130 }, (_, i) => ({
    id: `log${String(i).padStart(3, '0')}`, userId: 'u1', checkIn: new Date('2026-11-17T12:00:00.000Z'),
    checkOut: null, note: null, createdAt: new Date(),
  }))
  db.user.findFirst = (async () => ({ id: 'u1' })) as unknown as typeof originalUser
  db.timeLog.findMany = (async (args: { where: { userId: string; OR?: Array<{ checkIn: Date | { lt: Date }; id?: { lt: string } }> }; take: number }) => {
    let filtered = records.filter((record) => record.userId === args.where.userId)
    if (args.where.OR) {
      const date = (args.where.OR[0].checkIn as { lt: Date }).lt.getTime()
      const id = args.where.OR[1].id!.lt
      filtered = filtered.filter((record) => record.checkIn.getTime() < date || (record.checkIn.getTime() === date && record.id < id))
    }
    return filtered.sort((a, b) => b.checkIn.getTime() - a.checkIn.getTime() || b.id.localeCompare(a.id)).slice(0, args.take)
  }) as unknown as typeof originalLogs
  try {
    const seen: string[] = []
    let cursor: string | null = null
    let pages = 0
    do {
      const query = `?mode=history&limit=17${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
      const response = await GET(request(query))
      assert.equal(response.status, 200)
      assert.match(response.headers.get('cache-control') || '', /no-store/)
      const data = await response.json() as { logs: { id: string }[]; nextCursor: string | null }
      seen.push(...data.logs.map((row) => row.id))
      cursor = data.nextCursor
      if (++pages === 1) records = records.filter((row) => row.id !== data.logs.at(-1)?.id)
      assert.ok(pages < 20)
    } while (cursor)
    assert.equal(seen.length, 130)
    assert.equal(new Set(seen).size, 130)
    assert.deepEqual(seen, [...seen].sort().reverse())
  } finally {
    db.user.findFirst = originalUser
    db.timeLog.findMany = originalLogs
  }
})

test('history rejects malformed, cross-user and differently filtered cursors without loading logs', async () => {
  const originalUser = db.user.findFirst
  const originalLogs = db.timeLog.findMany
  let queried = false
  db.user.findFirst = (async () => ({ id: 'u1' })) as unknown as typeof originalUser
  db.timeLog.findMany = (async () => { queried = true; return [] }) as unknown as typeof originalLogs
  const cursor = encodeHistoryCursor({ v: 1, userId: 'other-user', id: 'log1', checkIn: '2026-01-01T00:00:00.000Z', from: null, to: null })
  const filteredCursor = encodeHistoryCursor({ v: 1, userId: 'u1', id: 'log1', checkIn: '2026-01-01T00:00:00.000Z', from: null, to: null })
  try {
    for (const query of [
      '?mode=history&cursor=!!!', `?mode=history&cursor=${cursor}`,
      `?mode=history&from=2025-01-01T00:00:00Z&cursor=${filteredCursor}`,
      '?mode=history&limit=0', '?mode=history&limit=101', '?mode=history&limit=abc',
      '?mode=history&from=invalid', '?mode=history&from=2026-02-31', '?mode=history&to=', '?mode=history&from=2026-01-02&to=2026-01-01',
      '?mode=history&userId=other-user',
    ]) {
      const response = await GET(request(query))
      assert.equal(response.status, query.includes('userId=') ? 403 : 400, query)
    }
    assert.equal(queried, false)
  } finally {
    db.user.findFirst = originalUser
    db.timeLog.findMany = originalLogs
  }
})

test('legacy time-log requests continue to return an array', async () => {
  const originalUser = db.user.findFirst
  const originalLogs = db.timeLog.findMany
  db.user.findFirst = (async () => ({ id: 'u1' })) as unknown as typeof originalUser
  db.timeLog.findMany = (async () => []) as unknown as typeof originalLogs
  try {
    const response = await GET(request(''))
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), [])
  } finally {
    db.user.findFirst = originalUser
    db.timeLog.findMany = originalLogs
  }
})

test('history retains date bounds and keyset order for a Leader viewing a managed member', async () => {
  const originalUser = db.user.findFirst
  const originalLogs = db.timeLog.findMany
  const start = '2026-01-01T00:00:00.000Z'
  const end = '2026-01-31T00:00:00.000Z'
  const cursor = encodeHistoryCursor({ v: 1, userId: 'member-1', id: 'log2', checkIn: '2026-01-15T00:00:00.000Z', from: start, to: end })
  db.user.findFirst = (async () => ({ id: 'valid' })) as unknown as typeof originalUser
  db.timeLog.findMany = (async (args: {
    where: { userId: string; checkIn: { gte: Date; lte: Date }; OR: Array<{ checkIn: Date | { lt: Date }; id?: { lt: string } }> }
    orderBy: Array<Record<string, string>>; take: number
  }) => {
    assert.equal(args.where.userId, 'member-1')
    assert.equal(args.where.checkIn.gte.toISOString(), start)
    assert.equal(args.where.checkIn.lte.toISOString(), end)
    assert.equal((args.where.OR[0].checkIn as { lt: Date }).lt.toISOString(), '2026-01-15T00:00:00.000Z')
    assert.equal(args.where.OR[1].id?.lt, 'log2')
    assert.deepEqual(args.orderBy, [{ checkIn: 'desc' }, { id: 'desc' }])
    assert.equal(args.take, 51)
    return []
  }) as unknown as typeof originalLogs
  try {
    const leader = createSessionValue({ id: 'leader-1', email: 'leader@example.test', name: 'Leader', role: 'leader', color: '#000' })
    const request = new NextRequest(`http://localhost/api/time-logs?mode=history&userId=member-1&from=2026-01-01&to=2026-01-31&cursor=${cursor}`, { headers: { cookie: `session=${leader}` } })
    const response = await GET(request)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { logs: [], nextCursor: null })
  } finally {
    db.user.findFirst = originalUser
    db.timeLog.findMany = originalLogs
  }
})
