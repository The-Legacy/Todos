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
