import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { compareSync, hashSync } from 'bcryptjs'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 })
    const { userId: requestedUserId, currentPassword, newPassword } = body
    const userId = requestedUserId || session.id

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu mới phải có ít nhất 6 ký tự' },
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

    const isChangingAnotherUser = user.id !== session.id
    if (isChangingAnotherUser) {
      if (session.role !== 'admin' && !(session.role === 'leader' && user.role === 'member')) {
        return NextResponse.json({ error: 'Bạn không có quyền đổi mật khẩu tài khoản này' }, { status: 403 })
      }
    } else {
      const isValidPassword = compareSync(currentPassword, user.password)
      if (!isValidPassword) {
        return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng' }, { status: 401 })
      }
    }

    const hashedPassword = hashSync(newPassword, 10)

    await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ message: 'Đổi mật khẩu thành công' })
  } catch (error) {
    console.error('Error changing password:', error)
    return NextResponse.json(
      { error: 'Không thể đổi mật khẩu' },
      { status: 500 }
    )
  }
}
