/** Time tracking uses one shared business time zone regardless of the server or viewer. */
export const WORK_TIME_ZONE = 'Asia/Ho_Chi_Minh'

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: WORK_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
})
const offsetFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: WORK_TIME_ZONE, timeZoneName: 'longOffset',
})

function offsetMilliseconds(instant: number) {
  const offset = offsetFormatter.formatToParts(new Date(instant)).find((part) => part.type === 'timeZoneName')?.value
  if (offset === 'GMT') return 0
  const match = offset?.match(/^GMT([+-])(\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) throw new Error(`Không xác định được múi giờ ${WORK_TIME_ZONE}`)
  return (match[1] === '+' ? 1 : -1) * (Number(match[2]) * 3600 + Number(match[3]) * 60 + Number(match[4] || 0)) * 1000
}

/** Convert midnight on a local calendar date to an instant, including historical offsets. */
function localMidnight(wallTimeUtc: number) {
  let instant = wallTimeUtc - offsetMilliseconds(wallTimeUtc)
  for (let i = 0; i < 3; i++) {
    const next = wallTimeUtc - offsetMilliseconds(instant)
    if (next === instant) break
    instant = next
  }
  return instant
}

export function getWorkTimeBoundaries(now: Date) {
  const parts = Object.fromEntries(dateFormatter.formatToParts(now).map(({ type, value }) => [type, value]))
  const localDate = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day))
  const day = new Date(localDate).getUTCDay()
  const monday = localDate - ((day + 6) % 7) * 86_400_000
  return { todayStart: new Date(localMidnight(localDate)), weekStart: new Date(localMidnight(monday)) }
}

export function summarizeWorkTime<T extends { checkIn: Date; checkOut: Date | null }>(logs: T[], now = new Date()) {
  const nowMs = now.getTime()
  const { todayStart, weekStart } = getWorkTimeBoundaries(now)
  let todayMs = 0, weekMs = 0, totalMs = 0
  let todaySessions = 0, weekSessions = 0, totalSessions = 0
  let activeTimeLog: T | null = null

  for (const log of logs) {
    const start = log.checkIn.getTime()
    const storedEnd = log.checkOut?.getTime() ?? nowMs
    if (!Number.isFinite(start) || !Number.isFinite(storedEnd) || start > nowMs || storedEnd < start) continue
    const end = Math.min(storedEnd, nowMs)
    totalSessions++
    totalMs += end - start
    if (end > todayStart.getTime() || (start === end && start >= todayStart.getTime())) {
      todaySessions++
      todayMs += Math.max(0, end - Math.max(start, todayStart.getTime()))
    }
    if (end > weekStart.getTime() || (start === end && start >= weekStart.getTime())) {
      weekSessions++
      weekMs += Math.max(0, end - Math.max(start, weekStart.getTime()))
    }
    if (!log.checkOut && (!activeTimeLog || start > activeTimeLog.checkIn.getTime())) activeTimeLog = log
  }

  return {
    todayMinutes: Math.round(todayMs / 60_000), weekMinutes: Math.round(weekMs / 60_000),
    totalMinutes: Math.round(totalMs / 60_000), todaySessions, weekSessions, totalSessions,
    isCurrentlyWorking: Boolean(activeTimeLog), checkInTime: activeTimeLog?.checkIn.toISOString() ?? null,
    activeTimeLog, calculatedAt: now.toISOString(),
  }
}
