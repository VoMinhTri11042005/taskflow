import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

const DEFAULT_PAGE_SIZE = 12
const MAX_PAGE_SIZE = 25

function parsePositiveInteger(value: string | null, fallback: number, maximum: number) {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(parsed, maximum)
}

function pagination(page: number, pageSize: number, total: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

/**
 * Admin-only directory. The two modes intentionally use small server-side
 * pages so an organisation with thousands of accounts never has to send every
 * account to the browser just to find one Member or inspect a Leader.
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request)
    if (session?.role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ Quản trị viên được truy cập danh bạ hệ thống' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const mode = searchParams.get('mode') === 'members' ? 'members' : 'leaders'
    const query = (searchParams.get('q') || '').trim().slice(0, 100)
    const page = parsePositiveInteger(searchParams.get('page'), 1, 10000)
    const pageSize = parsePositiveInteger(searchParams.get('limit'), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)

    if (mode === 'members') {
      if (query.length < 2) {
        return NextResponse.json({
          members: [],
          pageInfo: { ...pagination(1, pageSize, 0), queryTooShort: true },
        }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
      }

      const where: Prisma.UserWhereInput = {
        role: 'member',
        OR: [
          { name: { contains: query, mode: 'insensitive' as const } },
          { email: { contains: query, mode: 'insensitive' as const } },
        ],
      }
      const [total, users] = await Promise.all([
        db.user.count({ where }),
        db.user.findMany({
          where,
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            color: true,
            leaderId: true,
            leader: { select: { id: true, name: true, email: true, color: true, status: true } },
          },
        }),
      ])

      return NextResponse.json({
        members: users,
        pageInfo: pagination(page, pageSize, total),
      }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
    }

    const leaderWhere: Prisma.UserWhereInput = {
      role: 'leader',
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              { email: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }
    // A registration created from a project QR/link is approved in that
    // project's roster by its Leader, not in the Admin approval queue.
    const adminPendingWhere: Prisma.UserWhereInput = {
      status: 'pending',
      projectMemberships: { none: { status: 'pending' } },
    }

    const [
      total,
      leaders,
      leaderCount,
      memberCount,
      approvedLeaderCount,
      approvedMemberCount,
      pendingLeaderCount,
      pendingMemberCount,
      pendingAccounts,
    ] = await Promise.all([
      db.user.count({ where: leaderWhere }),
      db.user.findMany({
        where: leaderWhere,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, name: true, email: true, color: true, status: true },
      }),
      db.user.count({ where: { role: 'leader' } }),
      db.user.count({ where: { role: 'member' } }),
      db.user.count({ where: { role: 'leader', status: 'approved' } }),
      db.user.count({ where: { role: 'member', status: 'approved' } }),
      db.user.count({ where: { ...adminPendingWhere, role: 'leader' } }),
      db.user.count({ where: { ...adminPendingWhere, role: 'member' } }),
      db.user.findMany({
        where: adminPendingWhere,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
        },
      }),
    ])

    const leaderIds = leaders.map((leader) => leader.id)
    const memberGroups = leaderIds.length > 0
      ? await db.user.groupBy({
          by: ['leaderId', 'status'],
          // Rejected accounts no longer belong to the Leader's active roster.
          // Pending accounts stay visible because that Leader still needs to act.
          where: { role: 'member', status: { not: 'rejected' }, leaderId: { in: leaderIds } },
          _count: { _all: true },
        })
      : []
    const countsByLeader = new Map<string, { total: number; approved: number; pending: number }>()
    for (const group of memberGroups) {
      if (!group.leaderId) continue
      const count = countsByLeader.get(group.leaderId) || { total: 0, approved: 0, pending: 0 }
      count.total += group._count._all
      if (group.status === 'approved') count.approved += group._count._all
      if (group.status === 'pending') count.pending += group._count._all
      countsByLeader.set(group.leaderId, count)
    }

    return NextResponse.json({
      summary: {
        leaderCount,
        memberCount,
        approvedLeaderCount,
        approvedMemberCount,
        approvedCount: approvedLeaderCount + approvedMemberCount,
        pendingLeaderCount,
        pendingMemberCount,
        pendingCount: pendingLeaderCount + pendingMemberCount,
      },
      pendingAccounts,
      leaders: leaders.map((leader) => {
        const counts = countsByLeader.get(leader.id) || { total: 0, approved: 0, pending: 0 }
        return {
          ...leader,
          memberCount: counts.total,
          approvedMemberCount: counts.approved,
          pendingMemberCount: counts.pending,
        }
      }),
      pageInfo: pagination(page, pageSize, total),
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error) {
    console.error('Error fetching admin directory:', error)
    return NextResponse.json({ error: 'Không thể tải danh bạ hệ thống' }, { status: 500 })
  }
}
