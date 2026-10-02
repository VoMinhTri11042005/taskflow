import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { canAccessTask } from '@/lib/permissions'

const createCommentSchema = z.object({
  content: z.string().trim().min(1, 'Nội dung bình luận không được để trống').max(4_000, 'Bình luận quá dài'),
})

const commentUserSelect = {
  id: true,
  name: true,
  color: true,
  avatar: true,
} as const

/**
 * Comments are deliberately available to every task viewer.  The task-level
 * permission check keeps a member from discovering comments on a task that
 * belongs to a different project or is assigned to another member.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 })

    if (!(await canAccessTask(session, taskId))) {
      return NextResponse.json({ error: 'Bạn không có quyền xem bình luận của công việc này' }, { status: 403 })
    }

    const comments = await db.taskComment.findMany({
      where: { taskId },
      include: { user: { select: commentUserSelect } },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(comments, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    console.error('Error fetching task comments:', error)
    return NextResponse.json({ error: 'Không thể tải bình luận' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 })

    if (!(await canAccessTask(session, taskId))) {
      return NextResponse.json({ error: 'Bạn không có quyền bình luận công việc này' }, { status: 403 })
    }

    const { content } = createCommentSchema.parse(await request.json())

    // Keep the visible comment and its audit event atomic.  The activity does
    // not copy arbitrary comment text, so task timelines remain compact and
    // do not accidentally expose a long or sensitive message twice.
    const comment = await db.$transaction(async (tx) => {
      const created = await tx.taskComment.create({
        data: { taskId, userId: session.id, content },
        include: { user: { select: commentUserSelect } },
      })

      await tx.taskActivity.create({
        data: {
          taskId,
          userId: session.id,
          action: 'comment_created',
          details: 'Đã thêm một bình luận',
        },
      })

      return created
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Nội dung bình luận không hợp lệ', details: error.issues }, { status: 400 })
    }
    console.error('Error creating task comment:', error)
    return NextResponse.json({ error: 'Không thể gửi bình luận' }, { status: 500 })
  }
}
