import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession, type SessionData } from '@/lib/auth'
import { canAccessProject, canManageProject, isActiveLeader } from '@/lib/permissions'

const updatePollSchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề không được để trống').max(200).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  status: z.enum(['active', 'closed']).optional(),
  // This is accepted only to classify an unscoped legacy poll. New polls
  // always receive their project in POST /api/polls.
  projectId: z.string().cuid('Dự án không hợp lệ').optional(),
}).refine((value) => Object.keys(value).length > 0, 'Không có thay đổi nào')

type PollAccessRecord = {
  projectId: string | null
  createdByUserId: string
}

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

async function canManagePoll(session: SessionData, poll: PollAccessRecord) {
  if (poll.projectId) return canManageProject(session, poll.projectId)

  // Only the original, active Leader can classify a legacy unscoped poll.
  return session.role === 'leader'
    && poll.createdByUserId === session.id
    && await isActiveLeader(session)
}

async function canViewPoll(session: SessionData, poll: PollAccessRecord) {
  if (poll.projectId) {
    if (session.role === 'leader') return canManageProject(session, poll.projectId)
    if (session.role === 'member') return canAccessProject(session, poll.projectId)
  }

  // Legacy, unclassified polls must never be exposed to Members.
  return !poll.projectId
    && session.role === 'leader'
    && poll.createdByUserId === session.id
    && await isActiveLeader(session)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 })

    const poll = await db.poll.findUnique({
      where: { id },
      include: pollIncludeForViewer(session.id),
    })

    if (!poll) return NextResponse.json({ error: 'Không tìm thấy bình chọn' }, { status: 404 })
    if (!(await canViewPoll(session, poll))) {
      return NextResponse.json({ error: 'Bạn không có quyền xem bình chọn này' }, { status: 403 })
    }

    return NextResponse.json(poll, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    console.error('Error fetching poll:', error)
    return NextResponse.json({ error: 'Không thể tải bình chọn' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 })

    const { id } = await params
    const validated = updatePollSchema.parse(await request.json())
    const existingPoll = await db.poll.findUnique({
      where: { id },
      select: { id: true, projectId: true, createdByUserId: true },
    })
    if (!existingPoll) return NextResponse.json({ error: 'Không tìm thấy bình chọn' }, { status: 404 })
    if (!(await canManagePoll(session, existingPoll))) {
      return NextResponse.json({ error: 'Bạn không có quyền cập nhật bình chọn này' }, { status: 403 })
    }

    if (validated.projectId !== undefined && validated.projectId !== existingPoll.projectId) {
      if (existingPoll.projectId) {
        return NextResponse.json({ error: 'Bình chọn đã được gắn dự án và không thể đổi phạm vi' }, { status: 409 })
      }
      if (!(await canManageProject(session, validated.projectId))) {
        return NextResponse.json({ error: 'Bạn chỉ có thể gán bình chọn cho dự án do mình quản lý' }, { status: 403 })
      }

      const project = await db.project.findUnique({
        where: { id: validated.projectId },
        select: { status: true },
      })
      if (!project || project.status !== 'active') {
        return NextResponse.json({ error: 'Chỉ có thể gán bình chọn cho dự án đang hoạt động' }, { status: 400 })
      }
    }

    if (!existingPoll.projectId && !validated.projectId && validated.status === 'active') {
      return NextResponse.json({ error: 'Hãy gán dự án trước khi mở bình chọn cho Thành viên' }, { status: 409 })
    }

    const poll = await db.poll.update({
      where: { id },
      data: {
        ...(validated.title !== undefined && { title: validated.title }),
        ...(validated.description !== undefined && { description: validated.description || null }),
        ...(validated.status !== undefined && { status: validated.status }),
        ...(validated.projectId !== undefined && { projectId: validated.projectId }),
      },
      include: pollIncludeForViewer(session.id),
    })

    return NextResponse.json(poll)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dữ liệu bình chọn không hợp lệ' }, { status: 400 })
    }
    console.error('Error updating poll:', error)
    return NextResponse.json({ error: 'Không thể cập nhật bình chọn' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 })

    const { id } = await params
    const existingPoll = await db.poll.findUnique({
      where: { id },
      select: { projectId: true, createdByUserId: true },
    })
    if (!existingPoll) return NextResponse.json({ error: 'Không tìm thấy bình chọn' }, { status: 404 })
    if (!(await canManagePoll(session, existingPoll))) {
      return NextResponse.json({ error: 'Bạn không có quyền xóa bình chọn này' }, { status: 403 })
    }

    await db.poll.delete({ where: { id } })
    return NextResponse.json({ message: 'Đã xóa bình chọn thành công' })
  } catch (error) {
    console.error('Error deleting poll:', error)
    return NextResponse.json({ error: 'Không thể xóa bình chọn' }, { status: 500 })
  }
}
