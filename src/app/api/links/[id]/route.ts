import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { canManageTask } from '@/lib/permissions'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const link = await db.taskLink.findUnique({ where: { id }, select: { taskId: true } })
    if (!link) return NextResponse.json({ error: 'Không tìm thấy link' }, { status: 404 })
    if (!(await canManageTask(session, link.taskId))) {
      return NextResponse.json({ error: 'Chỉ Leader quản lý công việc mới có thể xóa link' }, { status: 403 })
    }
    await db.taskLink.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }
    console.error('Error deleting link:', error)
    return NextResponse.json(
      { error: 'Failed to delete link' },
      { status: 500 }
    )
  }
}
