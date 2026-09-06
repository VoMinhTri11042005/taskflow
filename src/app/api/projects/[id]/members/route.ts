import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessProject, canManageProject } from '@/lib/permissions';

const membershipSchema = z.object({
  userId: z.string().cuid(),
});

const reviewSchema = membershipSchema.extend({
  status: z.enum(['approved', 'rejected']),
});

async function getProjectContext(request: NextRequest, id: string) {
  const session = getSession(request);
  if (!session) return { error: NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 }) };

  const project = await db.project.findUnique({
    where: { id },
    select: { id: true, name: true, leaderId: true },
  });
  if (!project) return { error: NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 }) };

  const canManage = await canManageProject(session, id);
  if (!canManage && !(await canAccessProject(session, id))) {
    return { error: NextResponse.json({ error: 'Bạn không có quyền truy cập thành viên dự án này' }, { status: 403 }) };
  }

  return { session, project, canManage };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getProjectContext(request, id);
    if ('error' in context) return context.error;

    const memberships = await db.projectMember.findMany({
      where: {
        projectId: id,
        ...(context.canManage ? {} : { status: 'approved' }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, color: true, avatar: true, status: true },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    const teamMembers = await db.teamMember.findMany({
      where: { email: { in: memberships.map((membership) => membership.user.email) } },
      select: { id: true, email: true },
    });
    const teamMemberIdByEmail = new Map(teamMembers.map((member) => [member.email, member.id]));

    return NextResponse.json({
      project: context.project,
      members: memberships.map((membership) => ({
        id: membership.id,
        status: membership.status,
        createdAt: membership.createdAt,
        user: {
          ...membership.user,
          teamMemberId: teamMemberIdByEmail.get(membership.user.email) || null,
        },
      })),
    });
  } catch (error) {
    console.error('Error fetching project members:', error);
    return NextResponse.json({ error: 'Không thể tải thành viên dự án' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = getSession(request);
    if (!session) return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 });
    if (!(await canManageProject(session, id))) {
      return NextResponse.json({ error: 'Chỉ Leader sở hữu dự án mới có thể thêm thành viên' }, { status: 403 });
    }

    const { userId } = membershipSchema.parse(await request.json());
    const member = await db.user.findFirst({
      where: { id: userId, role: 'member', status: 'approved', leaderId: session.id },
      select: { id: true, name: true, email: true, color: true, avatar: true },
    });
    if (!member) {
      return NextResponse.json({ error: 'Member không thuộc đội của bạn hoặc chưa được duyệt' }, { status: 400 });
    }

    const membership = await db.projectMember.upsert({
      where: { projectId_userId: { projectId: id, userId } },
      create: { projectId: id, userId, status: 'approved' },
      update: { status: 'approved' },
      select: { id: true, status: true, createdAt: true },
    });

    return NextResponse.json({ ...membership, user: member }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dữ liệu thành viên không hợp lệ' }, { status: 400 });
    }
    console.error('Error adding project member:', error);
    return NextResponse.json({ error: 'Không thể thêm thành viên vào dự án' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = getSession(request);
    if (!session) return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 });
    if (!(await canManageProject(session, id))) {
      return NextResponse.json({ error: 'Chỉ Leader sở hữu dự án mới có thể duyệt thành viên' }, { status: 403 });
    }

    const { userId, status } = reviewSchema.parse(await request.json());
    const membership = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId } },
      include: {
        project: { select: { name: true } },
        user: { select: { id: true, name: true, email: true, status: true, leaderId: true, color: true, avatar: true } },
      },
    });
    if (!membership || membership.user.leaderId !== session.id) {
      return NextResponse.json({ error: 'Không tìm thấy yêu cầu tham gia dự án' }, { status: 404 });
    }
    if (membership.status !== 'pending') {
      return NextResponse.json({ error: 'Chỉ có thể duyệt hoặc từ chối yêu cầu đang chờ. Hãy dùng chức năng gỡ Member để xóa người đã tham gia.' }, { status: 409 });
    }

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.projectMember.update({
        where: { projectId_userId: { projectId: id, userId } },
        data: { status },
        select: { id: true, status: true, createdAt: true },
      });

      if (status === 'approved' && membership.user.status !== 'approved') {
        await tx.user.update({ where: { id: userId }, data: { status: 'approved' } });
        await tx.teamMember.upsert({
          where: { email: membership.user.email },
          create: {
            name: membership.user.name,
            email: membership.user.email,
            role: 'member',
            color: membership.user.color,
            avatar: membership.user.avatar,
          },
          update: {
            name: membership.user.name,
            role: 'member',
            color: membership.user.color,
            avatar: membership.user.avatar,
          },
        });
      }

      if (status === 'rejected' && membership.user.status === 'pending') {
        await tx.user.update({ where: { id: userId }, data: { status: 'rejected' } });
      }

      await tx.notification.create({
        data: {
          userId,
          title: status === 'approved' ? 'Đã tham gia dự án' : 'Yêu cầu tham gia dự án chưa được duyệt',
          message: status === 'approved'
            ? `Leader ${session.name} đã duyệt bạn tham gia dự án “${membership.project.name}”.`
            : `Leader ${session.name} chưa duyệt yêu cầu tham gia dự án của bạn.`,
          type: status === 'approved' ? 'account_approved' : 'account_rejected',
        },
      });

      return updated;
    });

    return NextResponse.json({ ...result, user: membership.user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dữ liệu duyệt không hợp lệ' }, { status: 400 });
    }
    console.error('Error reviewing project member:', error);
    return NextResponse.json({ error: 'Không thể cập nhật yêu cầu tham gia dự án' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = getSession(request);
    if (!session) return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 });
    if (!(await canManageProject(session, id))) {
      return NextResponse.json({ error: 'Chỉ Leader sở hữu dự án mới có thể gỡ thành viên' }, { status: 403 });
    }

    const { userId } = membershipSchema.parse(await request.json());
    const membership = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId } },
      include: { user: { select: { email: true, leaderId: true } } },
    });
    if (!membership || membership.user.leaderId !== session.id) {
      return NextResponse.json({ error: 'Không tìm thấy thành viên dự án' }, { status: 404 });
    }

    const teamMember = await db.teamMember.findUnique({ where: { email: membership.user.email }, select: { id: true } });
    if (teamMember) {
      const activeTask = await db.task.findFirst({
        where: {
          projectId: id,
          assigneeId: teamMember.id,
          status: { not: 'done' },
        },
        select: { id: true },
      });
      if (activeTask) {
        return NextResponse.json({ error: 'Hãy chuyển hoặc hoàn thành các công việc đang giao trước khi gỡ Member' }, { status: 409 });
      }
    }

    await db.$transaction(async (tx) => {
      if (teamMember) {
        await tx.task.updateMany({
          where: { projectId: id, assigneeId: teamMember.id },
          data: { assigneeId: null },
        });
      }
      await tx.projectMember.delete({ where: { projectId_userId: { projectId: id, userId } } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dữ liệu thành viên không hợp lệ' }, { status: 400 });
    }
    console.error('Error removing project member:', error);
    return NextResponse.json({ error: 'Không thể gỡ thành viên khỏi dự án' }, { status: 500 });
  }
}
