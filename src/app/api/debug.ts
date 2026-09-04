import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashSync } from 'bcryptjs'

// Secure one-time admin creation/reset endpoint under /api/debug
// Must POST JSON with { action: 'ensure-admin', email?, password?, name? }
// and include header x-admin-secret matching ADMIN_SETUP_SECRET.

export async function POST(request: NextRequest) {
  try {
    const headerSecret = request.headers.get('x-admin-secret')
    const body = await request.json().catch(() => ({}))
    const bodySecret = body?.secret
    const secret = headerSecret || bodySecret

    if (!process.env.ADMIN_SETUP_SECRET || secret !== process.env.ADMIN_SETUP_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (body?.action !== 'ensure-admin') {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
    }

    const email = (body?.email || 'admin@taskflow.vn').trim().toLowerCase()
    const password = body?.password || 'admin123!'
    const name = body?.name || 'Admin'

    const hashed = hashSync(password, 10)

    const user = await db.user.upsert({
      where: { email },
      update: {
        password: hashed,
        role: 'admin',
        status: 'approved',
        name,
      },
      create: {
        email,
        password: hashed,
        name,
        role: 'admin',
        status: 'approved',
      },
      select: { id: true, email: true, name: true },
    })

    try {
      await db.teamMember.upsert({
        where: { email },
        update: { name, role: 'admin' },
        create: { name, email, role: 'admin' },
      })
    } catch (e) {
      console.warn('teamMember upsert failed', e)
    }

    return NextResponse.json({ message: 'Admin created/updated', email: user.email, password }, { status: 201 })
  } catch (err) {
    console.error('debug ensure-admin error:', err)
    return NextResponse.json({ error: 'Unable to ensure admin' }, { status: 500 })
  }
}
