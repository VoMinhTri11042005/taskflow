import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// optionId is retained temporarily so an already-open older client can still
// submit a single choice while the new app bundle is being deployed.
const voteSchema = z.object({
  optionIds: z.array(z.string().cuid()).max(10).optional(),
  optionId: z.string().cuid().optional(),
}).transform((value) => ({
  optionIds: [...new Set(value.optionIds || (value.optionId ? [value.optionId] : []))],
}))

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 })
    if (session.role !== 'member') return NextResponse.json({ error: 'Chỉ Thành viên mới có thể bình chọn' }, { status: 403 })

    const { id: pollId } = await params
    const { optionIds } = voteSchema.parse(await request.json())
    const result = await db.$transaction(async (tx) => {
      // A row lock serializes votes for this poll with each other and with
      // closing or deleting it. Check the current state only after acquiring
      // the lock so a late vote cannot be written to a closed poll.
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM polls WHERE id = ${pollId} FOR UPDATE
      `
      if (locked.length === 0) return { error: 'Không tìm thấy bình chọn', status: 404 } as const

      const poll = await tx.poll.findUnique({
        where: { id: pollId },
        select: {
          projectId: true,
          status: true,
          allowMultipleChoices: true,
          options: { select: { id: true } },
        },
      })
      if (!poll) return { error: 'Không tìm thấy bình chọn', status: 404 } as const
      if (!poll.projectId) return { error: 'Bình chọn này chưa được gán cho dự án', status: 409 } as const
      if (poll.status !== 'active') return { error: 'Bình chọn này đã đóng', status: 409 } as const

      const membership = await tx.projectMember.findUnique({
        where: { projectId_userId: { projectId: poll.projectId, userId: session.id } },
        select: {
          status: true,
          user: { select: { role: true, status: true, leaderId: true } },
          project: { select: { leaderId: true } },
        },
      })
      if (!membership || membership.status !== 'approved' || membership.user.role !== 'member' ||
        membership.user.status !== 'approved' || !membership.user.leaderId ||
        membership.user.leaderId !== membership.project.leaderId) {
        return { error: 'Bạn không có quyền bình chọn trong dự án này', status: 403 } as const
      }
      if (!poll.allowMultipleChoices && optionIds.length > 1) {
        return { error: 'Bình chọn này chỉ cho phép chọn một phương án', status: 400 } as const
      }
      const validOptionIds = new Set(poll.options.map((option) => option.id))
      if (optionIds.some((optionId) => !validOptionIds.has(optionId))) {
        return { error: 'Lựa chọn không hợp lệ', status: 400 } as const
      }

      await tx.pollVote.deleteMany({ where: { userId: session.id, pollId } })
      if (optionIds.length > 0) {
        await tx.pollVote.createMany({
          data: optionIds.map((optionId) => ({ userId: session.id, optionId, pollId })),
        })
      }
      const updatedPoll = await tx.poll.findUnique({
        where: { id: pollId },
        include: pollIncludeForViewer(session.id),
      })
      return { updatedPoll } as const
    })
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result.updatedPoll, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Lựa chọn không hợp lệ' }, { status: 400 })
    }
    console.error('Error casting vote:', error)
    return NextResponse.json({ error: 'Không thể bình chọn' }, { status: 500 })
  }
}
