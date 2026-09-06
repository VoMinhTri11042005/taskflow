import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { canAssignProjectMember, canManageProject, isManager } from '@/lib/permissions'
import { withNormalizedProjectName } from '@/lib/project-name'

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  status: z.string().optional().default('todo'),
  priority: z.string().optional().default('medium'),
  dueDate: z.string().optional().nullable(),
  projectId: z.string().min(1, 'Project ID is required'),
  assigneeId: z.string().optional().nullable(),
})

function serializeTask<T extends { project: { name: string } }>(task: T): T {
  return { ...task, project: withNormalizedProjectName(task.project) }
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
    if (session.role === 'leader') {
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
    if (assigneeId) where.assigneeId = assigneeId

    const tasks = await db.task.findMany({
      where,
      include: {
        assignee: true,
        project: true,
        links: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(tasks.map(serializeTask), {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isManager(session)) return NextResponse.json({ error: 'Chỉ Leader mới có thể tạo công việc' }, { status: 403 })
    const body = await request.json()
    const validated = createTaskSchema.parse(body)
    if (!(await canManageProject(session, validated.projectId))) {
      return NextResponse.json({ error: 'Bạn không có quyền tạo công việc trong dự án này' }, { status: 403 })
    }
    if (validated.assigneeId) {
      if (!(await canAssignProjectMember(session, validated.projectId, validated.assigneeId))) {
        return NextResponse.json({ error: 'Chỉ có thể giao việc cho Member đã thuộc dự án này' }, { status: 403 })
      }
    }

    const task = await db.task.create({
      data: {
        title: validated.title,
        description: validated.description,
        status: validated.status,
        priority: validated.priority,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
        projectId: validated.projectId,
        assigneeId: validated.assigneeId,
      },
      include: {
        assignee: true,
        project: true,
        links: true,
      },
    })

    if (task.assignee?.email) {
      const assigneeUser = await db.user.findUnique({
        where: { email: task.assignee.email },
        select: { id: true, status: true },
      })
      if (assigneeUser?.status === 'approved') {
        await db.notification.create({
          data: {
            userId: assigneeUser.id,
            title: 'Bạn có công việc mới',
            message: `${session.name} đã giao cho bạn công việc “${task.title}” trong dự án “${task.project.name}”.`,
            type: 'task_assigned',
          },
        })
      }
    }

    return NextResponse.json(serializeTask(task), { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
