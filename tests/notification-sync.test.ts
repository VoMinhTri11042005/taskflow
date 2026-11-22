import assert from 'node:assert/strict'
import { test } from 'node:test'
import { useAppStore } from '../src/stores/app-store'
import type { Notification, User } from '../src/types'

const account = { id: 'a', role: 'member', name: 'A' } as User
const note = (id: string): Notification => ({ id, userId: 'a', title: id, message: id, type: 'info', read: false, createdAt: '2026-01-01T00:00:00.000Z' })

test('late notification fetches cannot undo a read or replace a newer snapshot', () => {
  useAppStore.getState().setUser(account)
  const initial = useAppStore.getState().beginNotificationLoad()!
  useAppStore.getState().applyNotificationLoad(initial, [note('one')])
  const stale = useAppStore.getState().beginNotificationLoad()!
  const mutation = useAppStore.getState().beginNotificationMutation()!
  assert.equal(useAppStore.getState().beginNotificationLoad(), null)
  assert.equal(useAppStore.getState().beginNotificationMutation(), null)
  useAppStore.getState().applyNotificationLoad(stale, [note('one')])
  useAppStore.setState({ notifications: [note('one'), note('new')] })
  useAppStore.getState().finishNotificationMutation(mutation, ['one'])
  assert.deepEqual(useAppStore.getState().notifications.map(({ id, read }) => [id, read]), [['one', true], ['new', false]])
  assert.equal(useAppStore.getState().unreadCount, 1)
  useAppStore.getState().applyNotificationLoad(stale, [note('one')])
  assert.equal(useAppStore.getState().unreadCount, 1)
  const older = useAppStore.getState().beginNotificationLoad()!
  const newer = useAppStore.getState().beginNotificationLoad()!
  useAppStore.getState().applyNotificationLoad(newer, [note('latest')])
  useAppStore.getState().applyNotificationLoad(older, [note('old')])
  assert.equal(useAppStore.getState().notifications[0].id, 'latest')
})

test('late notification work is ignored after sign-out and signing back in', () => {
  useAppStore.getState().setUser(account)
  const staleLoad = useAppStore.getState().beginNotificationLoad()!
  const staleMutation = useAppStore.getState().beginNotificationMutation()!
  useAppStore.getState().setUser(null)
  useAppStore.getState().setUser(account)
  const currentLoad = useAppStore.getState().beginNotificationLoad()!
  useAppStore.getState().applyNotificationLoad(currentLoad, [note('new-session')])
  useAppStore.getState().applyNotificationLoad(staleLoad, [note('old-session')])
  useAppStore.getState().finishNotificationMutation(staleMutation, ['new-session'])
  assert.equal(useAppStore.getState().notifications[0].id, 'new-session')
  assert.equal(useAppStore.getState().notifications[0].read, false)
  assert.equal(useAppStore.getState().unreadCount, 1)
})

test('slow requests remain useful until a newer request succeeds', () => {
  useAppStore.getState().setUser(account)
  const slow = useAppStore.getState().beginNotificationLoad()!
  const failed = useAppStore.getState().beginNotificationLoad()!
  // A later request can fail or still be in flight; it must not starve a
  // successful slow response from the same session and revision.
  useAppStore.getState().applyNotificationLoad(slow, [note('slow-success')])
  assert.equal(useAppStore.getState().notifications[0].id, 'slow-success')
  assert.equal(useAppStore.getState().notificationAppliedRequest, slow.request)
  // A later successful response supersedes that result, and the older one
  // cannot replace it if it arrives again.
  useAppStore.getState().applyNotificationLoad(failed, [note('later-success')])
  useAppStore.getState().applyNotificationLoad(slow, [note('obsolete')])
  assert.equal(useAppStore.getState().notifications[0].id, 'later-success')
})
