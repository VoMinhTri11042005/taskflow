import assert from 'node:assert/strict'
import { test } from 'node:test'
import { useAppStore } from '../src/stores/app-store'
import type { User } from '../src/types'

const user: User = { id: 'one', email: 'one@example.test', name: 'One', role: 'member', color: '#000' }

test('switching or signing out clears workspace-specific data and selections', () => {
  useAppStore.getState().setUser(user)
  useAppStore.setState({ selectedProjectId: 'old-project', searchQuery: 'private search', taskDrawerOpen: true, unreadCount: 2 })
  useAppStore.getState().setUser({ ...user, id: 'two', email: 'two@example.test' })
  const current = useAppStore.getState()
  assert.equal(current.selectedProjectId, null)
  assert.equal(current.searchQuery, '')
  assert.equal(current.taskDrawerOpen, false)
  assert.equal(current.unreadCount, 0)
  useAppStore.setState({ selectedProjectId: 'new-project' })
  useAppStore.getState().setUser(null)
  assert.equal(useAppStore.getState().selectedProjectId, null)
})

test('updating the same user profile preserves workspace selections', () => {
  useAppStore.getState().setUser(user)
  useAppStore.setState({ selectedProjectId: 'project' })
  useAppStore.getState().setUser({ ...user, name: 'Updated name' })
  assert.equal(useAppStore.getState().selectedProjectId, 'project')
  useAppStore.getState().setUser(null)
})
