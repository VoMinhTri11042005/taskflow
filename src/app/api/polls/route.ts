import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { isManager } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const polls = await db.poll.findMany({
      where: session.role === 'leader' ? { createdByUserId: session.id } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true },
            },
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(polls)
  } catch (error) {
    console.error('Error fetching polls:', error)
    return NextResponse.json(
      { error: 'Không thể tải danh sách bình chọn' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 })
    }
    if (!isManager(session)) {
      return NextResponse.json(
        { error: 'Chỉ Leader mới có thể tạo bình chọn' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description, options } = body

    if (!title || !options || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { error: 'Tiêu đề và ít nhất 2 lựa chọn là bắt buộc' },
        { status: 400 }
      )
    }

    const poll = await db.poll.create({
      data: {
        title,
        description: description || null,
        createdByUserId: session.id,
        options: {
          create: options.map((label: string) => ({ label })),
        },
      },
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true },
            },
          },
        },
      },
    })

    return NextResponse.json(poll, { status: 201 })
  } catch (error) {
    console.error('Error creating poll:', error)
    return NextResponse.json(
      { error: 'Không thể tạo bình chọn' },
      { status: 500 }
    )
  }
}
