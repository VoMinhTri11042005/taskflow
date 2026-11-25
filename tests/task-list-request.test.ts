import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createTaskListRequestGate } from '../src/lib/task-list-request'

test('a slower response cannot overwrite a newer successful task list', () => {
  const gate = createTaskListRequestGate()
  const older = gate.begin()
  const newer = gate.begin()
  assert.equal(gate.accept(newer), true)
  assert.equal(gate.accept(older), false)
})

test('a failed newer request does not discard the last successful response', () => {
  const gate = createTaskListRequestGate()
  const older = gate.begin()
  gate.begin() // fails before producing data
  assert.equal(gate.accept(older), true)
})

test('a read started before a local write cannot restore the old list', () => {
  const gate = createTaskListRequestGate()
  const stale = gate.begin()
  gate.invalidate()
  assert.equal(gate.accept(stale), false)
  assert.equal(gate.accept(gate.begin()), true)
})
