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
    const [member, poll] = await Promise.all([
      db.user.findUnique({
        where: { id: session.id },
        select: { leaderId: true, role: true, status: true },
      }),
      db.poll.findUnique({
        where: { id: pollId },
        select: {
          createdByUserId: true,
          status: true,
          allowMultipleChoices: true,
          options: { select: { id: true } },
        },
      }),
    ])

    if (!poll) return NextResponse.json({ error: 'Không tìm thấy bình chọn' }, { status: 404 })
    if (poll.status !== 'active') return NextResponse.json({ error: 'Bình chọn này đã đóng' }, { status: 409 })
    if (member?.role !== 'member' || member.status !== 'approved' || !member.leaderId || poll.createdByUserId !== member.leaderId) {
      return NextResponse.json({ error: 'Bạn không có quyền bình chọn trong nhóm này' }, { status: 403 })
    }
    if (!poll.allowMultipleChoices && optionIds.length > 1) {
      return NextResponse.json({ error: 'Bình chọn này chỉ cho phép chọn một phương án' }, { status: 400 })
    }

    const validOptionIds = new Set(poll.options.map((option) => option.id))
    if (optionIds.some((optionId) => !validOptionIds.has(optionId))) {
      return NextResponse.json({ error: 'Lựa chọn không hợp lệ' }, { status: 400 })
    }

    await db.$transaction(async (tx) => {
      await tx.pollVote.deleteMany({ where: { userId: session.id, pollId } })
      if (optionIds.length > 0) {
        await tx.pollVote.createMany({
          data: optionIds.map((optionId) => ({ userId: session.id, optionId, pollId })),
        })
      }
    })

    const updatedPoll = await db.poll.findUnique({
      where: { id: pollId },
      include: pollIncludeForViewer(session.id),
    })

    return NextResponse.json(updatedPoll, {
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
