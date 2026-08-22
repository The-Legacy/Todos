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
