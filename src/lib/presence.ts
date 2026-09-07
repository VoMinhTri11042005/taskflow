import { db } from '@/lib/db'

// A browser renews its signal regularly while TaskFlow is open. Two minutes
// tolerates browser timer throttling in a background tab without leaving a
// closed browser online for an unreasonable amount of time.
export const ONLINE_WINDOW_MS = 120_000

const MIN_PRESENCE_UPDATE_INTERVAL_MS = 15_000

/**
 * Refresh the online signal for one authenticated account.
 *
 * Presence deliberately reuses one internal ActivityLog row per user so this
 * feature can be deployed safely to the existing production database without
 * a Prisma schema migration. The function is server-side only: callers always
 * provide an id obtained from a verified session or database account.
 */
export async function renewPresence(userId: string): Promise<Date> {
  const now = new Date()
  const existing = await db.activityLog.findFirst({
    where: { userId, action: 'presence' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, details: true, createdAt: true },
  })

  const shouldUpdate = !existing
    || existing.details !== 'online'
    || now.getTime() - existing.createdAt.getTime() >= MIN_PRESENCE_UPDATE_INTERVAL_MS

  if (!shouldUpdate && existing) return existing.createdAt

  if (existing) {
    await db.activityLog.update({
      where: { id: existing.id },
      data: { details: 'online', createdAt: now },
    })
  } else {
    await db.activityLog.create({
      data: { userId, action: 'presence', details: 'online', createdAt: now },
    })
  }

  return now
}
