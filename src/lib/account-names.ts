import { db } from '@/lib/db';

export const duplicateAccountNameMessage = 'Tên này đã được sử dụng. Vui lòng chọn tên khác.';

/** Keep display names consistent and compare them without case/spacing differences. */
export function normalizeAccountName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

export async function isAccountNameTaken(name: string, excludeUserId?: string) {
  const existing = await db.user.findFirst({
    where: {
      name: {
        equals: normalizeAccountName(name),
        mode: 'insensitive',
      },
      ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
    },
    select: { id: true },
  });

  return Boolean(existing);
}
