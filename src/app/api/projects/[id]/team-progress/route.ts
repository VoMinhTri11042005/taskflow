import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { canAccessProject } from '@/lib/permissions'
import { withNormalizedProjectName } from '@/lib/project-name'

const taskStatuses = ['todo', 'in_progress', 'review', 'done'] as const

type TaskStatus = (typeof taskStatuses)[number]

function getTaskSummary(tasks: Array<{ status: string }>) {
  const counts = Object.fromEntries(taskStatuses.map((status) => [status, 0])) as Record<TaskStatus, number>

  for (const task of tasks) {
    if (task.status in counts) counts[task.status as TaskStatus] += 1
  }

  const total = tasks.length
  return {
    total,
    ...counts,
    completionRate: total > 0 ? Math.round((counts.done / total) * 100) : 0,
  }
}

/**
 * A narrow, project-scoped view for collaboration. We deliberately return
 * task titles/statuses/deadlines only: private descriptions, links and edit
 * rights stay limited to the assignee and the owning Leader.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canAccessProject(session, id))) {
      return NextResponse.json({ error: 'Bạn không có quyền xem nhóm của dự án này' }, { status: 403 })
    }

    const project = await db.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        color: true,
        leader: { select: { id: true, name: true, color: true, avatar: true } },
      },
    })
    if (!project) return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 })

    const memberships = await db.projectMember.findMany({
      where: { projectId: id, status: 'approved' },
      select: {
        user: { select: { id: true, name: true, email: true, color: true, avatar: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    const teamMembers = await db.teamMember.findMany({
      where: {
        OR: memberships.map((membership) => ({
          email: { equals: membership.user.email, mode: 'insensitive' },
        })),
      },
      select: { id: true, email: true },
    })
    const teamMemberIdByEmail = new Map(teamMembers.map((member) => [member.email.toLowerCase(), member.id]))
    const assigneeIds = teamMembers.map((member) => member.id)

    const tasks = assigneeIds.length > 0
      ? await db.task.findMany({
          where: { projectId: id, assigneeId: { in: assigneeIds } },
          select: { id: true, title: true, status: true, priority: true, dueDate: true, assigneeId: true },
          orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        })
      : []

    const tasksByAssignee = new Map<string, typeof tasks>()
    for (const task of tasks) {
      if (!task.assigneeId) continue
      const assignedTasks = tasksByAssignee.get(task.assigneeId) || []
      assignedTasks.push(task)
      tasksByAssignee.set(task.assigneeId, assignedTasks)
    }

    return NextResponse.json({
      project: withNormalizedProjectName({ id: project.id, name: project.name, color: project.color }),
      leader: project.leader,
      members: memberships.map((membership) => {
        const teamMemberId = teamMemberIdByEmail.get(membership.user.email.toLowerCase()) || null
        const assignedTasks = teamMemberId ? tasksByAssignee.get(teamMemberId) || [] : []

        return {
          userId: membership.user.id,
          teamMemberId,
          name: membership.user.name,
          color: membership.user.color,
          avatar: membership.user.avatar,
          isCurrentUser: membership.user.id === session.id,
          taskSummary: getTaskSummary(assignedTasks),
          assignedTasks: assignedTasks.map(({ assigneeId: _assigneeId, ...task }) => task),
        }
      }),
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    console.error('Error fetching project team progress:', error)
    return NextResponse.json({ error: 'Không thể tải thành viên và tiến độ dự án' }, { status: 500 })
  }
}
