import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getMondayWeekStart } from '@/lib/time-period'

/* GET /api/time-logs?mode=admin-summary or ?userId=xxx */
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const activeUser = await db.user.findFirst({
      where: { id: session.id, role: session.role, status: 'approved' },
      select: { id: true },
    })
    if (!activeUser) return NextResponse.json({ error: 'Phiên đăng nhập không còn hợp lệ' }, { status: 401 })

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

      const weekStart = getMondayWeekStart(now)

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

    if (action !== 'check-in' && action !== 'check-out') {
      return NextResponse.json({ error: 'Invalid action. Use check-in or check-out.' }, { status: 400 })
    }

    // Serialize check-in/out for each user within a transaction so two tabs
    // cannot both observe an empty session and create duplicate open logs.
    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${session.id} FOR UPDATE`
      const activeUser = await tx.user.findFirst({
        where: { id: session.id, role: session.role, status: 'approved' },
        select: { id: true },
      })
      if (!activeUser) return { error: 'Phiên đăng nhập không còn hợp lệ', status: 401 } as const

      const openSession = await tx.timeLog.findFirst({
        where: { userId: session.id, checkOut: null },
        orderBy: { checkIn: 'desc' },
      })
      if (action === 'check-in') {
        if (openSession) return { error: 'Bạn đã đang trong phiên làm việc. Vui lòng check-out trước.', status: 400 } as const
        const timeLog = await tx.timeLog.create({
          data: { userId: session.id, checkIn: new Date(), note: note || null },
        })
        return { message: 'Check-in thành công!', timeLog }
      }
      if (!openSession) return { error: 'Không tìm thấy phiên làm việc đang mở.', status: 400 } as const
      const timeLog = await tx.timeLog.update({
        where: { id: openSession.id },
        data: { checkOut: new Date(), ...(note ? { note } : {}) },
      })
      const duration = (timeLog.checkOut!.getTime() - timeLog.checkIn.getTime()) / 60000
      return {
        message: `Check-out thành công! Thời gian làm việc: ${Math.floor(duration / 60)} giờ ${Math.round(duration % 60)} phút`,
        timeLog,
        durationMinutes: Math.round(duration),
      }
    })
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result)
  } catch (error) {
    console.error('TimeLog POST error:', error)
    return NextResponse.json({ error: 'Failed to process time log' }, { status: 500 })
  }
}
