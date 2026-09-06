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
  inviteToken: z.string().trim().min(16, 'Link mời không hợp lệ').optional(),
});

class InvalidInviteError extends Error {}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.parse(body);

    if (parsed.inviteToken && parsed.role !== 'member') {
      return NextResponse.json({ error: 'Link mời chỉ dùng để đăng ký tài khoản Thành viên' }, { status: 400 });
    }

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

    const registration = await db.$transaction(async (tx) => {
      const invite = parsed.inviteToken
        ? await tx.memberInvite.findFirst({
            where: {
              token: parsed.inviteToken,
              active: true,
              leader: { role: 'leader', status: 'approved' },
            },
            select: {
              id: true,
              label: true,
              leaderId: true,
              leader: { select: { name: true } },
            },
          })
        : null;

      if (parsed.inviteToken && !invite) throw new InvalidInviteError();

      const created = await tx.user.create({
        data: {
          name: normalizedName,
          email: normalizedEmail,
          password: hashSync(parsed.password, 10),
          role: parsed.role,
          status: 'pending',
          color: parsed.role === 'leader' ? '#f59e0b' : '#10b981',
          leaderId: invite?.leaderId || null,
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

      if (invite) {
        await tx.memberInvite.update({
          where: { id: invite.id },
          data: { useCount: { increment: 1 } },
        });
        await tx.notification.create({
          data: {
            userId: invite.leaderId,
            title: 'Yêu cầu tham gia nhóm mới',
            message: `${created.name} đã đăng ký qua link mời${invite.label ? ` “${invite.label}”` : ''} và đang chờ bạn duyệt.`,
            type: 'account_pending',
          },
        });
      } else {
        // A Leader is approved by Admin. A Member without an invitation is
        // deliberately left unassigned so Admin can place them with a Leader.
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
      }

      return { user: created, leaderName: invite?.leader.name || null };
    });

    return NextResponse.json({
      message: registration.leaderName
        ? `Đăng ký thành công. Tài khoản đang chờ Leader ${registration.leaderName} duyệt.`
        : parsed.role === 'leader'
        ? 'Yêu cầu đăng ký leader đã được gửi. Chờ quản trị viên duyệt.'
        : 'Đăng ký thành công. Tài khoản đang chờ duyệt bởi quản trị viên.',
      user: registration.user,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ', details: error.issues }, { status: 400 });
    }

    if (error instanceof InvalidInviteError) {
      return NextResponse.json({ error: 'Link mời không hợp lệ hoặc đã bị thu hồi' }, { status: 400 });
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
