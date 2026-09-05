import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { hashSync } from 'bcryptjs';
import { z } from 'zod';
import { duplicateAccountNameMessage, isAccountNameTaken, normalizeAccountName } from '@/lib/account-names';

const accountSchema = z.object({
  name: z.string().min(1, 'Tên bắt buộc'),
  email: z.string().email('Email không hợp lệ'),
  role: z.enum(['leader', 'member']).default('member'),
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
    const baseWhere = session.role === 'leader' ? { role: 'member' } : undefined;

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
    const normalizedName = normalizeAccountName(parsed.name);
    if (!normalizedName) {
      return NextResponse.json({ error: 'Tên không được để trống' }, { status: 400 });
    }
    if (session.role === 'leader' && parsed.role !== 'member') {
      return NextResponse.json({ error: 'Leader chỉ có thể tạo tài khoản Member' }, { status: 403 });
    }
    const password = parsed.password || 'member123';

    const existing = await db.user.findUnique({ where: { email: parsed.email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'Email đã tồn tại trong hệ thống' }, { status: 409 });
    }
    if (await isAccountNameTaken(normalizedName)) {
      return NextResponse.json({ error: duplicateAccountNameMessage }, { status: 409 });
    }

    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: normalizedName,
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
      await tx.teamMember.upsert({
        where: { email: created.email },
        create: { name: created.name, email: created.email, role: created.role, color: created.color },
        update: { name: created.name, role: created.role, color: created.color },
      });
      return created;
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
    if (session.role === 'leader' && targetUser.role !== 'member') {
      return NextResponse.json({ error: 'Leader chỉ được quản lý tài khoản Member' }, { status: 403 });
    }

    if (role && !['admin', 'leader', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Vai trò không hợp lệ' }, { status: 400 });
    }

    if (targetUser.role === 'admin' && role && role !== 'admin') {
      return NextResponse.json({ error: 'Không thể hạ quyền tài khoản admin duy nhất' }, { status: 409 });
    }

    if (targetUser.role !== 'admin' && role === 'admin') {
      return NextResponse.json({ error: 'Hệ thống chỉ cho phép một tài khoản admin' }, { status: 409 });
    }

    if (session.role === 'leader' && role && role !== 'member') {
      return NextResponse.json({ error: 'Leader không được thay đổi vai trò tài khoản' }, { status: 403 });
    }

    if (targetUser.role === 'admin' && status && status !== 'approved') {
      return NextResponse.json({ error: 'Tài khoản admin phải luôn được duyệt' }, { status: 409 });
    }

    const normalizedName = typeof name === 'string' ? normalizeAccountName(name) : null;
    if (normalizedName !== null && !normalizedName) {
      return NextResponse.json({ error: 'Tên không được để trống' }, { status: 400 });
    }
    if (normalizedName && await isAccountNameTaken(normalizedName, targetUser.id)) {
      return NextResponse.json({ error: duplicateAccountNameMessage }, { status: 409 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (role) updateData.role = role;
    if (normalizedName) updateData.name = normalizedName;
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

    if (user.status === 'approved') {
      await db.teamMember.upsert({
        where: { email: user.email },
        create: { name: user.name, email: user.email, role: user.role, color: user.color },
        update: { name: user.name, role: user.role, color: user.color },
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user account:', error);
    return NextResponse.json({ error: 'Không thể cập nhật tài khoản' }, { status: 500 });
  }
}
