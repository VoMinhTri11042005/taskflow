import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getTaskDeadlineInfo } from '../src/lib/task-deadline'

test('deadlines use calendar dates rather than elapsed hours', () => {
  const now = new Date(2026, 10, 22, 23, 50)
  const due = (day: number, hour = 0) => new Date(2026, 10, day, hour).toISOString()
  assert.equal(getTaskDeadlineInfo(due(21, 23), 'todo', now)?.text, 'Quá hạn 1 ngày')
  assert.equal(getTaskDeadlineInfo(due(22), 'todo', now)?.text, 'Hạn hôm nay')
  assert.equal(getTaskDeadlineInfo(due(23), 'todo', now)?.text, 'Còn 1 ngày')
  assert.equal(getTaskDeadlineInfo(due(25), 'in_progress', now)?.text, 'Còn 3 ngày')
  assert.equal(getTaskDeadlineInfo(due(26), 'review', now)?.text, 'Còn 4 ngày')
})

test('completed tasks no longer show an overdue warning; absent or invalid dates are ignored', () => {
  const now = new Date(2026, 10, 22, 12)
  const past = new Date(2026, 10, 20, 12).toISOString()
  assert.equal(getTaskDeadlineInfo(past, 'done', now)?.text, 'Hạn 20/11/2026')
  assert.equal(getTaskDeadlineInfo(past, 'done', now)?.className, 'text-muted-foreground')
  assert.equal(getTaskDeadlineInfo(null, 'todo', now), null)
  assert.equal(getTaskDeadlineInfo('invalid', 'todo', now), null)
  assert.equal(getTaskDeadlineInfo(past, 'todo', new Date('invalid')), null)
})

test('calendar-day countdown is stable across daylight saving time changes', () => {
  const now = new Date(2026, 2, 7, 12)
  const due = new Date(2026, 2, 9, 12).toISOString()
  assert.equal(getTaskDeadlineInfo(due, 'todo', now)?.text, 'Còn 2 ngày')
})
