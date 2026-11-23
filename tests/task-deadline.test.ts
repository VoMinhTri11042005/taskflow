import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatTaskDate, getTaskDateKey, getTaskDateLocal, getTaskDeadlineInfo } from '../src/lib/task-deadline'

test('UTC date-only values preserve their calendar day in every viewer timezone', () => {
  const value = '2026-11-22T00:00:00.000Z'
  const local = getTaskDateLocal(value)!
  assert.equal(getTaskDateKey(value), '2026-11-22')
  assert.equal(getTaskDateKey('2026-11-22'), '2026-11-22')
  assert.equal(local.getFullYear(), 2026)
  assert.equal(local.getMonth(), 10)
  assert.equal(local.getDate(), 22)
  assert.equal(formatTaskDate(value), '22/11/2026')
  assert.equal(formatTaskDate(value, 'yyyy-MM-dd'), '2026-11-22')
  assert.equal(getTaskDateKey('2026-11-22T23:00:00-02:00'), '2026-11-23')
})

test('deadlines use calendar dates rather than elapsed hours', () => {
  const now = new Date(2026, 10, 22, 23, 50)
  const due = (day: number) => `2026-11-${String(day).padStart(2, '0')}T00:00:00.000Z`
  assert.equal(getTaskDeadlineInfo(due(21), 'todo', now)?.text, 'Quá hạn 1 ngày')
  assert.equal(getTaskDeadlineInfo(due(22), 'todo', now)?.text, 'Hạn hôm nay')
  assert.equal(getTaskDeadlineInfo(due(23), 'todo', now)?.text, 'Còn 1 ngày')
  assert.equal(getTaskDeadlineInfo(due(25), 'in_progress', now)?.text, 'Còn 3 ngày')
  assert.equal(getTaskDeadlineInfo(due(26), 'review', now)?.text, 'Còn 4 ngày')
})

test('completed tasks no longer show an overdue warning; absent or invalid dates are ignored', () => {
  const now = new Date(2026, 10, 22, 12)
  const past = '2026-11-20T00:00:00.000Z'
  assert.equal(getTaskDeadlineInfo(past, 'done', now)?.text, 'Hạn 20/11/2026')
  assert.equal(getTaskDeadlineInfo(past, 'done', now)?.className, 'text-muted-foreground')
  for (const value of [null, undefined, '', 'invalid', '2026-02-30', '2026-13-01', '2026-01-00', '2026-02-30T00:00:00.000Z']) {
    assert.equal(getTaskDateKey(value), null)
    assert.equal(getTaskDateLocal(value), null)
    assert.equal(formatTaskDate(value), null)
    assert.equal(getTaskDeadlineInfo(value, 'todo', now), null)
  }
  assert.equal(getTaskDateKey('2024-02-29'), '2024-02-29')
  assert.equal(getTaskDeadlineInfo(past, 'todo', new Date('invalid')), null)
})

test('calendar-day countdown is stable across daylight saving time changes', () => {
  const now = new Date(2026, 2, 7, 12)
  const due = '2026-03-09T00:00:00.000Z'
  assert.equal(getTaskDeadlineInfo(due, 'todo', now)?.text, 'Còn 2 ngày')
})
