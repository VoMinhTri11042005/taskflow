import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    let allowedUserIds: string[] | null = null
    if (session.role === 'leader') {
      const members = await db.user.findMany({
        where: { role: 'member', leaderId: session.id },
        select: { id: true },
      })
      allowedUserIds = [session.id, ...members.map((member) => member.id)]
    } else if (session.role === 'member') {
      allowedUserIds = [session.id]
    }

    if (userId && allowedUserIds && !allowedUserIds.includes(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const where = userId ? { userId } : allowedUserIds ? { userId: { in: allowedUserIds } } : {}

    const logs = await db.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            color: true,
          },
        },
      },
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('Error fetching activity logs:', error)
    return NextResponse.json(
      { error: 'Không thể tải nhật ký hoạt động' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const { action, details } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Thiếu userId hoặc action' },
        { status: 400 }
      )
    }

    const validActions = ['login', 'logout', 'page_view']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Action không hợp lệ. Chỉ chấp nhận: login, logout, page_view' },
        { status: 400 }
      )
    }

    const log = await db.activityLog.create({
      data: {
        userId: session.id,
        action,
        details: details || null,
      },
    })

    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    console.error('Error creating activity log:', error)
    return NextResponse.json(
      { error: 'Không thể tạo nhật ký hoạt động' },
      { status: 500 }
    )
  }
}
