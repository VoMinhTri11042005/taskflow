import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request)
    const cookieStore = await cookies()
    cookieStore.delete('session')

    // Presence itself expires naturally because the same account may still be
    // open in another browser. Record only a real, explicit logout instead of
    // treating every React unmount as a logout.
    if (session) {
      try {
        await db.activityLog.create({ data: { userId: session.id, action: 'logout' } })
      } catch (activityError) {
        console.error('Error recording logout activity:', activityError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error logging out:', error)
    return NextResponse.json(
      { error: 'Đăng xuất thất bại' },
      { status: 500 }
    )
  }
}
