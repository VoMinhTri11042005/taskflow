import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NextRequest } from 'next/server'
import { createSessionValue } from '../src/lib/auth'
import { GET } from '../src/app/api/members/[id]/route'
import { db } from '../src/lib/db'

test('a member cannot fetch another member record even if its ID is known', async () => {
  const session = createSessionValue({ id: 'user-1', email: 'user@example.test', name: 'User', role: 'member', color: '#000', teamMemberId: 'member-1' })
  const request = new NextRequest('http://localhost/api/members/member-2', { headers: { cookie: `session=${session}` } })
  const response = await GET(request, { params: Promise.resolve({ id: 'member-2' }) })
  assert.equal(response.status, 403)
})

test('an unauthenticated request cannot read a member record', async () => {
  const response = await GET(new NextRequest('http://localhost/api/members/member-1'), { params: Promise.resolve({ id: 'member-1' }) })
  assert.equal(response.status, 401)
})

test('own member, owning Leader and Admin retain access', async () => {
  const originalMember = db.teamMember.findUnique
  const originalUser = db.user.findUnique
  db.teamMember.findUnique = (async () => ({ id: 'member-1', email: 'member@example.test', role: 'member', _count: { tasks: 1, taskAssignments: 1 } })) as unknown as typeof originalMember
  db.user.findUnique = (async () => ({ id: 'user-1', status: 'approved', leaderId: 'leader-1', leader: { name: 'Leader' } })) as unknown as typeof originalUser
  try {
  for (const [role, id, teamMemberId, expected] of [
    ['member', 'user-1', 'member-1', 200],
    ['leader', 'leader-1', null, 200],
    ['leader', 'other-leader', null, 403],
    ['admin', 'admin-1', null, 200],
  ] as const) {
    const session = createSessionValue({ id, email: `${id}@example.test`, name: id, role, color: '#000', teamMemberId })
    const request = new NextRequest('http://localhost/api/members/member-1', { headers: { cookie: `session=${session}` } })
    const response = await GET(request, { params: Promise.resolve({ id: 'member-1' }) })
    assert.equal(response.status, expected, role)
  }
  } finally {
    db.teamMember.findUnique = originalMember
    db.user.findUnique = originalUser
  }
})
