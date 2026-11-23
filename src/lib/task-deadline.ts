import { differenceInCalendarDays, format, isValid } from 'date-fns'

/**
 * Task deadlines represent calendar dates. Existing forms store a selected
 * date as midnight UTC; never interpret that instant in the viewer's timezone.
 * For older timestamp values, use their UTC calendar date as well.
 */
export function getTaskDateKey(value: string | null | undefined): string | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const validation = new Date(0)
  validation.setUTCFullYear(year, month - 1, day)
  if (validation.getUTCFullYear() !== year || validation.getUTCMonth() !== month - 1 || validation.getUTCDate() !== day) return null

  const instant = new Date(value)
  if (!isValid(instant)) return null
  const iso = instant.toISOString()
  // HTML date inputs and our API use four-digit years.
  return /^\d{4}-\d{2}-\d{2}T/.test(iso) ? iso.slice(0, 10) : null
}

/** Create a local calendar date for display and date-fns calendar operations. */
export function getTaskDateLocal(value: string | null | undefined): Date | null {
  const key = getTaskDateKey(value)
  if (!key) return null
  const [year, month, day] = key.split('-').map(Number)
  const local = new Date(0)
  local.setHours(12, 0, 0, 0)
  local.setFullYear(year, month - 1, day)
  return local
}

export function formatTaskDate(value: string | null | undefined, pattern = 'dd/MM/yyyy'): string | null {
  const date = getTaskDateLocal(value)
  return date ? format(date, pattern) : null
}

/** Compare deadline calendar dates to the viewer's current calendar day. */
export function getTaskDeadlineInfo(
  value: string | null | undefined,
  status: string,
  now: Date = new Date(),
): { text: string; className: string } | null {
  const date = getTaskDateLocal(value)
  if (!date || !isValid(now)) return null

  if (status === 'done') {
    return { text: `Hạn ${format(date, 'dd/MM/yyyy')}`, className: 'text-muted-foreground' }
  }

  const days = differenceInCalendarDays(date, now)
  if (days < 0) return { text: `Quá hạn ${Math.abs(days)} ngày`, className: 'text-rose-600 dark:text-rose-400 font-semibold' }
  if (days === 0) return { text: 'Hạn hôm nay', className: 'text-amber-600 dark:text-amber-400 font-semibold' }
  if (days <= 3) return { text: `Còn ${days} ngày`, className: 'text-orange-600 dark:text-orange-400' }
  return { text: `Còn ${days} ngày`, className: 'text-muted-foreground' }
}
