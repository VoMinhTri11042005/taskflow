import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getMondayWeekStart } from '../src/lib/time-period'

test('a Sunday belongs to the week that began the previous Monday', () => {
  const sunday = new Date(2026, 10, 15, 16, 30)
  assert.equal(getMondayWeekStart(sunday).getTime(), new Date(2026, 10, 9).getTime())
  assert.equal(sunday.getHours(), 16)
})

test('Monday starts its own week at local midnight', () => {
  assert.equal(getMondayWeekStart(new Date(2026, 10, 16, 9)).getTime(), new Date(2026, 10, 16).getTime())
})

test('week start handles a month boundary', () => {
  assert.equal(getMondayWeekStart(new Date(2026, 1, 1, 9)).getTime(), new Date(2026, 0, 26).getTime())
})
