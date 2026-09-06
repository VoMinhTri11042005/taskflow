import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')?.trim();
    if (!token) return NextResponse.json({ valid: false, error: 'Thiếu mã mời' }, { status: 400 });

    const invite = await db.projectInvite.findFirst({
      where: { token, active: true },
      select: {
        label: true,
        project: {
          select: {
            id: true,
            name: true,
            status: true,
            leader: { select: { name: true, role: true, status: true } },
          },
        },
      },
    });
    if (!invite || invite.project.status !== 'active' || !invite.project.leader || invite.project.leader.role !== 'leader' || invite.project.leader.status !== 'approved') {
      return NextResponse.json({ valid: false, error: 'Link mời dự án không hợp lệ hoặc đã bị thu hồi' }, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      label: invite.label,
      projectId: invite.project.id,
      projectName: invite.project.name,
      leaderName: invite.project.leader.name,
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Error validating project invite:', error);
    return NextResponse.json({ valid: false, error: 'Không thể kiểm tra link mời dự án' }, { status: 500 });
  }
}
