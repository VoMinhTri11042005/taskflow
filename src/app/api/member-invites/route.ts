import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const createInviteSchema = z.object({
  label: z.string().trim().min(1, 'Tên lời mời không được để trống').max(80, 'Tên lời mời tối đa 80 ký tự').optional(),
});

function forbidden() {
  return NextResponse.json({ error: 'Chỉ Leader mới có thể quản lý link mời' }, { status: 403 });
}

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || session.role !== 'leader') return forbidden();

    const invites = await db.memberInvite.findMany({
      where: { leaderId: session.id },
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

    return NextResponse.json(invites, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('Error fetching member invites:', error);
    return NextResponse.json({ error: 'Không thể tải link mời' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || session.role !== 'leader') return forbidden();

    const body = await request.json();
    const validated = createInviteSchema.parse(body);

    // A cryptographically random, URL-safe token is intentionally generated
    // only on the server. The QR code is just another representation of it.
    const invite = await db.memberInvite.create({
      data: {
        token: randomBytes(32).toString('base64url'),
        label: validated.label || null,
        leaderId: session.id,
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
    console.error('Error creating member invite:', error);
    return NextResponse.json({ error: 'Không thể tạo link mời' }, { status: 500 });
  }
}
