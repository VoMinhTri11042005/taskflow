import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Chỉ Admin mới được xem báo cáo tổng hệ thống' }, { status: 403 })
    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const [
      totalTasks,
      tasksByStatus,
      tasksByPriority,
      upcomingDeadlines,
      allMembers,
      totalProjects,
    ] = await Promise.all([
      // Total task count
      db.task.count(),

      // Tasks grouped by status
      db.task.groupBy({
        by: ['status'],
        _count: { status: true },
      }),

      // Tasks grouped by priority
      db.task.groupBy({
        by: ['priority'],
        _count: { priority: true },
      }),

      // Upcoming deadlines (within 7 days, not done)
      db.task.findMany({
        where: {
          dueDate: {
            gte: now,
            lte: weekFromNow,
          },
          status: { not: 'done' },
        },
        include: {
          assignee: true,
          project: true,
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),

      // All members for workload
      db.teamMember.findMany({
        include: {
          _count: {
            select: { tasks: true },
          },
        },
      }),

      // Total project count
      db.project.count({
        where: { status: 'active' },
      }),
    ])

    // Format tasks by status into a record
    const statusCounts: Record<string, number> = {}
    for (const item of tasksByStatus) {
      statusCounts[item.status] = item._count.status
    }

    // Format tasks by priority into a record
    const priorityCounts: Record<string, number> = {}
    for (const item of tasksByPriority) {
      priorityCounts[item.priority] = item._count.priority
    }

    // Member workload: tasks per member broken down by status
    const memberWorkload = await Promise.all(
      allMembers.map(async (member) => {
        const tasks = await db.task.findMany({
          where: {
            assigneeId: member.id,
            status: { not: 'done' },
          },
          select: { status: true },
        })

        const workload: Record<string, number> = {}
        for (const task of tasks) {
          workload[task.status] = (workload[task.status] || 0) + 1
        }

        return {
          id: member.id,
          name: member.name,
          avatar: member.avatar,
          color: member.color,
          totalTasks: tasks.length,
          breakdown: workload,
        }
      })
    )

    return NextResponse.json({
      totalTasks,
      totalActiveProjects: totalProjects,
      tasksByStatus: statusCounts,
      tasksByPriority: priorityCounts,
      upcomingDeadlines,
      memberWorkload,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
