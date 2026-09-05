import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

// System-wide work statistics are intentionally not exposed to Admin.
// Leaders calculate metrics from their own filtered projects and tasks.
export async function GET(request: NextRequest) {
  const session = getSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ error: 'Báo cáo công việc thuộc không gian Leader' }, { status: 403 })
}
