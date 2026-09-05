import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { isAdmin, isLeader } from '@/lib/permissions'

const updateMemberSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
  avatar: z.string().optional().nullable(),
  color: z.string().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(_request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const member = await db.teamMember.findUnique({
      where: { id },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    if (session.role === 'leader' && member.role !== 'member') {
      return NextResponse.json({ error: 'Leader chỉ được xem tài khoản Member' }, { status: 403 })
    }
    const account = await db.user.findUnique({ where: { email: member.email }, select: { id: true, status: true } })
    return NextResponse.json({ ...member, userId: account?.id || null, accountStatus: account?.status || 'approved' })
  } catch (error) {
    console.error('Error fetching member:', error)
    return NextResponse.json(
      { error: 'Failed to fetch member' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(session) && !isLeader(session)) return NextResponse.json({ error: 'Bạn không có quyền cập nhật thành viên' }, { status: 403 })
    const current = await db.teamMember.findUnique({ where: { id } })
    if (!current) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    if (session.role === 'leader' && current.role !== 'member') return NextResponse.json({ error: 'Leader chỉ được cập nhật Member' }, { status: 403 })
    const body = await request.json()
    const validated = updateMemberSchema.parse(body)
    if (validated.role && !['leader', 'member'].includes(validated.role)) return NextResponse.json({ error: 'Vai trò không hợp lệ' }, { status: 400 })
    if (session.role === 'leader' && validated.role && validated.role !== 'member') return NextResponse.json({ error: 'Leader không được đổi vai trò Member' }, { status: 403 })
    const email = validated.email?.trim().toLowerCase()
    if (email && email !== current.email) {
      const duplicate = await db.user.findUnique({ where: { email } })
      if (duplicate) return NextResponse.json({ error: 'Email đã tồn tại trong hệ thống' }, { status: 409 })
    }

    const member = await db.$transaction(async (tx) => {
      const updated = await tx.teamMember.update({
        where: { id },
        data: { ...validated, ...(email ? { email } : {}) },
        include: { _count: { select: { tasks: true } } },
      })
      const account = await tx.user.findUnique({ where: { email: current.email } })
      if (account) {
        await tx.user.update({ where: { id: account.id, }, data: {
          ...(validated.name ? { name: validated.name.trim() } : {}),
          ...(email ? { email } : {}),
          ...(validated.role ? { role: validated.role } : {}),
          ...(validated.avatar !== undefined ? { avatar: validated.avatar } : {}),
          ...(validated.color ? { color: validated.color } : {}),
        } })
      }
      return { ...updated, userId: account?.id || null }
    })

    return NextResponse.json(member)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }
    console.error('Error updating member:', error)
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(_request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(session) && !isLeader(session)) return NextResponse.json({ error: 'Bạn không có quyền xóa thành viên' }, { status: 403 })
    const member = await db.teamMember.findUnique({ where: { id } })
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    if (session.role === 'leader' && member.role !== 'member') return NextResponse.json({ error: 'Leader chỉ được xóa Member' }, { status: 403 })
    const account = await db.user.findUnique({ where: { email: member.email }, select: { id: true, role: true } })
    if (account?.role === 'admin') return NextResponse.json({ error: 'Không thể xóa tài khoản admin duy nhất' }, { status: 409 })
    await db.$transaction(async (tx) => {
      if (account) await tx.user.delete({ where: { id: account.id } })
      await tx.teamMember.delete({ where: { id } })
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }
    console.error('Error deleting member:', error)
    return NextResponse.json(
      { error: 'Failed to delete member' },
      { status: 500 }
    )
  }
}
