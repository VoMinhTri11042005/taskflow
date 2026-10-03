import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { expiredSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/session-cookie'

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request)

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

    const response = NextResponse.json({ success: true })
    response.cookies.set(SESSION_COOKIE_NAME, '', expiredSessionCookieOptions(request))
    return response
  } catch (error) {
    console.error('Error logging out:', error)
    return NextResponse.json(
      { error: 'Đăng xuất thất bại' },
      { status: 500 }
    )
  }
}
