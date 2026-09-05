import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { canManageProject, isManager } from '@/lib/permissions'

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  status: z.string().optional().default('todo'),
  priority: z.string().optional().default('medium'),
  dueDate: z.string().optional().nullable(),
  projectId: z.string().min(1, 'Project ID is required'),
  assigneeId: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = request.nextUrl
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const assigneeId = searchParams.get('assigneeId')

    const where: Record<string, unknown> = session.role === 'admin'
      ? { id: '__no_task_access__' }
      : session.role === 'leader'
        ? { project: { leaderId: session.id } }
        : session.teamMemberId
          ? { assigneeId: session.teamMemberId }
          : { id: '__no_task_access__' }
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

    return NextResponse.json(tasks)
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
      const assignee = await db.teamMember.findUnique({ where: { id: validated.assigneeId }, select: { role: true } })
      if (!assignee || assignee.role !== 'member') return NextResponse.json({ error: 'Chỉ có thể giao việc cho tài khoản Member' }, { status: 400 })
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

    return NextResponse.json(task, { status: 201 })
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
