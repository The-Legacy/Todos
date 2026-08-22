import type { TaskPriority } from "@todos/shared";

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "bg-surface-2 text-text-3",
  medium: "bg-amber-tint text-amber",
  high: "bg-red-tint text-red",
};

export const PRIORITY_DOT: Record<TaskPriority, string> = {
  low: "bg-border",
  medium: "bg-amber",
  high: "bg-red",
};

export function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === "completed" || status === "cancelled") return false;
  const today = new Date().toISOString().slice(0, 10);
  return dueDate < today;
}
