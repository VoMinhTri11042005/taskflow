import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { getSession } from '@/lib/auth'

const markReadSchema = z.object({
  notificationId: z.string().min(1, 'ID thông báo là bắt buộc'),
})

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const requestedUserId = searchParams.get('userId')
    const userId = requestedUserId || session.id

    if (userId !== session.id && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const notifications = await db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Không thể tải thông báo' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const validated = markReadSchema.parse(body)

    const notification = await db.notification.findUnique({ where: { id: validated.notificationId } })
    if (!notification) return NextResponse.json({ error: 'Không tìm thấy thông báo' }, { status: 404 })
    if (notification.userId !== session.id && session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const updated = await db.notification.update({
      where: { id: validated.notificationId },
      data: { read: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error marking notification as read:', error)
    return NextResponse.json(
      { error: 'Không thể đánh dấu đã đọc' },
      { status: 500 }
    )
  }
}
