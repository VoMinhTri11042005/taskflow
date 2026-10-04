import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { isActiveAdmin } from '@/lib/permissions';

const querySchema = z.object({
  leaderId: z.string().cuid(),
  status: z.enum(['all', 'approved', 'pending']).default('all'),
});

/**
 * Admin-only roster used by the Leader summary cards. It deliberately reads
 * User records rather than TeamMember records so pending accounts appear too.
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !(await isActiveAdmin(session))) {
      return NextResponse.json({ error: 'Chỉ Quản trị viên được xem danh sách Member của Leader' }, { status: 403 });
    }

    const { leaderId, status } = querySchema.parse({
      leaderId: request.nextUrl.searchParams.get('leaderId'),
      status: request.nextUrl.searchParams.get('status') ?? undefined,
    });

    const members = await db.user.findMany({
      where: {
        role: 'member',
        leaderId,
        status: status === 'all' ? { in: ['approved', 'pending'] } : status,
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        color: true,
        avatar: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ members }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Bộ lọc Member không hợp lệ' }, { status: 400 });
    }
    console.error('Error fetching Leader members:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách Member của Leader' }, { status: 500 });
  }
}
