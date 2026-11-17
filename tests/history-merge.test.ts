import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TimeLog } from '../src/types'
import { mergeHistoryLogs } from '../src/components/views/member/time-tracking-view'

const log = (id: string, checkIn: string, checkOut: string | null = null): TimeLog => ({
  id, checkIn, checkOut, userId: 'u', createdAt: checkIn,
})

test('merge preserves newest data, removes duplicates and fills gaps in chronological order', () => {
  const oldest = log('a', '2026-01-01T00:00:00.000Z')
  const middle = log('m', '2026-01-02T00:00:00.000Z')
  const newest = log('z', '2026-01-03T00:00:00.000Z', '2026-01-03T01:00:00.000Z')
  const staleNewest = { ...newest, checkOut: null }
  const merged = mergeHistoryLogs([newest, oldest], [middle, staleNewest])
  assert.deepEqual(merged.map((entry) => entry.id), ['z', 'm', 'a'])
  assert.equal(merged[0].checkOut, newest.checkOut)
})

test('merge uses descending identifiers for identical check-in timestamps', () => {
  const at = '2026-01-02T00:00:00.000Z'
  assert.deepEqual(mergeHistoryLogs([log('b', at)], [log('c', at), log('a', at)]).map((entry) => entry.id), ['c', 'b', 'a'])
})
