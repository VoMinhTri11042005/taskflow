import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { canAccessTask, canManageTask } from '@/lib/permissions'

const checklistTitle = z.string().trim().min(1, 'Tên mục không được để trống').max(500, 'Tên mục quá dài')

const createChecklistItemSchema = z.object({
  title: checklistTitle,
})

const updateChecklistItemSchema = z
  .object({
    itemId: z.string().cuid(),
    title: checklistTitle.optional(),
    isCompleted: z.boolean().optional(),
  })
  .refine((value) => value.title !== undefined || value.isCompleted !== undefined, {
    message: 'Cần có thay đổi cho mục checklist',
  })

const deleteChecklistItemSchema = z.object({
  itemId: z.string().cuid(),
})

function taskNotFound() {
  return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 })
}

function forbidden(message: string) {
  return NextResponse.json({ error: message }, { status: 403 })
}

/** Verify that the requested child record belongs to this task before mutating it. */
async function findChecklistItem(taskId: string, itemId: string) {
  return db.taskChecklistItem.findFirst({
    where: { id: itemId, taskId },
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 })

    if (!(await canAccessTask(session, taskId))) {
      return forbidden('Bạn không có quyền xem checklist của công việc này')
    }

    const checklist = await db.taskChecklistItem.findMany({
      where: { taskId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json(checklist, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    console.error('Error fetching task checklist:', error)
    return NextResponse.json({ error: 'Không thể tải checklist' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 })

    if (!(await canManageTask(session, taskId))) {
      return forbidden('Chỉ Leader quản lý công việc mới có thể thêm mục checklist')
    }

    const { title } = createChecklistItemSchema.parse(await request.json())

    const checklistItem = await db.$transaction(async (tx) => {
      // Numbering only needs to be stable within a task.  We calculate a
      // trailing position instead of trusting a position supplied by clients.
      const lastItem = await tx.taskChecklistItem.findFirst({
        where: { taskId },
        orderBy: { position: 'desc' },
        select: { position: true },
      })

      const created = await tx.taskChecklistItem.create({
        data: {
          taskId,
          title,
          position: (lastItem?.position ?? -1) + 1,
        },
      })

      await tx.taskActivity.create({
        data: {
          taskId,
          userId: session.id,
          action: 'checklist_item_created',
          details: 'Đã thêm một mục checklist',
        },
      })

      return created
    })

    return NextResponse.json(checklistItem, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dữ liệu checklist không hợp lệ', details: error.issues }, { status: 400 })
    }
    console.error('Error creating checklist item:', error)
    return NextResponse.json({ error: 'Không thể thêm mục checklist' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 })

    const update = updateChecklistItemSchema.parse(await request.json())
    const [canManage, canAccess] = await Promise.all([
      canManageTask(session, taskId),
      canAccessTask(session, taskId),
    ])

    if (!canAccess) {
      return forbidden('Bạn không có quyền cập nhật checklist của công việc này')
    }

    // A Member may mark a shared item complete/incomplete, but must never be
    // able to alter its text.  A mixed payload is treated as a rename and is
    // therefore reserved for the Leader too.
    if (update.title !== undefined && !canManage) {
      return forbidden('Chỉ Leader quản lý công việc mới có thể đổi tên mục checklist')
    }

    const currentItem = await findChecklistItem(taskId, update.itemId)
    if (!currentItem) return taskNotFound()

    const checklistItem = await db.$transaction(async (tx) => {
      const updated = await tx.taskChecklistItem.update({
        where: { id: update.itemId },
        data: {
          ...(update.title !== undefined ? { title: update.title } : {}),
          ...(update.isCompleted !== undefined ? { isCompleted: update.isCompleted } : {}),
        },
      })

      const action = update.title !== undefined
        ? 'checklist_item_renamed'
        : update.isCompleted
          ? 'checklist_item_completed'
          : 'checklist_item_reopened'

      await tx.taskActivity.create({
        data: {
          taskId,
          userId: session.id,
          action,
          details: update.title !== undefined
            ? 'Đã đổi tên một mục checklist'
            : update.isCompleted
              ? 'Đã hoàn thành một mục checklist'
              : 'Đã mở lại một mục checklist',
        },
      })

      return updated
    })

    return NextResponse.json(checklistItem)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dữ liệu checklist không hợp lệ', details: error.issues }, { status: 400 })
    }
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2025'
    ) {
      return taskNotFound()
    }
    console.error('Error updating checklist item:', error)
    return NextResponse.json({ error: 'Không thể cập nhật mục checklist' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const session = getSession(request)
    if (!session) return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 })

    if (!(await canManageTask(session, taskId))) {
      return forbidden('Chỉ Leader quản lý công việc mới có thể xóa mục checklist')
    }

    const { itemId } = deleteChecklistItemSchema.parse(await request.json())
    const currentItem = await findChecklistItem(taskId, itemId)
    if (!currentItem) return taskNotFound()

    await db.$transaction(async (tx) => {
      await tx.taskChecklistItem.delete({ where: { id: itemId } })
      await tx.taskActivity.create({
        data: {
          taskId,
          userId: session.id,
          action: 'checklist_item_deleted',
          details: 'Đã xóa một mục checklist',
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dữ liệu checklist không hợp lệ', details: error.issues }, { status: 400 })
    }
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2025'
    ) {
      return taskNotFound()
    }
    console.error('Error deleting checklist item:', error)
    return NextResponse.json({ error: 'Không thể xóa mục checklist' }, { status: 500 })
  }
}
