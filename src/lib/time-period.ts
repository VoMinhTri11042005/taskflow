/** Start of the Monday-to-Sunday week in the environment's local time zone. */
export function getMondayWeekStart(date: Date): Date {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}
