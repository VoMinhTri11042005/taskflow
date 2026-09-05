import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSessionValue, getSession } from '@/lib/auth'

const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 })
    const { userId: requestedUserId, name } = body
    const userId = requestedUserId || session.id

    if (!userId || !name) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      )
    }

    if (name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Tên không được để trống' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Không tìm thấy người dùng' },
        { status: 404 }
      )
    }
    if (user.id !== session.id && session.role !== 'admin') {
      return NextResponse.json({ error: 'Bạn không có quyền cập nhật tài khoản này' }, { status: 403 })
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { name: name.trim() },
    })

    // Also update the corresponding TeamMember name
    await db.teamMember.updateMany({
      where: { email: user.email },
      data: { name: name.trim() },
    })

    // Never return password hashes. When users change their own profile, refresh
    // the signed session at the same time so every following API request uses
    // the new identity details without waiting for a reload.
    const safeUser = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      color: updatedUser.color,
      avatar: updatedUser.avatar,
      teamMemberId: session.teamMemberId ?? null,
    }
    const response = NextResponse.json({ user: safeUser })
    if (updatedUser.id === session.id) {
      response.cookies.set('session', createSessionValue(safeUser), sessionCookieOptions)
    }
    return response
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Không thể cập nhật thông tin cá nhân' },
      { status: 500 }
    )
  }
}
