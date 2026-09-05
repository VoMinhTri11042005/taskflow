import { NextRequest, NextResponse } from 'next/server'
import { createSessionValue, getSession, type SessionData } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
}

function clearSession() {
  const response = NextResponse.json({ user: null })
  response.cookies.delete('session')
  response.headers.set('Cache-Control', 'no-store, max-age=0')
  return response
}

function emptySession() {
  const response = NextResponse.json({ user: null })
  response.headers.set('Cache-Control', 'no-store, max-age=0')
  return response
}

export async function GET(request: NextRequest) {
  try {
    const currentSession = getSession(request)
    if (!currentSession) return emptySession()

    // The cookie proves who is signed in, but account details must always come
    // from the database. Otherwise a changed name/role/avatar would revert on
    // the next page refresh because the cookie still contained its old snapshot.
    const account = await db.user.findUnique({
      where: { id: currentSession.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        color: true,
        avatar: true,
      },
    })

    if (!account || account.status !== 'approved') return clearSession()

    const teamMember = await db.teamMember.findFirst({
      where: { email: account.email },
      select: { id: true },
    })

    const session: SessionData = {
      id: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
      color: account.color,
      avatar: account.avatar,
      teamMemberId: teamMember?.id ?? null,
    }

    // Renew the signed snapshot too, so every API route receives current
    // authorization data immediately after this session check.
    const response = NextResponse.json({ user: session })
    response.cookies.set('session', createSessionValue(session), sessionCookieOptions)
    response.headers.set('Cache-Control', 'no-store, max-age=0')
    return response
  } catch (error) {
    console.error('Error fetching session:', error)
    return emptySession()
  }
}
