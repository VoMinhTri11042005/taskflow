import assert from 'node:assert/strict'
import { test } from 'node:test'
import { beginTaskMutation, finishTaskMutation, hasUnsavedTaskDraft, taskLeaveDecision, type TaskFormDraft } from '../src/lib/task-draft'
import { registerTaskDetailGuard, useAppStore } from '../src/stores/app-store'
import type { Task } from '../src/types'

const form: TaskFormDraft = { title: 'Task', description: '', status: 'todo', priority: 'medium', storyPoints: '1', assigneeIds: ['a', 'b'], dueDate: '', reviewNotes: '' }
const empty = { comment: '', checklist: '', linkTitle: '', linkUrl: '' }

test('warns for actual form changes, but not after editing back to the saved values', () => {
  assert.equal(hasUnsavedTaskDraft(form, { ...form, title: 'Changed' }, empty), true)
  assert.equal(hasUnsavedTaskDraft(form, { ...form, assigneeIds: ['b', 'a'] }, empty), true)
  assert.equal(hasUnsavedTaskDraft(form, { ...form, assigneeIds: [...form.assigneeIds] }, empty), false)
  const saved = { ...form, title: 'Changed' }
  assert.equal(hasUnsavedTaskDraft(saved, { ...saved, assigneeIds: [...saved.assigneeIds] }, empty), false)
})

test('asks for a pending-write warning before leaving, even without a draft', () => {
  assert.equal(taskLeaveDecision(1, false), 'wait')
  assert.equal(taskLeaveDecision(1, true), 'wait')
  assert.equal(taskLeaveDecision(0, true), 'confirm')
  assert.equal(taskLeaveDecision(0, false), 'allow')
})

test('a late write from an old task cannot lock or unlock the current task', () => {
  const pending = new Map<number, number>()
  beginTaskMutation(pending, 1)
  assert.equal(pending.get(2) || 0, 0)
  beginTaskMutation(pending, 2)
  beginTaskMutation(pending, 2)
  finishTaskMutation(pending, 1)
  assert.equal(pending.get(2), 2)
  finishTaskMutation(pending, 2)
  assert.equal(pending.get(2), 1)
  finishTaskMutation(pending, 2)
  assert.equal(pending.has(2), false)
})

test('recognizes unsent comments, checklist items and partial links', () => {
  for (const key of Object.keys(empty) as Array<keyof typeof empty>) {
    assert.equal(hasUnsavedTaskDraft(form, form, { ...empty, [key]: 'draft' }), true, key)
  }
  assert.equal(hasUnsavedTaskDraft(form, form, { ...empty, comment: '  ' }), false)
})

test('no form baseline does not invent a changed form while task data loads', () => {
  assert.equal(hasUnsavedTaskDraft(null, form, empty), false)
  assert.equal(hasUnsavedTaskDraft(null, form, { ...empty, comment: 'draft' }), true)
})

test('task switching honors the active drawer guard and same-task navigation preserves the draft', () => {
  const first = { id: 'first', title: 'First' } as Task
  const replacement = { id: 'first', title: 'Refreshed' } as Task
  const second = { id: 'second', title: 'Second' } as Task
  useAppStore.setState({ selectedTask: first, taskDrawerOpen: true })
  const attempts: string[] = []
  const unregister = registerTaskDetailGuard((task) => { attempts.push(task.id); return false })
  try {
    useAppStore.getState().openTaskDetail(replacement)
    assert.equal(useAppStore.getState().selectedTask, first)
    assert.deepEqual(attempts, [])
    useAppStore.getState().openTaskDetail(second)
    assert.equal(useAppStore.getState().selectedTask, first)
    assert.deepEqual(attempts, ['second'])
  } finally {
    unregister()
    useAppStore.getState().closeTaskDetail()
  }
  useAppStore.getState().openTaskDetail(second)
  assert.equal(useAppStore.getState().selectedTask, second)
  useAppStore.getState().closeTaskDetail()
})

test('sign-out clears the drawer and old guard cannot block a new session', () => {
  const first = { id: 'first' } as Task
  const second = { id: 'second' } as Task
  useAppStore.getState().setUser({ id: 'one', role: 'leader' } as never)
  useAppStore.getState().openTaskDetail(first)
  let calls = 0
  const unregister = registerTaskDetailGuard(() => { calls++; return false })
  try {
    useAppStore.getState().setUser(null)
    useAppStore.getState().setUser({ id: 'one', role: 'leader' } as never)
    useAppStore.getState().openTaskDetail(second)
    assert.equal(useAppStore.getState().selectedTask, second)
    assert.equal(calls, 0)
  } finally {
    unregister()
    useAppStore.getState().setUser(null)
  }
})
