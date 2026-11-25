import assert from 'node:assert/strict'
import { test } from 'node:test'
import { summarizeTeamTasks } from '../src/lib/project-team-summary'

test('project totals count a shared assignment once while retaining all distinct tasks', () => {
  const members = [
    { assignedTasks: [{ id: 'shared', status: 'done' }, { id: 'one', status: 'todo' }] },
    { assignedTasks: [{ id: 'shared', status: 'done' }, { id: 'two', status: 'review' }] },
  ]
  assert.deepEqual(summarizeTeamTasks(members), { total: 3, done: 1, completionRate: 33 })
  assert.equal(members[0].assignedTasks.length, 2)
  assert.equal(members[1].assignedTasks.length, 2)
})

test('empty teams and members without assignments have zero totals', () => {
  assert.deepEqual(summarizeTeamTasks([]), { total: 0, done: 0, completionRate: 0 })
  assert.deepEqual(summarizeTeamTasks([{ assignedTasks: [] }]), { total: 0, done: 0, completionRate: 0 })
})
