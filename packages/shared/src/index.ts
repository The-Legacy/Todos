export type TaskStatus = "backlog" | "scheduled" | "completed" | "cancelled";

export type TaskPriority = "low" | "medium" | "high";

export type ProjectStatus = "active" | "completed" | "archived";

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  userId: string;
  projectId: string | null;
  categoryId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  scheduledDate: string | null;
  weekStart: string | null;
  estimatedMinutes: number | null;
  position: number;
  completedAt: string | null;
  recurringTaskId: string | null;
  recurrenceDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringTask {
  id: string;
  userId: string;
  categoryId: string | null;
  projectId: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  estimatedMinutes: number | null;
  /** Weekday integers (0 = Sunday .. 6 = Saturday, matching `Date#getUTCDay()`) this recurs on.
   * Stored as a bitmask in the database, but the API always sends/accepts this as an array. */
  daysOfWeek: number[];
  startDate: string;
  endDate: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiErrorBody {
  error: string;
}

export const DEFAULT_CATEGORIES: Array<{ name: string; color: string }> = [
  { name: "School", color: "#6366f1" },
  { name: "Work", color: "#0ea5e9" },
  { name: "Workout", color: "#f97316" },
  { name: "Hobbies", color: "#a855f7" },
  { name: "Personal", color: "#22c55e" },
  { name: "Errands", color: "#eab308" },
];

/** Days are represented as "YYYY-MM-DD" strings throughout; all arithmetic is done in UTC to avoid
 * timezone-shift bugs when a date string crosses midnight in the user's local time. */

export function addDays(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type WeekStartDay = 0 | 1; // 0 = Sunday, 1 = Monday

/** Returns the first day of the week containing `dateISO`, per `startDay` (defaults to Monday). */
export function getWeekStart(dateISO: string, startDay: WeekStartDay = 1): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  const day = d.getUTCDay();
  const offset = (day - startDay + 7) % 7;
  return addDays(dateISO, -offset);
}

export function getWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export const WEEKDAY_SHORT_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function daysOfWeekToMask(days: number[]): number {
  return days.reduce((mask, day) => mask | (1 << day), 0);
}

export function maskToDaysOfWeek(mask: number): number[] {
  const days: number[] = [];
  for (let day = 0; day < 7; day++) {
    if (mask & (1 << day)) days.push(day);
  }
  return days;
}

export function dateMatchesDaysOfWeekMask(dateISO: string, mask: number): boolean {
  const day = new Date(`${dateISO}T00:00:00Z`).getUTCDay();
  return (mask & (1 << day)) !== 0;
}

export function describeDaysOfWeekMask(mask: number): string {
  const days = maskToDaysOfWeek(mask);
  if (days.length === 7) return "Daily";
  if (days.length === 1) return `Every ${WEEKDAY_SHORT_LABELS[days[0]]}`;
  return days.map((d) => WEEKDAY_SHORT_LABELS[d]).join(", ");
}
