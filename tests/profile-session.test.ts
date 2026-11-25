import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isProfileSessionCurrent } from '../src/lib/profile-session'
import { useAppStore } from '../src/stores/app-store'
import type { User } from '../src/types'

const user = (id: string, role = 'member') => ({ id, role, name: id } as User)

test('profile responses cannot cross account, role, or logout/login session boundaries', () => {
  try {
    useAppStore.getState().setUser(user('alice'))
    const alice = { userId: 'alice', role: 'member', session: useAppStore.getState().notificationSession }
    assert.equal(isProfileSessionCurrent(useAppStore.getState(), alice), true)
    useAppStore.getState().setUser({ ...user('alice'), name: 'Updated name' })
    assert.equal(isProfileSessionCurrent(useAppStore.getState(), alice), true)
    useAppStore.getState().setUser(user('bob'))
    assert.equal(isProfileSessionCurrent(useAppStore.getState(), alice), false)
    useAppStore.getState().setUser(null)
    useAppStore.getState().setUser(user('alice'))
    assert.equal(isProfileSessionCurrent(useAppStore.getState(), alice), false)
    const newSession = { ...alice, session: useAppStore.getState().notificationSession }
    assert.equal(isProfileSessionCurrent(useAppStore.getState(), newSession), true)
    useAppStore.getState().setUser(user('alice', 'leader'))
    assert.equal(isProfileSessionCurrent(useAppStore.getState(), newSession), false)
  } finally {
    useAppStore.getState().setUser(null)
  }
})
