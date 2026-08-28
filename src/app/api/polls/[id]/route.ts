import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdmin, getSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const poll = await db.poll.findUnique({
      where: { id },
      include: {
        options: {
          include: {
            votes: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
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

    if (!poll) {
      return NextResponse.json(
        { error: 'Không tìm thấy bình chọn' },
        { status: 404 }
      )
    }

    return NextResponse.json(poll)
  } catch (error) {
    console.error('Error fetching poll:', error)
    return NextResponse.json(
      { error: 'Không thể tải bình chọn' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        { error: 'Bạn không có quyền thực hiện thao tác này' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { title, description, status } = body

    const existingPoll = await db.poll.findUnique({ where: { id } })
    if (!existingPoll) {
      return NextResponse.json(
        { error: 'Không tìm thấy bình chọn' },
        { status: 404 }
      )
    }

    const poll = await db.poll.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(status !== undefined && { status }),
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

    return NextResponse.json(poll)
  } catch (error) {
    console.error('Error updating poll:', error)
    return NextResponse.json(
      { error: 'Không thể cập nhật bình chọn' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        { error: 'Bạn không có quyền thực hiện thao tác này' },
        { status: 403 }
      )
    }

    const { id } = await params

    const existingPoll = await db.poll.findUnique({ where: { id } })
    if (!existingPoll) {
      return NextResponse.json(
        { error: 'Không tìm thấy bình chọn' },
        { status: 404 }
      )
    }

    await db.poll.delete({ where: { id } })

    return NextResponse.json({ message: 'Đã xóa bình chọn thành công' })
  } catch (error) {
    console.error('Error deleting poll:', error)
    return NextResponse.json(
      { error: 'Không thể xóa bình chọn' },
      { status: 500 }
    )
  }
}
