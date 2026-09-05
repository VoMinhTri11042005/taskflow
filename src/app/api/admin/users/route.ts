import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { hashSync } from 'bcryptjs';
import { z } from 'zod';

const accountSchema = z.object({
  name: z.string().min(1, 'Tên bắt buộc'),
  email: z.string().email('Email không hợp lệ'),
  role: z.enum(['admin', 'leader', 'member']).default('member'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').optional(),
  status: z.enum(['pending', 'approved', 'rejected']).default('approved'),
  color: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    const isManager = session?.role === 'admin' || session?.role === 'leader';
    if (!session || !isManager) {
      return NextResponse.json({ error: 'Bạn không có quyền' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const baseWhere = session.role === 'leader' ? { role: { in: ['leader', 'member'] } } : undefined;

    const users = await db.user.findMany({
      where: status ? { ...baseWhere, status } : baseWhere,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching user accounts:', error);
    return NextResponse.json({ error: 'Không thể tải tài khoản' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    const isManager = session?.role === 'admin' || session?.role === 'leader';
    if (!session || !isManager) {
      return NextResponse.json({ error: 'Bạn không có quyền' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = accountSchema.parse(body);
    if (session.role === 'leader' && parsed.role === 'admin') {
      return NextResponse.json({ error: 'Leader không được tạo tài khoản admin' }, { status: 403 });
    }
    const password = parsed.password || 'member123';

    const existing = await db.user.findUnique({ where: { email: parsed.email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'Email đã tồn tại trong hệ thống' }, { status: 409 });
    }

    const user = await db.user.create({
      data: {
        name: parsed.name,
        email: parsed.email.toLowerCase(),
        role: parsed.role,
        status: parsed.status,
        password: hashSync(password, 10),
        color: parsed.color || '#6366f1',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ user, defaultPassword: password }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ', details: error.issues }, { status: 400 });
    }
    console.error('Error creating user account:', error);
    return NextResponse.json({ error: 'Không thể tạo tài khoản' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = getSession(request);
    const isManager = session?.role === 'admin' || session?.role === 'leader';
    if (!session || !isManager) {
      return NextResponse.json({ error: 'Bạn không có quyền' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, role, name, email, password } = body;

    if (!id) {
      return NextResponse.json({ error: 'Thiếu id tài khoản' }, { status: 400 });
    }

    if (session.role === 'leader' && role === 'admin') {
      return NextResponse.json({ error: 'Leader không được nâng quyền admin' }, { status: 403 });
    }

    const targetUser = await db.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
    }
    if (session.role === 'leader' && targetUser.role === 'admin') {
      return NextResponse.json({ error: 'Leader không được quản lý tài khoản admin' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (role) updateData.role = role;
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (password) updateData.password = hashSync(password, 10);

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        color: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user account:', error);
    return NextResponse.json({ error: 'Không thể cập nhật tài khoản' }, { status: 500 });
  }
}
