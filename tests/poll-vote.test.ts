import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NextRequest } from 'next/server'
import { db } from '../src/lib/db'
import { createSessionValue } from '../src/lib/auth'
import { POST } from '../src/app/api/polls/[id]/vote/route'

const pollId = 'cl00000000000000000000001'
const optionA = 'cl00000000000000000000002'
const optionB = 'cl00000000000000000000003'
const userId = 'cl00000000000000000000004'
const projectId = 'cl00000000000000000000005'

test('vote acquires the poll lock before checking status and writing choices', async () => {
  const events: string[] = []
  const tx = {
    $queryRaw: async (strings: TemplateStringsArray, id: string) => {
      assert.match(strings.join('?'), /FOR UPDATE/)
      assert.equal(id, pollId)
      events.push('lock')
      return [{ id }]
    },
    poll: { findUnique: async (args: { select?: unknown }) => {
      if (args.select) {
        events.push('read-poll')
        return { projectId, status: 'active', allowMultipleChoices: false, options: [{ id: optionA }] }
      }
      events.push('snapshot')
      return { id: pollId }
    } },
    projectMember: { findUnique: async () => {
      events.push('membership')
      return { status: 'approved', user: { role: 'member', status: 'approved', leaderId: 'leader' }, project: { leaderId: 'leader' } }
    } },
    pollVote: {
      deleteMany: async () => { events.push('delete') },
      createMany: async () => { events.push('create') },
    },
  }
  const prisma = db as unknown as { $transaction: (callback: (client: typeof tx) => Promise<unknown>) => Promise<unknown> }
  const original = prisma.$transaction
  prisma.$transaction = (callback) => callback(tx)
  try {
    const cookie = createSessionValue({ id: userId, email: 'member@example.test', name: 'Member', role: 'member', color: '#000' })
    const request = new NextRequest('http://localhost/api/polls/test/vote', { method: 'POST', headers: { cookie: `session=${cookie}` }, body: JSON.stringify({ optionIds: [optionA] }) })
    const response = await POST(request, { params: Promise.resolve({ id: pollId }) })
    assert.equal(response.status, 200)
    assert.deepEqual(events, ['lock', 'read-poll', 'membership', 'delete', 'create', 'snapshot'])
  } finally {
    prisma.$transaction = original
  }
})

test('a poll that has closed before its lock is acquired rejects the vote', async () => {
  let wrote = false
  const tx = {
    $queryRaw: async () => [{ id: pollId }],
    poll: { findUnique: async () => ({ projectId, status: 'closed', allowMultipleChoices: false, options: [{ id: optionA }, { id: optionB }] }) },
    pollVote: { deleteMany: async () => { wrote = true } },
  }
  const prisma = db as unknown as { $transaction: (callback: (client: typeof tx) => Promise<unknown>) => Promise<unknown> }
  const original = prisma.$transaction
  prisma.$transaction = (callback) => callback(tx)
  try {
    const cookie = createSessionValue({ id: userId, email: 'member@example.test', name: 'Member', role: 'member', color: '#000' })
    const request = new NextRequest('http://localhost/api/polls/test/vote', { method: 'POST', headers: { cookie: `session=${cookie}` }, body: JSON.stringify({ optionIds: [optionA] }) })
    const response = await POST(request, { params: Promise.resolve({ id: pollId }) })
    assert.equal(response.status, 409)
    assert.equal(wrote, false)
  } finally {
    prisma.$transaction = original
  }
})

test('revoked members and multiple selections on a single-choice poll cannot change votes', async () => {
  let membershipStatus = 'rejected'
  let wrote = false
  const tx = {
    $queryRaw: async () => [{ id: pollId }],
    poll: { findUnique: async () => ({ projectId, status: 'active', allowMultipleChoices: false, options: [{ id: optionA }, { id: optionB }] }) },
    projectMember: { findUnique: async () => ({ status: membershipStatus, user: { role: 'member', status: 'approved', leaderId: 'leader' }, project: { leaderId: 'leader' } }) },
    pollVote: { deleteMany: async () => { wrote = true } },
  }
  const prisma = db as unknown as { $transaction: (callback: (client: typeof tx) => Promise<unknown>) => Promise<unknown> }
  const original = prisma.$transaction
  prisma.$transaction = (callback) => callback(tx)
  try {
    const cookie = createSessionValue({ id: userId, email: 'member@example.test', name: 'Member', role: 'member', color: '#000' })
    const request = (optionIds: string[]) => new NextRequest('http://localhost/api/polls/test/vote', { method: 'POST', headers: { cookie: `session=${cookie}` }, body: JSON.stringify({ optionIds }) })
    assert.equal((await POST(request([optionA]), { params: Promise.resolve({ id: pollId }) })).status, 403)
    membershipStatus = 'approved'
    assert.equal((await POST(request([optionA, optionB]), { params: Promise.resolve({ id: pollId }) })).status, 400)
    assert.equal(wrote, false)
  } finally {
    prisma.$transaction = original
  }
})
