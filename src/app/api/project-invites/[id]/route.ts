import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const updateInviteSchema = z.object({ active: z.boolean() });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session || session.role !== 'leader') {
      return NextResponse.json({ error: 'Chỉ Leader mới có thể thay đổi link mời dự án' }, { status: 403 });
    }
    const { id } = await params;
    const { active } = updateInviteSchema.parse(await request.json());
    const invite = await db.projectInvite.findFirst({
      where: { id, project: { leaderId: session.id } },
      select: { id: true, project: { select: { status: true } } },
    });
    if (!invite) return NextResponse.json({ error: 'Không tìm thấy link mời dự án' }, { status: 404 });
    if (active && invite.project.status !== 'active') {
      return NextResponse.json({ error: 'Không thể mở link mời khi dự án đang lưu trữ' }, { status: 409 });
    }

    const updated = await db.projectInvite.update({
      where: { id },
      data: { active },
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
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }
    console.error('Error updating project invite:', error);
    return NextResponse.json({ error: 'Không thể cập nhật link mời dự án' }, { status: 500 });
  }
}
