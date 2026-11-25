/** Count each shared task once in the project totals, regardless of assignees. */
export function summarizeTeamTasks(members: Array<{ assignedTasks: Array<{ id: string; status: string }> }>) {
  const tasks = new Map<string, string>()
  for (const member of members) {
    for (const task of member.assignedTasks) {
      if (!tasks.has(task.id)) tasks.set(task.id, task.status)
    }
  }
  const total = tasks.size
  const done = [...tasks.values()].filter((status) => status === 'done').length
  return { total, done, completionRate: total ? Math.round((done / total) * 100) : 0 }
}
