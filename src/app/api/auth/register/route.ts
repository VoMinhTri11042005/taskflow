import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hashSync } from 'bcryptjs';
import { db, isDatabaseNotInitializedError } from '@/lib/db';

const registerSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  role: z.enum(['member', 'leader']).default('member'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.parse(body);

    const normalizedEmail = parsed.email.trim().toLowerCase();
    const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } });

    if (existingUser) {
      return NextResponse.json({ error: 'Email đã tồn tại trong hệ thống' }, { status: 409 });
    }

    const user = await db.user.create({
      data: {
        name: parsed.name.trim(),
        email: normalizedEmail,
        password: hashSync(parsed.password, 10),
        role: parsed.role,
        status: 'pending',
        color: parsed.role === 'leader' ? '#f59e0b' : '#10b981',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        color: true,
      },
    });

    return NextResponse.json({
      message: parsed.role === 'leader'
        ? 'Yêu cầu đăng ký leader đã được gửi. Chờ quản trị viên duyệt.'
        : 'Đăng ký thành công. Tài khoản đang chờ duyệt bởi quản trị viên.',
      user,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ', details: error.errors }, { status: 400 });
    }

    if (isDatabaseNotInitializedError(error)) {
      return NextResponse.json({
        error: 'Cơ sở dữ liệu chưa được khởi tạo. Vui lòng chạy Prisma schema sync trước khi đăng ký.',
      }, { status: 503 });
    }

    console.error('Register error:', error);
    return NextResponse.json({ error: 'Không thể tạo tài khoản' }, { status: 500 });
  }
}
