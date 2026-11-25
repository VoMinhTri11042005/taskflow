/** Prevent older list reads from undoing a newer read or a local write. */
export function createTaskListRequestGate() {
  let sequence = 0
  let applied = 0
  let revision = 0
  return {
    begin: () => ({ sequence: ++sequence, revision }),
    invalidate: () => { revision += 1 },
    isValid: (request: { revision: number }) => request.revision === revision,
    accept: (request: { sequence: number; revision: number }) => {
      if (request.revision !== revision || request.sequence <= applied) return false
      applied = request.sequence
      return true
    },
  }
}
