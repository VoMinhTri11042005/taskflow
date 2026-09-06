import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { isManager } from '@/lib/permissions'

const createPollSchema = z.object({
  title: z.string().trim().min(1, 'Vui lòng nhập tiêu đề').max(200),
  description: z.string().trim().max(1000).optional().nullable(),
  options: z.array(z.string().trim().min(1, 'Lựa chọn không được để trống').max(160)).min(2).max(10),
  allowMultipleChoices: z.boolean().optional().default(false),
})

/** Return counts for everyone, but vote identities only for the current viewer. */
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

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.role === 'admin') return NextResponse.json([])

    let where: { createdByUserId: string } | undefined
    if (session.role === 'leader') {
      where = { createdByUserId: session.id }
    } else {
      const member = await db.user.findUnique({
        where: { id: session.id },
        select: { leaderId: true, role: true, status: true },
      })
      if (member?.role !== 'member' || member.status !== 'approved' || !member.leaderId) {
        return NextResponse.json([])
      }
      where = { createdByUserId: member.leaderId }
    }

    const polls = await db.poll.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: pollIncludeForViewer(session.id),
    })

    return NextResponse.json(polls, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    console.error('Error fetching polls:', error)
    return NextResponse.json({ error: 'Không thể tải danh sách bình chọn' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 })
    if (!isManager(session)) {
      return NextResponse.json({ error: 'Chỉ Leader mới có thể tạo bình chọn' }, { status: 403 })
    }

    const validated = createPollSchema.parse(await request.json())
    const duplicateOption = new Set(validated.options.map((option) => option.toLocaleLowerCase('vi-VN'))).size !== validated.options.length
    if (duplicateOption) {
      return NextResponse.json({ error: 'Các lựa chọn không được trùng nhau' }, { status: 400 })
    }

    const poll = await db.poll.create({
      data: {
        title: validated.title,
        description: validated.description || null,
        allowMultipleChoices: validated.allowMultipleChoices,
        createdByUserId: session.id,
        options: { create: validated.options.map((label) => ({ label })) },
      },
      include: pollIncludeForViewer(session.id),
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
