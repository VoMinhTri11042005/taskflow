import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { hashSync } from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { isManager } from '@/lib/permissions'

const createMemberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  role: z.string().optional().default('member'),
  avatar: z.string().optional(),
  color: z.string().optional().default('#6366f1'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const members = await db.teamMember.findMany({
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    const users = await db.user.findMany({
      where: { email: { in: members.map((member) => member.email) } },
      select: { id: true, email: true, status: true },
    })
    const userByEmail = new Map(users.map((user) => [user.email, user]))

    // Admins can see every team record. Leaders manage members, while a member
    // only needs their own record for profile/task screens.
    const visible = session.role === 'admin'
      ? members
      : session.role === 'leader'
        ? members.filter((member) => member.role === 'member')
        : members.filter((member) => member.id === session.teamMemberId)

    return NextResponse.json(visible.map((member) => ({
      ...member,
      userId: userByEmail.get(member.email)?.id || null,
      accountStatus: userByEmail.get(member.email)?.status || 'approved',
    })))
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isManager(session)) return NextResponse.json({ error: 'Bạn không có quyền tạo tài khoản' }, { status: 403 })

    const body = await request.json()
    const validated = createMemberSchema.parse(body)
    const role = validated.role === 'leader' || validated.role === 'member' ? validated.role : null
    if (!role || (session.role === 'leader' && role !== 'member')) {
      return NextResponse.json({ error: 'Vai trò không hợp lệ với tài khoản hiện tại' }, { status: 403 })
    }
    const email = validated.email.trim().toLowerCase()
    const password = validated.password || 'ChangeMe2026!'
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: 'Email đã tồn tại trong hệ thống' }, { status: 409 })

    const member = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: validated.name.trim(), email, role, status: 'approved',
          password: hashSync(password, 10), avatar: validated.avatar || null,
          color: validated.color || '#6366f1',
        },
      })
      return tx.teamMember.create({
        data: {
          name: validated.name.trim(), email, role,
          avatar: validated.avatar || null, color: validated.color || '#6366f1',
        },
        include: { _count: { select: { tasks: true } } },
      }).then((created) => ({ ...created, userId: user.id, defaultPassword: password }))
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error creating member:', error)
    return NextResponse.json(
      { error: 'Failed to create member' },
      { status: 500 }
    )
  }
}
