import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 })
    const { id: pollId } = await params
    const body = await request.json()
    const { optionId } = body
    const userId = session.id

    if (!userId || !optionId) {
      return NextResponse.json(
        { error: 'Thiếu userId hoặc optionId' },
        { status: 400 }
      )
    }

    // Verify poll and option exist and belong together
    const option = await db.pollOption.findFirst({
      where: { id: optionId, pollId },
    })

    if (!option) {
      return NextResponse.json(
        { error: 'Lựa chọn không hợp lệ' },
        { status: 400 }
      )
    }

    // Check if user already voted on this poll
    const existingVote = await db.pollVote.findUnique({
      where: {
        userId_pollId: { userId, pollId },
      },
    })

    if (existingVote) {
      // Delete old vote and create new one
      await db.pollVote.delete({
        where: { id: existingVote.id },
      })
    }

    // Create the new vote
    await db.pollVote.create({
      data: {
        userId,
        optionId,
        pollId,
      },
    })

    // Return updated poll with vote counts and voter names
    const updatedPoll = await db.poll.findUnique({
      where: { id: pollId },
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
      },
    })

    return NextResponse.json(updatedPoll)
  } catch (error) {
    console.error('Error casting vote:', error)
    return NextResponse.json(
      { error: 'Không thể bình chọn' },
      { status: 500 }
    )
  }
}
