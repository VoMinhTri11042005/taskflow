import type { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { canManageProject, isActiveLeader } from '@/lib/permissions'

const createPollSchema = z.object({
  title: z.string().trim().min(1, 'Vui lòng nhập tiêu đề').max(200),
  description: z.string().trim().max(1000).optional().nullable(),
  options: z.array(z.string().trim().min(1, 'Lựa chọn không được để trống').max(160)).min(2).max(10),
  allowMultipleChoices: z.boolean().optional().default(false),
  // projectId was added after the first deployed poll form. Keep it optional here
  // only long enough to map old open browser tabs to their sole active project.
  projectId: z.string().cuid('Vui lòng chọn dự án cho bình chọn').optional(),
})

/** Return counts for everyone, but vote identities only for the current viewer. */
function pollIncludeForViewer(userId: string) {
  return {
    project: {
      select: { id: true, name: true, color: true, status: true },
    },
    options: {
      include: {
        _count: { select: { votes: true } },
        votes: {
          where: { userId },
          select: { id: true, createdAt: true, userId: true, optionId: true, pollId: true },
        },
      },
    },
    createdByUser: { select: { id: true, name: true } },
  }
}

const noStoreHeaders = { 'Cache-Control': 'no-store, max-age=0' }

async function notifyProjectMembersAboutNewPoll(input: {
  projectId: string
  leaderId: string
  leaderName: string
  projectName: string
  pollTitle: string
}) {
  try {
    const recipients = await db.projectMember.findMany({
      where: {
        projectId: input.projectId,
        status: 'approved',
        user: {
          role: 'member',
          status: 'approved',
          leaderId: input.leaderId,
        },
      },
      select: { userId: true },
    })

    if (recipients.length === 0) return

    await db.notification.createMany({
      data: recipients.map(({ userId }) => ({
        userId,
        title: 'Bình chọn mới từ Leader',
        message: `${input.leaderName} mời bạn bình chọn “${input.pollTitle}” trong dự án “${input.projectName}”.`,
        type: 'poll_created',
      })),
    })
  } catch (error) {
    // The poll has already been created. Do not return a false error that
    // makes the Leader retry and accidentally create a duplicate poll.
    console.error('Error notifying project members about new poll:', error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Polls belong to Leader workspaces; Admin has no project workspace.
    if (session.role === 'admin') return NextResponse.json([], { headers: noStoreHeaders })

    let where: Prisma.PollWhereInput
    if (session.role === 'leader') {
      if (!(await isActiveLeader(session))) {
        return NextResponse.json({ error: 'Tài khoản Leader không còn hoạt động' }, { status: 403 })
      }

      where = {
        OR: [
          { project: { is: { leaderId: session.id } } },
          // Legacy polls remain visible only to their creator until a project is assigned.
          { projectId: null, createdByUserId: session.id },
        ],
      }
    } else if (session.role === 'member') {
      const member = await db.user.findFirst({
        where: { id: session.id, role: 'member', status: 'approved' },
        select: { leaderId: true },
      })
      if (!member?.leaderId) return NextResponse.json([], { headers: noStoreHeaders })

      where = {
        project: {
          is: {
            leaderId: member.leaderId,
            members: { some: { userId: session.id, status: 'approved' } },
          },
        },
      }
    } else {
      return NextResponse.json([], { headers: noStoreHeaders })
    }

    const polls = await db.poll.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: pollIncludeForViewer(session.id),
    })

    return NextResponse.json(polls, { headers: noStoreHeaders })
  } catch (error) {
    console.error('Error fetching polls:', error)
    return NextResponse.json({ error: 'Không thể tải danh sách bình chọn' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 })
    if (!(await isActiveLeader(session))) {
      return NextResponse.json({ error: 'Chỉ Leader đang hoạt động mới có thể tạo bình chọn' }, { status: 403 })
    }

    const validated = createPollSchema.parse(await request.json())
    let projectId = validated.projectId

    // An already-open tab can still submit the previous form, which did not
    // contain projectId. It is safe to preserve that request only if there is
    // exactly one possible active project; never choose arbitrarily otherwise.
    if (!projectId) {
      const activeProjects = await db.project.findMany({
        where: { leaderId: session.id, status: 'active' },
        select: { id: true },
        take: 2,
      })

      if (activeProjects.length !== 1) {
        return NextResponse.json(
          {
            error:
              activeProjects.length === 0
                ? 'Bạn cần có một dự án đang hoạt động trước khi tạo bình chọn'
                : 'Bình chọn cần được gán cho một dự án. Vui lòng tải lại trang và chọn dự án',
          },
          { status: 400 }
        )
      }

      projectId = activeProjects[0].id
    }

    if (!(await canManageProject(session, projectId))) {
      return NextResponse.json({ error: 'Bạn chỉ có thể tạo bình chọn cho dự án do mình quản lý' }, { status: 403 })
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { status: true, name: true },
    })
    if (!project || project.status !== 'active') {
      return NextResponse.json({ error: 'Chỉ có thể tạo bình chọn cho dự án đang hoạt động' }, { status: 400 })
    }

    const duplicateOption = new Set(validated.options.map((option) => option.toLocaleLowerCase('vi-VN'))).size !== validated.options.length
    if (duplicateOption) {
      return NextResponse.json({ error: 'Các lựa chọn không được trùng nhau' }, { status: 400 })
    }

    const poll = await db.poll.create({
      data: {
        title: validated.title,
        description: validated.description || null,
        allowMultipleChoices: validated.allowMultipleChoices,
        projectId,
        createdByUserId: session.id,
        options: { create: validated.options.map((label) => ({ label })) },
      },
      include: pollIncludeForViewer(session.id),
    })

    await notifyProjectMembersAboutNewPoll({
      projectId,
      leaderId: session.id,
      leaderName: session.name,
      projectName: project.name,
      pollTitle: poll.title,
    })

    return NextResponse.json(poll, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dữ liệu bình chọn không hợp lệ' }, { status: 400 })
    }
    console.error('Error creating poll:', error)
    return NextResponse.json({ error: 'Không thể tạo bình chọn' }, { status: 500 })
  }
}
