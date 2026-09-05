import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { canAccessTask, canManageProject, canManageTask } from '@/lib/permissions'

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.string().optional(),
  priority: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  projectId: z.string().optional(),
  assigneeId: z.string().optional().nullable(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canAccessTask(session, id))) return NextResponse.json({ error: 'Bạn không có quyền xem công việc này' }, { status: 403 })
    const task = await db.task.findUnique({
      where: { id },
      include: {
        assignee: true,
        project: true,
        links: true,
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const validated = updateTaskSchema.parse(body)

    const canManage = await canManageTask(session, id)
    const currentTask = await db.task.findUnique({ where: { id }, select: { projectId: true, status: true, assigneeId: true } })
    if (!currentTask) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    if (!canManage) {
      if (!(await canAccessTask(session, id))) return NextResponse.json({ error: 'Bạn không có quyền cập nhật công việc này' }, { status: 403 })
      const attemptedManagerFields = ['title', 'description', 'priority', 'dueDate', 'projectId', 'assigneeId']
        .some((field) => validated[field as keyof typeof validated] !== undefined)
      if (attemptedManagerFields || validated.status === undefined) {
        return NextResponse.json({ error: 'Thành viên chỉ được cập nhật trạng thái công việc được giao' }, { status: 403 })
      }
    } else {
      if (validated.projectId && !(await canManageProject(session, validated.projectId))) {
        return NextResponse.json({ error: 'Bạn không có quyền chuyển công việc sang dự án này' }, { status: 403 })
      }
      if (validated.assigneeId) {
        const assignee = await db.teamMember.findUnique({ where: { id: validated.assigneeId }, select: { role: true } })
        if (!assignee || assignee.role !== 'member') return NextResponse.json({ error: 'Chỉ có thể giao việc cho tài khoản Member' }, { status: 400 })
      }
    }

    const data: Record<string, unknown> = { ...validated }
    if (validated.dueDate !== undefined) {
      data.dueDate = validated.dueDate ? new Date(validated.dueDate) : null
    }

    const task = await db.task.update({
      where: { id },
      data,
      include: {
        assignee: true,
        project: true,
        links: true,
      },
    })

    if (
      canManage &&
      validated.assigneeId &&
      validated.assigneeId !== currentTask.assigneeId &&
      task.assignee?.email
    ) {
      const assigneeUser = await db.user.findUnique({
        where: { email: task.assignee.email },
        select: { id: true, status: true },
      })
      if (assigneeUser?.status === 'approved') {
        await db.notification.create({
          data: {
            userId: assigneeUser.id,
            title: 'Bạn được giao công việc',
            message: `${session.name} đã giao cho bạn công việc “${task.title}” trong dự án “${task.project.name}”.`,
            type: 'task_assigned',
          },
        })
      }
    }

    // A member's review request is a server-side event, not a best-effort
    // browser request. This keeps the Leader notification durable even if the
    // member refreshes or closes the page immediately after changing status.
    if (!canManage && validated.status === 'review' && currentTask.status !== 'review' && task.project.leaderId) {
      await db.notification.create({
        data: {
          title: 'Yêu cầu xem xét công việc',
          message: `${session.name} đã chuyển công việc "${task.title}" sang chờ xem xét.`,
          type: 'task_completed',
          userId: task.project.leaderId,
        },
      })
    }

    return NextResponse.json(task)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canManageTask(session, id))) return NextResponse.json({ error: 'Bạn không có quyền xóa công việc này' }, { status: 403 })
    await db.task.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
