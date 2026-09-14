import { Hono } from "hono";
import type { AppVariables } from "../types/env";
import { newId } from "../db/ids";
import type { TaskPriority, TaskStatus } from "@todos/shared";
import { isValidDateString } from "@todos/shared";
import { requireAuth } from "../middleware/requireAuth";

const tasks = new Hono<{ Bindings: Env; Variables: AppVariables }>();
tasks.use("*", requireAuth);

const TASK_COLUMNS = `
  id, user_id as userId, project_id as projectId, category_id as categoryId,
  title, description, status, priority, due_date as dueDate,
  scheduled_date as scheduledDate, week_start as weekStart,
  estimated_minutes as estimatedMinutes, position, completed_at as completedAt,
  recurring_task_id as recurringTaskId, recurrence_date as recurrenceDate,
  created_at as createdAt, updated_at as updatedAt
`;

const VALID_STATUSES: TaskStatus[] = ["backlog", "scheduled", "completed", "cancelled"];
const VALID_PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
const isValidDate = isValidDateString;

tasks.get("/", async (c) => {
  const userId = c.get("userId");
  const { status, categoryId, projectId, scheduledDate, weekStart, q } = c.req.query();

  const clauses = ["user_id = ?"];
  const values: unknown[] = [userId];

  if (status) {
    clauses.push("status = ?");
    values.push(status);
  }
  if (categoryId) {
    clauses.push("category_id = ?");
    values.push(categoryId);
  }
  if (projectId) {
    clauses.push("project_id = ?");
    values.push(projectId);
  }
  if (scheduledDate) {
    clauses.push("scheduled_date = ?");
    values.push(scheduledDate);
  }
  if (weekStart) {
    clauses.push("week_start = ?");
    values.push(weekStart);
  }
  if (q) {
    clauses.push("title LIKE ?");
    values.push(`%${q}%`);
  }

  const { results } = await c.env.DB.prepare(
    `SELECT ${TASK_COLUMNS} FROM tasks WHERE ${clauses.join(" AND ")} ORDER BY position ASC, created_at ASC`,
  )
    .bind(...values)
    .all();

  return c.json({ tasks: results });
});

