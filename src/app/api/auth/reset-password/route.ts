import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashSync } from 'bcryptjs'
import { cookies } from 'next/headers'

async function getManagerRole(): Promise<string | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  if (!sessionCookie?.value) return null
  try {
    const session = JSON.parse(sessionCookie.value)
    return session.role || null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = await getManagerRole()
    const isManager = role === 'admin' || role === 'leader'
    if (!isManager) {
      return NextResponse.json(
        { error: 'Bạn không có quyền thực hiện thao tác này' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, newPassword } = body

    if (!userId || !newPassword) {
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

    const hashedPassword = hashSync(newPassword, 10)

    await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    // Create notification for the member
    await db.notification.create({
      data: {
        userId,
        title: 'Đặt lại mật khẩu',
        message: 'Mật khẩu của bạn đã được quản trị viên đặt lại. Vui lòng đăng nhập bằng mật khẩu mới.',
        type: 'warning',
      },
    })

    return NextResponse.json({ message: 'Đặt lại mật khẩu thành công' })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'Không thể đặt lại mật khẩu' },
      { status: 500 }
    )
  }
}
