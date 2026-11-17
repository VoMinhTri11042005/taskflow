import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NextRequest } from 'next/server'
import { createSessionValue } from '../src/lib/auth'
import { db } from '../src/lib/db'
import { GET } from '../src/app/api/time-logs/route'

test('personal summary includes every session, not only the recent 100', async () => {
  const originalUser = db.user.findFirst
  const originalLogs = db.timeLog.findMany
  const logs = Array.from({ length: 101 }, (_, index) => ({
    id: `log-${index}`, userId: 'u1', checkIn: new Date(Date.UTC(2020, 0, 1, index * 2)),
    checkOut: new Date(Date.UTC(2020, 0, 1, index * 2 + 1)), note: null, createdAt: new Date(),
  }))
  db.user.findFirst = (async () => ({ id: 'u1' })) as unknown as typeof originalUser
  db.timeLog.findMany = (async (args: { take?: number }) => {
    assert.equal(args.take, undefined)
    return logs
  }) as unknown as typeof originalLogs
  try {
    const session = createSessionValue({ id: 'u1', email: 'u@example.test', name: 'User', role: 'member', color: '#000' })
    const request = new NextRequest('http://localhost/api/time-logs?mode=summary', { headers: { cookie: `session=${session}` } })
    const response = await GET(request)
    assert.equal(response.status, 200)
    const data = await response.json()
    assert.equal(data.totalSessions, 101)
    assert.equal(data.totalMinutes, 6060)
    assert.equal(data.activeTimeLog, null)
  } finally {
    db.user.findFirst = originalUser
    db.timeLog.findMany = originalLogs
  }
})

test('a member cannot query another user’s work summary', async () => {
  const originalUser = db.user.findFirst
  const originalLogs = db.timeLog.findMany
  let queried = false
  db.user.findFirst = (async () => ({ id: 'u1' })) as unknown as typeof originalUser
  db.timeLog.findMany = (async () => { queried = true; return [] }) as unknown as typeof originalLogs
  try {
    const session = createSessionValue({ id: 'u1', email: 'u@example.test', name: 'User', role: 'member', color: '#000' })
    const request = new NextRequest('http://localhost/api/time-logs?mode=summary&userId=other', { headers: { cookie: `session=${session}` } })
    const response = await GET(request)
    assert.equal(response.status, 403)
    assert.equal(queried, false)
  } finally {
    db.user.findFirst = originalUser
    db.timeLog.findMany = originalLogs
  }
})

test('active session lookup queries only the authenticated user’s open log', async () => {
  const originalUser = db.user.findFirst
  const originalLog = db.timeLog.findFirst
  const log = { id: 'open', userId: 'u1', checkIn: new Date('2026-11-17T00:00:00Z'), checkOut: null, note: null, createdAt: new Date() }
  db.user.findFirst = (async () => ({ id: 'u1' })) as unknown as typeof originalUser
  db.timeLog.findFirst = (async (args: { where?: { userId?: string; checkOut?: null } }) => {
    assert.equal(args.where?.userId, 'u1')
    assert.equal(args.where?.checkOut, null)
    return log
  }) as unknown as typeof originalLog
  try {
    const session = createSessionValue({ id: 'u1', email: 'u@example.test', name: 'User', role: 'member', color: '#000' })
    const request = new NextRequest('http://localhost/api/time-logs?mode=active', { headers: { cookie: `session=${session}` } })
    const response = await GET(request)
    assert.equal(response.status, 200)
    assert.equal((await response.json()).activeTimeLog.id, 'open')
  } finally {
    db.user.findFirst = originalUser
    db.timeLog.findFirst = originalLog
  }
})
