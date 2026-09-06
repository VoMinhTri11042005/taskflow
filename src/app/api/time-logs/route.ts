import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

/* GET /api/time-logs?mode=admin-summary or ?userId=xxx */
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const mode = searchParams.get('mode')
    const dateFrom = searchParams.get('from')
    const dateTo = searchParams.get('to')

    /* Leader summary: working hours for the managed team only. */
    if (mode === 'admin-summary' && session.role === 'leader') {
      const users = await db.user.findMany({
        where: { role: 'member', leaderId: session.id },
        select: { id: true, name: true, color: true, email: true },
        orderBy: { name: 'asc' },
      })

      const now = new Date()
      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0)

      const weekStart = new Date(todayStart)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday

      const summary = await Promise.all(
        users.map(async (u) => {
          const allLogs = await db.timeLog.findMany({
            where: { userId: u.id },
            orderBy: { checkIn: 'desc' },
          })

          const todayLogs = allLogs.filter((l) => new Date(l.checkIn) >= todayStart)
          const weekLogs = allLogs.filter((l) => new Date(l.checkIn) >= weekStart)

          let todayMinutes = 0
          for (const l of todayLogs) {
            const end = l.checkOut ? new Date(l.checkOut).getTime() : now.getTime()
            todayMinutes += (end - new Date(l.checkIn).getTime()) / 60000
          }

          let weekMinutes = 0
          for (const l of weekLogs) {
            const end = l.checkOut ? new Date(l.checkOut).getTime() : now.getTime()
            weekMinutes += (end - new Date(l.checkIn).getTime()) / 60000
          }

          let totalMinutes = 0
          for (const l of allLogs) {
            const end = l.checkOut ? new Date(l.checkOut).getTime() : now.getTime()
            totalMinutes += (end - new Date(l.checkIn).getTime()) / 60000
          }

          const openSession = allLogs.find((l) => !l.checkOut)

          return {
            userId: u.id,
            userName: u.name,
            userColor: u.color,
            userEmail: u.email,
            todayMinutes: Math.round(todayMinutes),
            weekMinutes: Math.round(weekMinutes),
            totalMinutes: Math.round(totalMinutes),
            todaySessions: todayLogs.length,
            weekSessions: weekLogs.length,
            isCurrentlyWorking: !!openSession,
            checkInTime: openSession?.checkIn?.toISOString() || null,
          }
        })
      )

      // Sort by today's hours descending
      summary.sort((a, b) => b.todayMinutes - a.todayMinutes)

      return NextResponse.json(summary)
    }

    /* Member's own logs or Leader viewing their team logs */
    const userId = searchParams.get('userId') || session.id
    const isManager = session.role === 'leader'
    if (!isManager && userId !== session.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (session.role === 'leader' && userId !== session.id) {
      const managedMember = await db.user.findFirst({
        where: { id: userId, role: 'member', leaderId: session.id },
        select: { id: true },
      })
      if (!managedMember) return NextResponse.json({ error: 'Bạn không có quyền xem nhật ký của thành viên này' }, { status: 403 })
    }

    const where: Record<string, unknown> = { userId }
    if (dateFrom || dateTo) {
      where.checkIn = {}
      if (dateFrom) (where.checkIn as Record<string, unknown>).gte = new Date(dateFrom)
      if (dateTo) (where.checkIn as Record<string, unknown>).lte = new Date(dateTo)
    }

    const logs = await db.timeLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, color: true, email: true } } },
      orderBy: { checkIn: 'desc' },
      take: 100,
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('TimeLog GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch time logs' }, { status: 500 })
  }
}

/* POST /api/time-logs — Check-in or Check-out */
export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action, note } = body

    if (action === 'check-in') {
      const openSession = await db.timeLog.findFirst({
        where: { userId: session.id, checkOut: null },
      })
      if (openSession) {
        return NextResponse.json({ error: 'Bạn đã đang trong phiên làm việc. Vui lòng check-out trước.' }, { status: 400 })
      }

      const timeLog = await db.timeLog.create({
        data: {
          userId: session.id,
          checkIn: new Date(),
          note: note || null,
        },
      })

      return NextResponse.json({ message: 'Check-in thành công!', timeLog })
    }

    if (action === 'check-out') {
      const openSession = await db.timeLog.findFirst({
        where: { userId: session.id, checkOut: null },
        orderBy: { checkIn: 'desc' },
      })

      if (!openSession) {
        return NextResponse.json({ error: 'Không tìm thấy phiên làm việc đang mở.' }, { status: 400 })
      }

      const updated = await db.timeLog.update({
        where: { id: openSession.id },
        data: {
          checkOut: new Date(),
          ...(note ? { note } : {}),
        },
      })

      const duration = (new Date(updated.checkOut!).getTime() - new Date(updated.checkIn).getTime()) / 60000

      return NextResponse.json({
        message: `Check-out thành công! Thời gian làm việc: ${Math.floor(duration / 60)} giờ ${Math.round(duration % 60)} phút`,
        timeLog: updated,
        durationMinutes: Math.round(duration),
      })
    }

    return NextResponse.json({ error: 'Invalid action. Use check-in or check-out.' }, { status: 400 })
  } catch (error) {
    console.error('TimeLog POST error:', error)
    return NextResponse.json({ error: 'Failed to process time log' }, { status: 500 })
  }
}
