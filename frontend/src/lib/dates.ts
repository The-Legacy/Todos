const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDayLabel(dateISO: string, index: number): string {
  const [, month, day] = dateISO.split("-");
  return `${WEEKDAY_LABELS[index]} ${Number(month)}/${Number(day)}`;
}

export function formatWeekRange(weekStart: string, weekEnd: string): string {
  const [, sm, sd] = weekStart.split("-");
  const [, em, ed] = weekEnd.split("-");
  return `${Number(sm)}/${Number(sd)} – ${Number(em)}/${Number(ed)}`;
}
