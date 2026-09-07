import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// A tab renews this signal every 20 seconds. Keeping a short grace period
// handles an occasional delayed request without leaving a closed tab online.
const ONLINE_WINDOW_MS = 55_000
const MIN_UPDATE_INTERVAL_MS = 10_000

export const dynamic = 'force-dynamic'

/**
 * Returns a manager-safe, bulk presence snapshot. It intentionally does not
 * expose activity history: Admin can see account presence, and a Leader can
 * see only Members assigned to that Leader.
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userWhere: Prisma.UserWhereInput = session.role === 'admin'
      ? { role: { in: ['leader', 'member'] } }
      : session.role === 'leader'
        ? { role: 'member', leaderId: session.id }
        : { id: session.id }

    const users = await db.user.findMany({
      where: userWhere,
      select: { id: true },
    })
    const userIds = users.map((user) => user.id)
    const presenceLogs = userIds.length > 0
      ? await db.activityLog.findMany({
          where: { userId: { in: userIds }, action: 'presence' },
          orderBy: { createdAt: 'desc' },
          select: { userId: true, details: true, createdAt: true },
        })
      : []

    // A user normally owns one reused presence log. Selecting the first
    // record per user also handles a harmless race when two tabs open at once.
    const latestByUser = new Map<string, { details: string | null; createdAt: Date }>()
    for (const log of presenceLogs) {
      if (!latestByUser.has(log.userId)) latestByUser.set(log.userId, log)
    }
    const cutoff = Date.now() - ONLINE_WINDOW_MS
    const presence = userIds.map((userId) => {
      const latest = latestByUser.get(userId)
      return {
        userId,
        online: Boolean(latest && latest.details === 'online' && latest.createdAt.getTime() >= cutoff),
        lastSeenAt: latest?.createdAt.toISOString() || null,
      }
    })

    return NextResponse.json(
      { presence, expiresAfterSeconds: ONLINE_WINDOW_MS / 1000 },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error) {
    console.error('Error reading presence:', error)
    return NextResponse.json({ error: 'Không thể tải trạng thái trực tuyến' }, { status: 500 })
  }
}

/**
 * The authenticated browser reports only its own presence; userId is never
 * accepted from the client, which prevents a user from marking another
 * account online.
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (body?.status !== 'online') {
      return NextResponse.json({ error: 'Trạng thái hiện diện không hợp lệ' }, { status: 400 })
    }

    const now = new Date()
    const existing = await db.activityLog.findFirst({
      where: { userId: session.id, action: 'presence' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true },
    })
    const shouldRenew = !existing || now.getTime() - existing.createdAt.getTime() >= MIN_UPDATE_INTERVAL_MS
    if (shouldRenew) {
      if (existing) {
        await db.activityLog.update({
          where: { id: existing.id },
          data: { details: 'online', createdAt: now },
        })
      } else {
        await db.activityLog.create({
          data: { userId: session.id, action: 'presence', details: 'online', createdAt: now },
        })
      }
    }

    return NextResponse.json({ online: true }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error) {
    console.error('Error updating presence:', error)
    return NextResponse.json({ error: 'Không thể cập nhật trạng thái trực tuyến' }, { status: 500 })
  }
}
