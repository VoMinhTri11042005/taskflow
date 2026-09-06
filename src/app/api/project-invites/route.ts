import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canManageProject } from '@/lib/permissions';

const createInviteSchema = z.object({
  projectId: z.string().cuid(),
  label: z.string().trim().min(1, 'Tên lời mời không được để trống').max(80, 'Tên lời mời tối đa 80 ký tự').optional(),
});

function forbidden() {
  return NextResponse.json({ error: 'Chỉ Leader sở hữu dự án mới có thể quản lý link mời' }, { status: 403 });
}

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || session.role !== 'leader') return forbidden();
    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId || !(await canManageProject(session, projectId))) return forbidden();

    const invites = await db.projectInvite.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        token: true,
        label: true,
        active: true,
        useCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(invites, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Error fetching project invites:', error);
    return NextResponse.json({ error: 'Không thể tải link mời dự án' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || session.role !== 'leader') return forbidden();
    const validated = createInviteSchema.parse(await request.json());
    if (!(await canManageProject(session, validated.projectId))) return forbidden();
    const project = await db.project.findFirst({
      where: { id: validated.projectId, leaderId: session.id, status: 'active' },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'Chỉ có thể tạo link mời cho dự án đang hoạt động' }, { status: 409 });
    }

    const invite = await db.projectInvite.create({
      data: {
        projectId: validated.projectId,
        token: randomBytes(32).toString('base64url'),
        label: validated.label || null,
      },
      select: {
        id: true,
        token: true,
        label: true,
        active: true,
        useCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(invite, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dữ liệu không hợp lệ' }, { status: 400 });
    }
    console.error('Error creating project invite:', error);
    return NextResponse.json({ error: 'Không thể tạo link mời dự án' }, { status: 500 });
  }
}
