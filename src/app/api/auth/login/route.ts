import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isDatabaseNotInitializedError } from '@/lib/db'
import { compareSync } from 'bcryptjs'
import { cookies } from 'next/headers'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = loginSchema.parse(body)

    const { email, password } = validated
    const normalizedEmail = email.trim().toLowerCase()

    // Tìm user theo email
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không chính xác' },
        { status: 401 }
      )
    }

    if (user.status && user.status !== 'approved') {
      return NextResponse.json(
        { error: 'Tài khoản của bạn đang chờ quản trị viên duyệt' },
        { status: 403 }
      )
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = compareSync(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không chính xác' },
        { status: 401 }
      )
    }

    // Tìm teamMember liên kết qua email
    const teamMember = await db.teamMember.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    })

    // Dữ liệu session
    const sessionData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      color: user.color,
      avatar: user.avatar,
      teamMemberId: teamMember?.id || null,
    }

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 ngày
    })

    return NextResponse.json({ user: sessionData })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: error.issues },
        { status: 400 }
      )
    }

    if (isDatabaseNotInitializedError(error)) {
      return NextResponse.json(
        {
          error: 'Cơ sở dữ liệu chưa được khởi tạo. Vui lòng chạy Prisma schema sync trước khi đăng nhập.',
        },
        { status: 503 }
      )
    }

    console.error('Error logging in:', error)
    return NextResponse.json(
      { error: 'Đăng nhập thất bại' },
      { status: 500 }
    )
  }
}
