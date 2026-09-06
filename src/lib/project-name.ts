/** Keep project labels single-line and safe anywhere they are displayed. */
export function normalizeProjectName(value: string) {
  return value
    .replace(/\\[nr]/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Existing data may predate input validation, so always provide a safe label. */
export function getProjectDisplayName(value: string) {
  return normalizeProjectName(value) || 'Dự án chưa đặt tên';
}
