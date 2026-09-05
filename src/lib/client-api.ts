/**
 * Converts an unsuccessful API response into a useful error before a screen
 * changes its local state. This prevents the UI from showing a saved change
 * which only disappears after the next refresh.
 */
export async function ensureApiSuccess(response: Response, fallback: string) {
  if (response.ok) return

  const body = await response.json().catch(() => null)
  const message =
    body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
      ? body.error
      : fallback

  throw new Error(message)
}

export async function readApiJson<T>(response: Response, fallback: string): Promise<T> {
  await ensureApiSuccess(response, fallback)
  return response.json() as Promise<T>
}
