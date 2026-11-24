import type { Task } from '@/types'

export type TaskFormDraft = {
  title: string
  description: string
  status: Task['status']
  priority: Task['priority']
  storyPoints: string
  assigneeIds: string[]
  dueDate: string
  reviewNotes: string
}

/** Compare against the actual loaded/saved form, including assignee order. */
export function hasUnsavedTaskDraft(
  initial: TaskFormDraft | null,
  current: TaskFormDraft,
  extra: { comment: string; checklist: string; linkTitle: string; linkUrl: string },
): boolean {
  if (Object.values(extra).some((value) => value.trim().length > 0)) return true
  if (!initial) return false
  return initial.title !== current.title || initial.description !== current.description ||
    initial.status !== current.status || initial.priority !== current.priority ||
    initial.storyPoints !== current.storyPoints || initial.dueDate !== current.dueDate ||
    initial.reviewNotes !== current.reviewNotes ||
    initial.assigneeIds.length !== current.assigneeIds.length ||
    initial.assigneeIds.some((id, index) => id !== current.assigneeIds[index])
}

export function taskLeaveDecision(pendingMutations: number, hasDraft: boolean): 'wait' | 'confirm' | 'allow' {
  if (pendingMutations > 0) return 'wait'
  return hasDraft ? 'confirm' : 'allow'
}

/** A previous task/session's late response must not release the current task's lock. */
export function beginTaskMutation(pending: Map<number, number>, generation: number): void {
  pending.set(generation, (pending.get(generation) || 0) + 1)
}

export function finishTaskMutation(pending: Map<number, number>, generation: number): void {
  const count = pending.get(generation) || 0
  if (count <= 1) pending.delete(generation)
  else pending.set(generation, count - 1)
}
