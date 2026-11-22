import { differenceInCalendarDays, format, isValid } from 'date-fns'

/** Compare date-only deadlines by the viewer's calendar day, not elapsed hours. */
export function getTaskDeadlineInfo(
  value: string | null | undefined,
  status: string,
  now: Date = new Date(),
): { text: string; className: string } | null {
  if (!value) return null
  const date = new Date(value)
  if (!isValid(date) || !isValid(now)) return null

  if (status === 'done') {
    return { text: `Hạn ${format(date, 'dd/MM/yyyy')}`, className: 'text-muted-foreground' }
  }

  const days = differenceInCalendarDays(date, now)
  if (days < 0) return { text: `Quá hạn ${Math.abs(days)} ngày`, className: 'text-rose-600 dark:text-rose-400 font-semibold' }
  if (days === 0) return { text: 'Hạn hôm nay', className: 'text-amber-600 dark:text-amber-400 font-semibold' }
  if (days <= 3) return { text: `Còn ${days} ngày`, className: 'text-orange-600 dark:text-orange-400' }
  return { text: `Còn ${days} ngày`, className: 'text-muted-foreground' }
}
