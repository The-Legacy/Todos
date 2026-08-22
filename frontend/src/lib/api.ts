import type {
  AuthResponse,
  Category,
  Project,
  ProjectStatus,
  RecurringTask,
  Task,
  TaskPriority,
  TaskStatus,
} from "@todos/shared";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit & { token?: string | null } = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new ApiError(body.error ?? "Request failed", res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface CreateCategoryInput {
  name: string;
  color: string;
}

export interface UpdateCategoryInput {
  name?: string;
  color?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  categoryId?: string | null;
  projectId?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string | null;
  scheduledDate?: string | null;
  weekStart?: string | null;
  estimatedMinutes?: number | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  categoryId?: string | null;
  projectId?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string | null;
  scheduledDate?: string | null;
  weekStart?: string | null;
  estimatedMinutes?: number | null;
  position?: number;
}

export interface TaskFilters {
  status?: TaskStatus;
  categoryId?: string;
  projectId?: string;
  scheduledDate?: string;
  weekStart?: string;
  q?: string;
}

export interface ReorderUpdate {
  id: string;
  position: number;
  status?: TaskStatus;
  scheduledDate?: string | null;
  weekStart?: string | null;
}

export interface WeekResponse {
  weekStart: string;
  weekEnd: string;
  days: Record<string, Task[]>;
  backlog: Task[];
}

export interface TodayResponse {
  date: string;
  weekStart: string;
  today: Task[];
  overdue: Task[];
  backlog: Task[];
}

export interface ProjectWithProgress extends Project {
  taskCounts: { total: number; completed: number; remaining: number };
  progress: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  targetDate?: string | null;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  targetDate?: string | null;
}

export interface CreateRecurringTaskInput {
  title: string;
  description?: string | null;
  categoryId?: string | null;
  projectId?: string | null;
  priority?: TaskPriority;
  estimatedMinutes?: number | null;
  daysOfWeek: number[];
  startDate: string;
  endDate?: string | null;
}

export interface UpdateRecurringTaskInput {
  title?: string;
  description?: string | null;
  categoryId?: string | null;
  projectId?: string | null;
  priority?: TaskPriority;
  estimatedMinutes?: number | null;
  daysOfWeek?: number[];
  startDate?: string;
  endDate?: string | null;
  active?: boolean;
}

function toQueryString(filters: TaskFilters = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const api = {
  signup: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  logout: (token: string) => request<{ ok: true }>("/api/auth/logout", { method: "POST", token }),

  me: (token: string) => request<{ user: AuthResponse["user"] }>("/api/auth/me", { token }),

  categories: {
    list: (token: string) => request<{ categories: Category[] }>("/api/categories", { token }),
    create: (token: string, input: CreateCategoryInput) =>
      request<{ category: Category }>("/api/categories", { method: "POST", token, body: JSON.stringify(input) }),
    update: (token: string, id: string, input: UpdateCategoryInput) =>
      request<{ category: Category }>(`/api/categories/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(input),
      }),
    remove: (token: string, id: string) => request<void>(`/api/categories/${id}`, { method: "DELETE", token }),
  },

  tasks: {
    list: (token: string, filters?: TaskFilters) =>
      request<{ tasks: Task[] }>(`/api/tasks${toQueryString(filters)}`, { token }),
    create: (token: string, input: CreateTaskInput) =>
      request<{ task: Task }>("/api/tasks", { method: "POST", token, body: JSON.stringify(input) }),
    update: (token: string, id: string, input: UpdateTaskInput) =>
      request<{ task: Task }>(`/api/tasks/${id}`, { method: "PATCH", token, body: JSON.stringify(input) }),
    remove: (token: string, id: string) => request<void>(`/api/tasks/${id}`, { method: "DELETE", token }),
    reorder: (token: string, updates: ReorderUpdate[]) =>
      request<{ tasks: Task[] }>("/api/tasks/reorder", { method: "POST", token, body: JSON.stringify({ updates }) }),
  },

  week: (token: string, weekStart: string) => request<WeekResponse>(`/api/week/${weekStart}`, { token }),

  today: (token: string, date?: string, weekStartsOn?: 0 | 1) => {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (weekStartsOn !== undefined) params.set("weekStartsOn", String(weekStartsOn));
    const qs = params.toString();
    return request<TodayResponse>(`/api/today${qs ? `?${qs}` : ""}`, { token });
  },

  projects: {
    list: (token: string) => request<{ projects: ProjectWithProgress[] }>("/api/projects", { token }),
    get: (token: string, id: string) =>
      request<{ project: ProjectWithProgress; tasks: Task[] }>(`/api/projects/${id}`, { token }),
    create: (token: string, input: CreateProjectInput) =>
      request<{ project: ProjectWithProgress }>("/api/projects", { method: "POST", token, body: JSON.stringify(input) }),
    update: (token: string, id: string, input: UpdateProjectInput) =>
      request<{ project: ProjectWithProgress }>(`/api/projects/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(input),
      }),
    remove: (token: string, id: string) => request<void>(`/api/projects/${id}`, { method: "DELETE", token }),
  },

  recurringTasks: {
    list: (token: string) => request<{ recurringTasks: RecurringTask[] }>("/api/recurring-tasks", { token }),
    create: (token: string, input: CreateRecurringTaskInput) =>
      request<{ recurringTask: RecurringTask }>("/api/recurring-tasks", {
        method: "POST",
        token,
        body: JSON.stringify(input),
      }),
    update: (token: string, id: string, input: UpdateRecurringTaskInput) =>
      request<{ recurringTask: RecurringTask }>(`/api/recurring-tasks/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(input),
      }),
    remove: (token: string, id: string) => request<void>(`/api/recurring-tasks/${id}`, { method: "DELETE", token }),
  },
};
