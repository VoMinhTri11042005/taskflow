import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getWorkTimeBoundaries, summarizeWorkTime } from '../src/lib/work-time'

const log = (start: string, end: string | null) => ({ checkIn: new Date(start), checkOut: end ? new Date(end) : null })

test('Vietnam midnight and Monday boundaries are independent of the server timezone', () => {
  const sunday = getWorkTimeBoundaries(new Date('2026-11-15T05:00:00Z'))
  assert.equal(sunday.todayStart.toISOString(), '2026-11-14T17:00:00.000Z')
  assert.equal(sunday.weekStart.toISOString(), '2026-11-08T17:00:00.000Z')
  const monday = getWorkTimeBoundaries(new Date('2026-11-15T17:30:00Z'))
  assert.equal(monday.todayStart.toISOString(), '2026-11-15T17:00:00.000Z')
  assert.equal(monday.weekStart.toISOString(), '2026-11-15T17:00:00.000Z')
})

test('clips overnight and week-crossing sessions and includes a running session', () => {
  const now = new Date('2026-11-15T17:30:00Z')
  const active = log('2026-11-15T17:20:00Z', null)
  const result = summarizeWorkTime([
    log('2026-11-15T16:30:00Z', '2026-11-15T17:15:00Z'),
    log('2026-11-14T18:00:00Z', '2026-11-14T19:00:00Z'),
    active,
  ], now)
  assert.equal(result.todayMinutes, 25)
  assert.equal(result.weekMinutes, 25)
  assert.equal(result.totalMinutes, 115)
  assert.equal(result.todaySessions, 2)
  assert.equal(result.weekSessions, 2)
  assert.equal(result.totalSessions, 3)
  assert.equal(result.isCurrentlyWorking, true)
  assert.equal(result.activeTimeLog, active)
  assert.equal(result.calculatedAt, now.toISOString())
})

test('full totals include more than 100 sessions and ignore invalid/future data', () => {
  const logs = Array.from({ length: 101 }, (_, i) => ({
    checkIn: new Date(Date.UTC(2026, 9, 1, i * 2)),
    checkOut: new Date(Date.UTC(2026, 9, 1, i * 2 + 1)),
  }))
  const result = summarizeWorkTime([
    ...logs,
    log('2027-01-01T00:00:00Z', null),
    log('2026-10-01T03:00:00Z', '2026-10-01T02:00:00Z'),
  ], new Date('2026-11-01T00:00:00Z'))
  assert.equal(result.totalSessions, 101)
  assert.equal(result.totalMinutes, 6060)
  assert.equal(result.isCurrentlyWorking, false)
})

test('empty history has no activity', () => {
  const result = summarizeWorkTime([], new Date('2026-01-01T00:00:00Z'))
  assert.equal(result.totalSessions, 0)
  assert.equal(result.totalMinutes, 0)
  assert.equal(result.checkInTime, null)
})
