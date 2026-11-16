import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NextRequest } from 'next/server'
import { createSessionValue } from '../src/lib/auth'
import { db } from '../src/lib/db'
import { POST } from '../src/app/api/time-logs/route'

test('check-in uses a user row lock and rejects an existing open session', async () => {
  const originalTransaction = db.$transaction
  let open = false
  let locks = 0
  const tx = {
    $queryRaw: async (query: TemplateStringsArray, id: string) => {
      assert.match(query.join('?'), /FOR UPDATE/)
      assert.equal(id, 'user-1')
      locks++
      return [{ id }]
    },
    user: { findFirst: async () => ({ id: 'user-1' }) },
    timeLog: {
      findFirst: async () => open ? { id: 'log-1' } : null,
      create: async () => { open = true; return { id: 'log-1' } },
    },
  }
  db.$transaction = (async (callback: (client: typeof tx) => unknown) => callback(tx)) as unknown as typeof originalTransaction
  try {
    const session = createSessionValue({ id: 'user-1', email: 'user@example.test', name: 'User', role: 'member', color: '#000' })
    const request = () => new NextRequest('http://localhost/api/time-logs', {
      method: 'POST', headers: { cookie: `session=${session}`, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'check-in' }),
    })
    assert.equal((await POST(request())).status, 200)
    assert.equal((await POST(request())).status, 400)
    assert.equal(locks, 2)
  } finally {
    db.$transaction = originalTransaction
  }
})

test('check-in rejects an account that is no longer active', async () => {
  const originalTransaction = db.$transaction
  const tx = { $queryRaw: async () => [], user: { findFirst: async () => null } }
  db.$transaction = (async (callback: (client: typeof tx) => unknown) => callback(tx)) as unknown as typeof originalTransaction
  try {
    const session = createSessionValue({ id: 'user-1', email: 'user@example.test', name: 'User', role: 'member', color: '#000' })
    const request = new NextRequest('http://localhost/api/time-logs', {
      method: 'POST', headers: { cookie: `session=${session}`, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'check-in' }),
    })
    assert.equal((await POST(request)).status, 401)
  } finally {
    db.$transaction = originalTransaction
  }
})
