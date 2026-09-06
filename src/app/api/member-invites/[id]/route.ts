import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const updateInviteSchema = z.object({
  active: z.boolean(),
});

function forbidden() {
  return NextResponse.json({ error: 'Chỉ Leader sở hữu link mới được thay đổi link mời' }, { status: 403 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session || session.role !== 'leader') return forbidden();
    const { id } = await params;
    const body = await request.json();
    const validated = updateInviteSchema.parse(body);

    const invite = await db.memberInvite.findFirst({
      where: { id, leaderId: session.id },
      select: { id: true },
    });
    if (!invite) return NextResponse.json({ error: 'Không tìm thấy link mời' }, { status: 404 });

    const updated = await db.memberInvite.update({
      where: { id },
      data: { active: validated.active },
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
    console.error('Error updating member invite:', error);
    return NextResponse.json({ error: 'Không thể cập nhật link mời' }, { status: 500 });
  }
}
