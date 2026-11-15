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

async function notifyTaskParticipants(input: {
  projectId: string
  leaderId: string
  authorId: string
  authorName: string
  taskTitle: string
  assigneeEmails: string[]
  comment: string
}) {
  try {
    // Notify only currently approved participants, never the author.
    const recipients = await db.user.findMany({
      where: {
        id: { not: input.authorId },
        status: 'approved',
        OR: [
          { id: input.leaderId, role: 'leader' },
          { email: { in: input.assigneeEmails }, role: 'member', leaderId: input.leaderId,
            projectMemberships: { some: { projectId: input.projectId, status: 'approved' } } },
        ],
      },
      select: { id: true },
    })
    if (!recipients.length) return

    const preview = input.comment.length > 180
      ? `${input.comment.slice(0, 177).trimEnd()}…`
      : input.comment

    await db.notification.createMany({
      data: recipients.map((recipient) => ({
        userId: recipient.id,
        title: `Nhận xét mới từ ${input.authorName}`,
        message: `${input.authorName} đã nhận xét về công việc “${input.taskTitle}”: ${preview}`,
        type: input.authorId === input.leaderId ? 'leader_comment' : 'info',
      })),
    })
  } catch (error) {
    // Saving a comment must remain successful even if notification delivery
    // is temporarily unavailable.
    console.error('Error notifying assignee about Leader comment:', error)
  }
}

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
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        assignee: { select: { email: true } },
        assignments: { select: { member: { select: { email: true } } } },
        project: { select: { id: true, leaderId: true } },
      },
    })
    if (!task) return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 })

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

    if (task.project.leaderId) {
      await notifyTaskParticipants({
        projectId: task.project.id,
        leaderId: task.project.leaderId,
        authorId: session.id,
        authorName: session.name,
        taskTitle: task.title,
        assigneeEmails: [...new Set([...task.assignments.map(({ member }) => member.email), ...(task.assignee ? [task.assignee.email] : [])])],
        comment: content,
      })
    }

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Nội dung bình luận không hợp lệ', details: error.issues }, { status: 400 })
    }
    console.error('Error creating task comment:', error)
    return NextResponse.json({ error: 'Không thể gửi bình luận' }, { status: 500 })
  }
}
