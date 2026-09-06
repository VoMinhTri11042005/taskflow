import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { isLeader, isManager } from '@/lib/permissions'
import { normalizeProjectName } from '@/lib/project-name'

const projectNameSchema = z
  .string()
  .transform(normalizeProjectName)
  .pipe(z.string().min(1, 'Tên dự án không được để trống').max(120, 'Tên dự án tối đa 120 ký tự'))

const createProjectSchema = z.object({
  name: projectNameSchema,
  description: z.string().optional().nullable(),
  color: z.string().optional().default('#10b981'),
  status: z.string().optional().default('active'),
})

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let where: Record<string, unknown> = { id: '__no_project_access__' }
    if (session.role === 'leader') {
      where = { leaderId: session.id }
    } else if (session.role === 'member') {
      const memberAccount = await db.user.findUnique({
        where: { id: session.id },
        select: { role: true, status: true, leaderId: true },
      })
      if (memberAccount?.role === 'member' && memberAccount.status === 'approved' && memberAccount.leaderId) {
        where = {
          leaderId: memberAccount.leaderId,
          members: { some: { userId: session.id, status: 'approved' } },
        }
      }
    }

    const projects = await db.project.findMany({
      where,
      include: {
        _count: {
          select: {
            tasks: true,
            members: { where: { status: 'approved' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isManager(session)) return NextResponse.json({ error: 'Chỉ Leader mới có thể tạo dự án' }, { status: 403 })

    const body = await request.json()
    const validated = createProjectSchema.parse(body)

    const project = await db.project.create({
      data: {
        ...validated,
        leaderId: isLeader(session) ? session.id : null,
      },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
