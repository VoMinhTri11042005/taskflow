import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { canAssignProjectMember, canManageProject, isActiveLeader, isManager } from '@/lib/permissions'
import { withNormalizedProjectName } from '@/lib/project-name'

const taskStatusSchema = z.enum(['todo', 'in_progress', 'review', 'done'])
const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])

const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề công việc là bắt buộc').max(180),
  description: z.string().trim().max(10_000).optional().nullable(),
  status: taskStatusSchema.optional().default('todo'),
  priority: prioritySchema.optional().default('medium'),
  storyPoints: z.coerce.number().int().min(1).max(100).optional().default(1),
  dueDate: z.string().datetime().optional().nullable(),
  projectId: z.string().min(1, 'Project ID is required'),
  assigneeId: z.string().optional().nullable(),
})

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
    // A task must remain usable even if the non-critical audit timeline fails.
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
    // The task write has already succeeded.  Do not turn a transient
    // notification failure into a false error that causes duplicate retries.
    console.error('Error creating task notification:', error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = request.nextUrl
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const assigneeId = searchParams.get('assigneeId')

    let where: Record<string, unknown> = { id: '__no_task_access__' }
    if (session.role === 'leader' && await isActiveLeader(session)) {
      where = { project: { leaderId: session.id } }
    } else if (session.role === 'member' && session.teamMemberId) {
      const memberAccount = await db.user.findUnique({
        where: { id: session.id },
        select: { role: true, status: true, leaderId: true },
      })
      if (memberAccount?.role === 'member' && memberAccount.status === 'approved' && memberAccount.leaderId) {
        where = {
          assigneeId: session.teamMemberId,
          project: {
            leaderId: memberAccount.leaderId,
            members: { some: { userId: session.id, status: 'approved' } },
          },
        }
      }
    }

    if (projectId) where.projectId = projectId
    if (status) where.status = status
    // A Member must always stay scoped to their own TeamMember record.  An
    // arbitrary `assigneeId` query parameter must never widen that scope.
    if (session.role === 'leader' && assigneeId) where.assigneeId = assigneeId

    const tasks = await db.task.findMany({
      where,
      include: {
        assignee: true,
        project: true,
        links: true,
        checklist: { orderBy: { position: 'asc' } },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(tasks.map(serializeTask), {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Không thể tải danh sách công việc' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isManager(session)) {
      return NextResponse.json({ error: 'Chỉ Leader mới có thể tạo công việc' }, { status: 403 })
    }

    const validated = createTaskSchema.parse(await request.json())
    if (!(await canManageProject(session, validated.projectId))) {
      return NextResponse.json({ error: 'Bạn không có quyền tạo công việc trong dự án này' }, { status: 403 })
    }
    if (validated.assigneeId && !(await canAssignProjectMember(session, validated.projectId, validated.assigneeId))) {
      return NextResponse.json({ error: 'Chỉ có thể giao việc cho Member đã thuộc dự án này' }, { status: 403 })
    }

    const task = await db.task.create({
      data: {
        title: validated.title,
        description: validated.description || null,
        status: validated.status,
        priority: validated.priority,
        storyPoints: validated.storyPoints,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
        projectId: validated.projectId,
        assigneeId: validated.assigneeId || null,
      },
      include: {
        assignee: true,
        project: true,
        links: true,
        checklist: true,
      },
    })

    await recordTaskActivity({
      taskId: task.id,
      userId: session.id,
      action: 'created',
      details: `Đã tạo công việc “${task.title}”`,
    })

    if (task.assignee?.email) {
      const assigneeUser = await db.user.findUnique({
        where: { email: task.assignee.email },
        select: { id: true, status: true },
      })
      if (assigneeUser?.status === 'approved') {
        await createTaskNotification({
          userId: assigneeUser.id,
          title: 'Bạn có công việc mới',
          message: `${session.name} đã giao cho bạn công việc “${task.title}” trong dự án “${task.project.name}”.`,
          type: 'task_assigned',
        })
      }
    }

    return NextResponse.json(serializeTask(task), { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dữ liệu công việc không hợp lệ', details: error.issues }, { status: 400 })
    }
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Không thể tạo công việc' }, { status: 500 })
  }
}
