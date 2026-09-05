import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hashSync } from 'bcryptjs';
import { db, isDatabaseNotInitializedError } from '@/lib/db';
import { duplicateAccountNameMessage, isAccountNameTaken, normalizeAccountName } from '@/lib/account-names';

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

    const normalizedName = normalizeAccountName(parsed.name);
    const normalizedEmail = parsed.email.trim().toLowerCase();
    if (normalizedName.length < 2) {
      return NextResponse.json({ error: 'Tên phải có ít nhất 2 ký tự' }, { status: 400 });
    }
    const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } });

    if (existingUser) {
      return NextResponse.json({ error: 'Email đã tồn tại trong hệ thống' }, { status: 409 });
    }
    if (await isAccountNameTaken(normalizedName)) {
      return NextResponse.json({ error: duplicateAccountNameMessage }, { status: 409 });
    }

    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: normalizedName,
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

      // The administrator needs a durable request notification, even when they
      // are already signed in on another device or refresh the browser later.
      const administrators = await tx.user.findMany({
        where: { role: 'admin', status: 'approved' },
        select: { id: true },
      });
      if (administrators.length > 0) {
        await tx.notification.createMany({
          data: administrators.map((administrator) => ({
            userId: administrator.id,
            title: 'Yêu cầu đăng ký mới',
            message: `${created.name} đã đăng ký tài khoản ${parsed.role === 'leader' ? 'Leader' : 'Thành viên'} và đang chờ duyệt.`,
            type: 'account_pending',
          })),
        });
      }

      return created;
    });

    return NextResponse.json({
      message: parsed.role === 'leader'
        ? 'Yêu cầu đăng ký leader đã được gửi. Chờ quản trị viên duyệt.'
        : 'Đăng ký thành công. Tài khoản đang chờ duyệt bởi quản trị viên.',
      user,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ', details: error.issues }, { status: 400 });
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
