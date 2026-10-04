import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * Returns project-join requests that still need attention from the signed-in
 * member. Approved memberships are served by /api/projects instead.
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 });
    }
    if (session.role !== 'member') {
      return NextResponse.json({ error: 'Chỉ tài khoản Thành viên mới xem được yêu cầu tham gia dự án' }, { status: 403 });
    }

    const memberships = await db.projectMember.findMany({
      where: {
        userId: session.id,
        status: { in: ['pending', 'rejected'] },
        project: { status: 'active' },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
            status: true,
            leader: { select: { name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(
      memberships.map(({ project, ...membership }) => {
        const { leader, ...projectData } = project;
        return {
          ...membership,
          project: {
            ...projectData,
            leaderName: leader?.name ?? null,
          },
        };
      }),
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('Error fetching project memberships:', error);
    return NextResponse.json({ error: 'Không thể tải trạng thái tham gia dự án' }, { status: 500 });
  }
}