tasks.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c
    .req.json<{
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
    }>()
    .catch(() => null);

  const title = body?.title?.trim();
  if (!title) {
    return c.json({ error: "Title is required" }, 400);
  }

  const priority = body?.priority ?? "medium";
  if (!VALID_PRIORITIES.includes(priority)) {
    return c.json({ error: "Invalid priority" }, 400);
  }

  const status = body?.status ?? (body?.scheduledDate ? "scheduled" : "backlog");
  if (!VALID_STATUSES.includes(status)) {
    return c.json({ error: "Invalid status" }, 400);
  }

  for (const [field, value] of [
    ["dueDate", body?.dueDate],
    ["scheduledDate", body?.scheduledDate],
    ["weekStart", body?.weekStart],
  ] as const) {
    if (value != null && !isValidDate(value)) {
      return c.json({ error: `${field} must be an ISO date (YYYY-MM-DD)` }, 400);
    }
  }

  if (body?.categoryId) {
    const category = await c.env.DB.prepare("SELECT id FROM categories WHERE id = ? AND user_id = ?")
      .bind(body.categoryId, userId)
      .first();
    if (!category) return c.json({ error: "Category not found" }, 404);
  }
  if (body?.projectId) {
    const project = await c.env.DB.prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
      .bind(body.projectId, userId)
      .first();
    if (!project) return c.json({ error: "Project not found" }, 404);
  }

  const { position } = (await c.env.DB.prepare(
    "SELECT COALESCE(MAX(position) + 1, 0) as position FROM tasks WHERE user_id = ?",
  )
    .bind(userId)
    .first<{ position: number }>()) ?? { position: 0 };

  const id = newId();
  await c.env.DB.prepare(
    `INSERT INTO tasks (
      id, user_id, project_id, category_id, title, description, status, priority,
      due_date, scheduled_date, week_start, estimated_minutes, position
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      userId,
      body?.projectId ?? null,
      body?.categoryId ?? null,
      title,
      body?.description ?? null,
      status,
      priority,
      body?.dueDate ?? null,
      body?.scheduledDate ?? null,
      body?.weekStart ?? null,
      body?.estimatedMinutes ?? null,
      position,
    )
    .run();

  const task = await c.env.DB.prepare(`SELECT ${TASK_COLUMNS} FROM tasks WHERE id = ? AND user_id = ?`)
    .bind(id, userId)
    .first();
  return c.json({ task }, 201);
});

interface ReorderUpdate {
  id: string;
  position: number;
  status?: TaskStatus;
  scheduledDate?: string | null;
  weekStart?: string | null;
}

tasks.post("/reorder", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ updates?: ReorderUpdate[] }>().catch(() => null);
  const updates = body?.updates;

  if (!Array.isArray(updates) || updates.length === 0) {
    return c.json({ error: "updates must be a non-empty array" }, 400);
  }

  for (const update of updates) {
    if (!update.id || typeof update.position !== "number") {
      return c.json({ error: "Each update needs an id and a numeric position" }, 400);
    }
    if (update.status !== undefined && !VALID_STATUSES.includes(update.status)) {
      return c.json({ error: "Invalid status" }, 400);
    }
    for (const value of [update.scheduledDate, update.weekStart]) {
      if (value != null && !isValidDate(value)) {
        return c.json({ error: "Dates must be ISO (YYYY-MM-DD)" }, 400);
      }
    }
  }

  const ids = updates.map((u) => u.id);
  const placeholders = ids.map(() => "?").join(", ");
  const { results: owned } = await c.env.DB.prepare(
    `SELECT id FROM tasks WHERE user_id = ? AND id IN (${placeholders})`,
  )
    .bind(userId, ...ids)
    .all<{ id: string }>();
  if (owned.length !== ids.length) {
    return c.json({ error: "One or more tasks were not found" }, 404);
  }

  const statements = updates.map((update) => {
    const columns = ["position = ?", "updated_at = datetime('now')"];
    const values: unknown[] = [update.position];
    if (update.status !== undefined) {
      columns.push("status = ?");
      values.push(update.status);
      columns.push("completed_at = ?");
      values.push(update.status === "completed" ? new Date().toISOString() : null);
    }
    if (update.scheduledDate !== undefined) {
      columns.push("scheduled_date = ?");
      values.push(update.scheduledDate);
    }
    if (update.weekStart !== undefined) {
      columns.push("week_start = ?");
      values.push(update.weekStart);
    }
    return c.env.DB.prepare(`UPDATE tasks SET ${columns.join(", ")} WHERE id = ? AND user_id = ?`).bind(
      ...values,
      update.id,
      userId,
    );
  });

  await c.env.DB.batch(statements);

  const { results } = await c.env.DB.prepare(
    `SELECT ${TASK_COLUMNS} FROM tasks WHERE user_id = ? AND id IN (${placeholders})`,
  )
    .bind(userId, ...ids)
    .all();
  return c.json({ tasks: results });
});

tasks.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const existing = await c.env.DB.prepare("SELECT id FROM tasks WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first();
  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  const body = await c
    .req.json<{
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
    }>()
    .catch(() => null);

  if (!body) {
    return c.json({ error: "Invalid request body" }, 400);
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) return c.json({ error: "Title cannot be empty" }, 400);
    updates.push("title = ?");
    values.push(title);
  }
  if (body.description !== undefined) {
    updates.push("description = ?");
    values.push(body.description);
  }
  if (body.priority !== undefined) {
    if (!VALID_PRIORITIES.includes(body.priority)) return c.json({ error: "Invalid priority" }, 400);
    updates.push("priority = ?");
    values.push(body.priority);
  }
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) return c.json({ error: "Invalid status" }, 400);
    updates.push("status = ?");
    values.push(body.status);
    updates.push("completed_at = ?");
    values.push(body.status === "completed" ? new Date().toISOString() : null);
  }
  for (const [field, column, value] of [
    ["dueDate", "due_date", body.dueDate],
    ["scheduledDate", "scheduled_date", body.scheduledDate],
    ["weekStart", "week_start", body.weekStart],
  ] as const) {
    if (value !== undefined) {
      if (value != null && !isValidDate(value)) {
        return c.json({ error: `${field} must be an ISO date (YYYY-MM-DD)` }, 400);
      }
      updates.push(`${column} = ?`);
      values.push(value);
    }
  }
  if (body.estimatedMinutes !== undefined) {
    updates.push("estimated_minutes = ?");
    values.push(body.estimatedMinutes);
  }
  if (body.position !== undefined) {
    updates.push("position = ?");
    values.push(body.position);
  }
  if (body.categoryId !== undefined) {
    if (body.categoryId) {
      const category = await c.env.DB.prepare("SELECT id FROM categories WHERE id = ? AND user_id = ?")
        .bind(body.categoryId, userId)
        .first();
      if (!category) return c.json({ error: "Category not found" }, 404);
    }
    updates.push("category_id = ?");
    values.push(body.categoryId);
  }
  if (body.projectId !== undefined) {
    if (body.projectId) {
      const project = await c.env.DB.prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
        .bind(body.projectId, userId)
        .first();
      if (!project) return c.json({ error: "Project not found" }, 404);
    }
    updates.push("project_id = ?");
    values.push(body.projectId);
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    await c.env.DB.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`)
      .bind(...values, id, userId)
      .run();
  }

  const task = await c.env.DB.prepare(`SELECT ${TASK_COLUMNS} FROM tasks WHERE id = ? AND user_id = ?`)
    .bind(id, userId)
    .first();
  return c.json({ task });
});

tasks.delete("/", async (c) => {
  const userId = c.get("userId");
  const scope = c.req.query("scope");

  if (scope !== "upcoming" && scope !== "all") {
    return c.json({ error: "scope must be 'upcoming' or 'all'" }, 400);
  }

  if (scope === "all") {
    await c.env.DB.prepare("DELETE FROM tasks WHERE user_id = ?").bind(userId).run();
    return c.body(null, 204);
  }

  const today = c.req.query("today") ?? new Date().toISOString().slice(0, 10);
  if (!isValidDate(today)) {
    return c.json({ error: "today must be an ISO date (YYYY-MM-DD)" }, 400);
  }

  // "Upcoming": everything not yet done — backlog items (no date) plus anything scheduled today
  // or later. Completed and past-due tasks are left in place as history.
  await c.env.DB.prepare(
    `DELETE FROM tasks WHERE user_id = ? AND status != 'completed' AND (status = 'backlog' OR scheduled_date >= ?)`,
  )
    .bind(userId, today)
    .run();
  return c.body(null, 204);
});

tasks.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const existing = await c.env.DB.prepare("SELECT id FROM tasks WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first();
  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  await c.env.DB.prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return c.body(null, 204);
});

export default tasks;
