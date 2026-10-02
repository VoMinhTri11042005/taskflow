import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { canAccessTask, canAssignProjectMember, canManageProject, canManageTask } from '@/lib/permissions'
import { withNormalizedProjectName } from '@/lib/project-name'

const taskStatusSchema = z.enum(['todo', 'in_progress', 'review', 'done'])
const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  description: z.string().trim().max(10_000).optional().nullable(),
  status: taskStatusSchema.optional(),
  priority: prioritySchema.optional(),
  storyPoints: z.coerce.number().int().min(1).max(100).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  projectId: z.string().min(1).optional(),
  assigneeId: z.string().optional().nullable(),
  reviewNotes: z.string().trim().max(5_000).optional().nullable(),
})

const detailInclude = {
  assignee: true,
  project: true,
  links: true,
  checklist: { orderBy: { position: 'asc' as const } },
  comments: {
    include: { user: { select: { id: true, name: true, color: true, avatar: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  activities: {
    include: { user: { select: { id: true, name: true, color: true, avatar: true } } },
    orderBy: { createdAt: 'desc' as const },
    take: 50,
  },
}

const statusLabels: Record<string, string> = {
  todo: 'Cần làm',
  in_progress: 'Đang làm',
  review: 'Chờ xem xét',
  done: 'Hoàn thành',
}

function serializeTask<T extends { project: { name: string } }>(task: T): T {
  return { ...task, project: withNormalizedProjectName(task.project) }
}

async function recordTaskActivity(input: {
  taskId: string
  userId: string
  action: string
  details?: string
}) {
  try {
    await db.taskActivity.create({ data: input })
  } catch (error) {
    console.error('Error recording task activity:', error)
  }
}

async function createTaskNotification(input: {
  userId: string
  title: string
  message: string
  type: string
}) {
  try {
    await db.notification.create({ data: input })
  } catch (error) {
    // Notification delivery is non-critical; a saved task must never cause
    // the client to retry merely because this secondary write failed.
    console.error('Error creating task notification:', error)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canAccessTask(session, id))) {
      return NextResponse.json({ error: 'Bạn không có quyền xem công việc này' }, { status: 403 })
    }

    const task = await db.task.findUnique({ where: { id }, include: detailInclude })
    if (!task) return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 })

    return NextResponse.json(serializeTask(task), {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json({ error: 'Không thể tải chi tiết công việc' }, { status: 500 })
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
    const validated = updateTaskSchema.parse(await request.json())

    const canManage = await canManageTask(session, id)
    const currentTask = await db.task.findUnique({
      where: { id },
      select: {
        title: true,
        projectId: true,
        status: true,
        reviewStatus: true,
        assigneeId: true,
        assignee: { select: { email: true } },
      },
    })
    if (!currentTask) return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 })

    if (!canManage) {
      if (!(await canAccessTask(session, id))) {
        return NextResponse.json({ error: 'Bạn không có quyền cập nhật công việc này' }, { status: 403 })
      }
      const attemptedManagerFields = [
        'title', 'description', 'priority', 'storyPoints', 'dueDate', 'projectId', 'assigneeId',
      ].some((field) => Object.prototype.hasOwnProperty.call(validated, field))
      if (attemptedManagerFields || validated.status === 'done') {
        return NextResponse.json({
          error: 'Thành viên chỉ có thể cập nhật tiến độ, ghi chú xem xét và checklist của công việc được giao',
        }, { status: 403 })
      }
    } else {
      if (validated.projectId && !(await canManageProject(session, validated.projectId))) {
        return NextResponse.json({ error: 'Bạn không có quyền chuyển công việc sang dự án này' }, { status: 403 })
      }
      if (validated.assigneeId) {
        const destinationProjectId = validated.projectId || currentTask.projectId
        if (!(await canAssignProjectMember(session, destinationProjectId, validated.assigneeId))) {
          return NextResponse.json({ error: 'Chỉ có thể giao việc cho Member đã thuộc dự án đích' }, { status: 403 })
        }
      }
      if (
        validated.projectId &&
        validated.projectId !== currentTask.projectId &&
        validated.assigneeId === undefined &&
        currentTask.assigneeId &&
        !(await canAssignProjectMember(session, validated.projectId, currentTask.assigneeId))
      ) {
        return NextResponse.json({
          error: 'Hãy bỏ giao hoặc chọn Member thuộc dự án đích trước khi chuyển công việc',
        }, { status: 409 })
      }
    }

    const data: Record<string, unknown> = { ...validated }
    if (validated.dueDate !== undefined) {
      data.dueDate = validated.dueDate ? new Date(validated.dueDate) : null
    }

    const nextStatus = validated.status ?? currentTask.status
    if (!canManage && validated.status !== undefined) {
      data.reviewStatus = validated.status === 'review' ? 'pending' : null
    }
    if (canManage && validated.status !== undefined) {
      if (validated.status === 'done') data.reviewStatus = 'approved'
      else if (currentTask.reviewStatus === 'pending') data.reviewStatus = 'changes_requested'
      else if (validated.status === 'review') data.reviewStatus = 'pending'
    }

    const task = await db.task.update({ where: { id }, data, include: detailInclude })

    if (validated.status !== undefined && validated.status !== currentTask.status) {
      await recordTaskActivity({
        taskId: id,
        userId: session.id,
        action: canManage ? 'status_changed' : validated.status === 'review' ? 'review_requested' : 'progress_updated',
        details: `${statusLabels[currentTask.status]} → ${statusLabels[nextStatus]}`,
      })
    } else if (validated.reviewNotes !== undefined) {
      await recordTaskActivity({ taskId: id, userId: session.id, action: 'review_note_updated', details: 'Đã cập nhật ghi chú xem xét' })
    } else if (Object.keys(validated).length > 0) {
      await recordTaskActivity({ taskId: id, userId: session.id, action: 'updated', details: 'Đã cập nhật thông tin công việc' })
    }

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
        await createTaskNotification({
          userId: assigneeUser.id,
          title: 'Bạn được giao công việc',
          message: `${session.name} đã giao cho bạn công việc “${task.title}” trong dự án “${task.project.name}”.`,
          type: 'task_assigned',
        })
      }
    }

    if (!canManage && validated.status === 'review' && currentTask.status !== 'review' && task.project.leaderId) {
      await createTaskNotification({
        title: 'Yêu cầu xem xét công việc',
        message: `${session.name} đã gửi “${task.title}” để bạn xem xét.`,
        type: 'task_completed',
        userId: task.project.leaderId,
      })
    }

    if (canManage && currentTask.reviewStatus === 'pending' && validated.status !== undefined && currentTask.assignee?.email) {
      const assigneeUser = await db.user.findUnique({
        where: { email: currentTask.assignee.email },
        select: { id: true, status: true },
      })
      if (assigneeUser?.status === 'approved') {
        const approved = validated.status === 'done'
        await createTaskNotification({
          userId: assigneeUser.id,
          title: approved ? 'Công việc đã được duyệt' : 'Công việc cần cập nhật thêm',
          message: approved
            ? `${session.name} đã duyệt công việc “${task.title}”.`
            : `${session.name} đã gửi lại công việc “${task.title}”. Vui lòng xem ghi chú và cập nhật.`,
          type: approved ? 'task_completed' : 'task_assigned',
        })
        await recordTaskActivity({
          taskId: id,
          userId: session.id,
          action: approved ? 'review_approved' : 'review_changes_requested',
          details: approved ? 'Đã duyệt hoàn thành' : 'Đã yêu cầu cập nhật thêm',
        })
      }
    }

    return NextResponse.json(serializeTask(task))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dữ liệu công việc không hợp lệ', details: error.issues }, { status: 400 })
    }
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 })
    }
    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Không thể cập nhật công việc' }, { status: 500 })
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
    if (!(await canManageTask(session, id))) {
      return NextResponse.json({ error: 'Bạn không có quyền xóa công việc này' }, { status: 403 })
    }
    await db.task.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 })
    }
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Không thể xóa công việc' }, { status: 500 })
  }
}
