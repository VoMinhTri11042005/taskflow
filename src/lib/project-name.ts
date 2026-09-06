/** Keep project labels single-line and safe anywhere they are displayed. */
export function normalizeProjectName(value: string) {
  return value
    // Some older form submissions stored one or more literal backslashes
    // before `n`/`r` (for example `\\n EXCEL`). Remove the whole sequence.
    .replace(/\\+[nr]/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Existing data may predate input validation, so always provide a safe label. */
export function getProjectDisplayName(value: string) {
  return normalizeProjectName(value) || 'Dự án chưa đặt tên';
}

/** Preserve a project object while making its label safe for UI/API output. */
export function withNormalizedProjectName<T extends { name: string }>(project: T): T {
  return { ...project, name: getProjectDisplayName(project.name) };
}
