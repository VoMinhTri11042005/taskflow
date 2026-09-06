import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')?.trim();
    if (!token) return NextResponse.json({ valid: false, error: 'Thiếu mã mời' }, { status: 400 });

    const invite = await db.memberInvite.findFirst({
      where: {
        token,
        active: true,
        leader: { role: 'leader', status: 'approved' },
      },
      select: {
        label: true,
        leader: { select: { name: true } },
      },
    });

    if (!invite) {
      return NextResponse.json({ valid: false, error: 'Link mời không hợp lệ hoặc đã bị thu hồi' }, { status: 404 });
    }

    return NextResponse.json(
      {
        valid: true,
        label: invite.label,
        leaderName: invite.leader.name,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('Error validating member invite:', error);
    return NextResponse.json({ valid: false, error: 'Không thể kiểm tra link mời' }, { status: 500 });
  }
}
