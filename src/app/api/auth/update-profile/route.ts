import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name } = body

    if (!userId || !name) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      )
    }

    if (name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Tên không được để trống' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Không tìm thấy người dùng' },
        { status: 404 }
      )
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { name: name.trim() },
    })

    // Also update the corresponding TeamMember name
    await db.teamMember.updateMany({
      where: { email: user.email },
      data: { name: name.trim() },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Không thể cập nhật thông tin cá nhân' },
      { status: 500 }
    )
  }
}
