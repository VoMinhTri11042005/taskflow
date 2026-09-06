import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const acceptSchema = z.object({ token: z.string().trim().min(16) });

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || session.role !== 'member') {
      return NextResponse.json({ error: 'Hãy đăng nhập bằng tài khoản Thành viên để tham gia dự án' }, { status: 403 });
    }
    const { token } = acceptSchema.parse(await request.json());

    const result = await db.$transaction(async (tx) => {
      const [invite, user] = await Promise.all([
        tx.projectInvite.findFirst({
          where: {
            token,
            active: true,
            project: { status: 'active', leader: { role: 'leader', status: 'approved' } },
          },
          include: { project: { select: { id: true, name: true, leaderId: true } } },
        }),
        tx.user.findUnique({ where: { id: session.id }, select: { id: true, role: true, status: true, leaderId: true, name: true } }),
      ]);
      if (!invite || !invite.project.leaderId) throw new Error('INVALID_INVITE');
      if (!user || user.role !== 'member' || user.status !== 'approved') throw new Error('ACCOUNT_NOT_APPROVED');
      if (user.leaderId !== invite.project.leaderId) throw new Error('WRONG_LEADER');

      const existing = await tx.projectMember.findUnique({
        where: { projectId_userId: { projectId: invite.projectId, userId: user.id } },
        select: { status: true },
      });
      if (existing?.status === 'approved') {
        return { status: 'approved', projectId: invite.project.id, projectName: invite.project.name };
      }
      if (existing?.status === 'pending') {
        return { status: 'pending', alreadyPending: true, projectId: invite.project.id, projectName: invite.project.name };
      }

      await tx.projectMember.upsert({
        where: { projectId_userId: { projectId: invite.projectId, userId: user.id } },
        create: { projectId: invite.projectId, userId: user.id, status: 'pending' },
        update: { status: 'pending' },
      });
      await tx.projectInvite.update({ where: { id: invite.id }, data: { useCount: { increment: 1 } } });
      await tx.notification.create({
        data: {
          userId: invite.project.leaderId,
          title: 'Yêu cầu tham gia dự án mới',
          message: `${user.name} muốn tham gia dự án “${invite.project.name}” và đang chờ bạn duyệt.`,
          type: 'account_pending',
        },
      });
      return { status: 'pending', projectId: invite.project.id, projectName: invite.project.name };
    });

    return NextResponse.json({
      ...result,
      message: result.status === 'approved'
        ? `Bạn đã là thành viên của dự án “${result.projectName}”.`
        : result.alreadyPending
          ? `Yêu cầu tham gia dự án “${result.projectName}” của bạn đang chờ Leader duyệt.`
        : `Đã gửi yêu cầu tham gia dự án “${result.projectName}”. Vui lòng chờ Leader duyệt.`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Link mời dự án không hợp lệ' }, { status: 400 });
    }
    if (error instanceof Error) {
      if (error.message === 'INVALID_INVITE') return NextResponse.json({ error: 'Link mời dự án không hợp lệ hoặc đã bị thu hồi' }, { status: 400 });
      if (error.message === 'ACCOUNT_NOT_APPROVED') return NextResponse.json({ error: 'Tài khoản phải được duyệt trước khi tham gia thêm dự án' }, { status: 403 });
      if (error.message === 'WRONG_LEADER') return NextResponse.json({ error: 'Link này thuộc nhóm của Leader khác' }, { status: 403 });
    }
    console.error('Error accepting project invite:', error);
    return NextResponse.json({ error: 'Không thể gửi yêu cầu tham gia dự án' }, { status: 500 });
  }
}
