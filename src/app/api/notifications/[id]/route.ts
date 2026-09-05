import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const existing = await db.notification.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy thông báo' }, { status: 404 })
    if (existing.userId !== session.id && session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const notification = await db.notification.update({
      where: { id },
      data: { read: true },
    })

    return NextResponse.json(notification)
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json(
      { error: 'Không thể đánh dấu đã đọc' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const existing = await db.notification.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy thông báo' }, { status: 404 })
    if (existing.userId !== session.id && session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await db.notification.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Không thể xóa thông báo' },
      { status: 500 }
    )
  }
}
