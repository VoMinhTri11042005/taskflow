import { NextRequest, NextResponse } from 'next/server'

// Some browsers still request /favicon.ico even when metadata declares an icon.
// Redirecting keeps that automatic request from producing a noisy 404.
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/taskflow-avatar-vercel.jpg', request.url), 308)
}
