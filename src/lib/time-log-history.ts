/** Cursor data is a pagination hint, not an authorization token. */
export type HistoryCursor = { v: 1; userId: string; id: string; checkIn: string; from: string | null; to: string | null }

export function encodeHistoryCursor(cursor: HistoryCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

export function decodeHistoryCursor(
  value: string,
  scope: { userId: string; from: string | null; to: string | null },
): HistoryCursor | null {
  if (!value || value.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(value)) return null
  try {
    const decoded = Buffer.from(value, 'base64url')
    if (decoded.toString('base64url') !== value) return null
    const parsed: unknown = JSON.parse(decoded.toString('utf8'))
    if (!parsed || typeof parsed !== 'object') return null
    const candidate = parsed as Record<string, unknown>
    if (candidate.v !== 1 || candidate.userId !== scope.userId || candidate.from !== scope.from || candidate.to !== scope.to ||
      typeof candidate.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(candidate.id) ||
      typeof candidate.checkIn !== 'string') return null
    const date = new Date(candidate.checkIn)
    if (!Number.isFinite(date.getTime()) || date.toISOString() !== candidate.checkIn ||
      (scope.from && date.getTime() < new Date(scope.from).getTime()) ||
      (scope.to && date.getTime() > new Date(scope.to).getTime())) return null
    return { v: 1, userId: scope.userId, id: candidate.id, checkIn: candidate.checkIn, from: scope.from, to: scope.to }
  } catch {
    return null
  }
}
