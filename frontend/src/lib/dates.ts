// Index = Date#getUTCDay() (0 = Sunday .. 6 = Saturday) — always derived from the actual date,
// never from a task's position within a week array, so this stays correct regardless of
// whether the user's weeks start on Monday or Sunday.
const WEEKDAY_LABELS_BY_DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function todayISO(timezone?: string): string {
  if (!timezone) return new Date().toISOString().slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
}

export function formatDayLabel(dateISO: string): string {
  const [, month, day] = dateISO.split("-");
  const dow = new Date(`${dateISO}T00:00:00Z`).getUTCDay();
  return `${WEEKDAY_LABELS_BY_DOW[dow]} ${Number(month)}/${Number(day)}`;
}

export function formatWeekRange(weekStart: string, weekEnd: string): string {
  const [, sm, sd] = weekStart.split("-");
  const [, em, ed] = weekEnd.split("-");
  return `${Number(sm)}/${Number(sd)} – ${Number(em)}/${Number(ed)}`;
}
