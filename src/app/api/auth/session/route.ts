import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ user: getSession(request) })
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json({ user: null })
  }
}
