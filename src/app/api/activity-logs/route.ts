import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const where = userId ? { userId } : {}

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
    const body = await request.json()
    const { userId, action, details } = body

    if (!userId || !action) {
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
        userId,
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
