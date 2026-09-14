import { Hono } from "hono";
import type { AppVariables } from "../types/env";
import { newId } from "../db/ids";
import { requireAuth } from "../middleware/requireAuth";
import type { TaskPriority } from "@todos/shared";
import { daysOfWeekToMask, isValidDateString, maskToDaysOfWeek } from "@todos/shared";

function resolveToday(c: { req: { query: (key: string) => string | undefined } }): string | { error: string } {
  const today = c.req.query("today");
  if (today === undefined) return new Date().toISOString().slice(0, 10);
  if (!isValidDateString(today)) return { error: "today must be an ISO date (YYYY-MM-DD)" };
  return today;
}

/**
 * Removes not-yet-completed instances this rule already generated for `today` or later. Called
 * whenever a rule is paused or deleted so "stopping" a recurring task actually clears it off
 * future days instead of leaving already-materialized instances behind. Past and completed
 * instances are left alone as history.
 */
async function clearFutureOpenInstances(db: D1Database, recurringTaskId: string, today: string): Promise<void> {
  await db
    .prepare(
      `DELETE FROM tasks WHERE recurring_task_id = ? AND status != 'completed' AND scheduled_date >= ?`,
    )
    .bind(recurringTaskId, today)
    .run();
}

const recurringTasks = new Hono<{ Bindings: Env; Variables: AppVariables }>();
recurringTasks.use("*", requireAuth);

const SELECT = `
  SELECT id, user_id as userId, category_id as categoryId, project_id as projectId, title, description,
    priority, estimated_minutes as estimatedMinutes, days_of_week as daysOfWeekMask,
    start_date as startDate, end_date as endDate, active, created_at as createdAt, updated_at as updatedAt
  FROM recurring_tasks WHERE user_id = ?
`;

const VALID_PRIORITIES: TaskPriority[] = ["low", "medium", "high"];

function toApiShape(row: Record<string, unknown>) {
  const { daysOfWeekMask, active, ...rest } = row;
  return { ...rest, daysOfWeek: maskToDaysOfWeek(daysOfWeekMask as number), active: Boolean(active) };
}

interface RecurringTaskBody {
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

function validateDaysOfWeek(days: unknown): days is number[] {
  return (
    Array.isArray(days) &&
    days.length > 0 &&
    days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) &&
    new Set(days).size === days.length
  );
}

recurringTasks.get("/", async (c) => {
  const userId = c.get("userId");
  const { results } = await c.env.DB.prepare(`${SELECT} ORDER BY created_at ASC`).bind(userId).all();
  return c.json({ recurringTasks: (results as Array<Record<string, unknown>>).map(toApiShape) });
});

recurringTasks.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<RecurringTaskBody>().catch(() => null);

  const title = body?.title?.trim();
  if (!title) {
    return c.json({ error: "Title is required" }, 400);
  }
  if (!validateDaysOfWeek(body?.daysOfWeek)) {
    return c.json({ error: "daysOfWeek must be a non-empty array of unique integers 0-6" }, 400);
  }
  const startDate = body?.startDate;
  if (!startDate || !isValidDateString(startDate)) {
    return c.json({ error: "startDate must be an ISO date (YYYY-MM-DD)" }, 400);
  }
  if (body?.endDate != null && !isValidDateString(body.endDate)) {
    return c.json({ error: "endDate must be an ISO date (YYYY-MM-DD)" }, 400);
  }
  const priority = body?.priority ?? "medium";
  if (!VALID_PRIORITIES.includes(priority)) {
    return c.json({ error: "Invalid priority" }, 400);
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

  const id = newId();
  await c.env.DB.prepare(
    `INSERT INTO recurring_tasks (
      id, user_id, category_id, project_id, title, description, priority, estimated_minutes,
      days_of_week, start_date, end_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      userId,
      body?.categoryId ?? null,
      body?.projectId ?? null,
      title,
      body?.description ?? null,
      priority,
      body?.estimatedMinutes ?? null,
      daysOfWeekToMask(body!.daysOfWeek!),
      startDate,
      body?.endDate ?? null,
    )
    .run();

  const row = await c.env.DB.prepare(`${SELECT} AND id = ?`).bind(userId, id).first();
  return c.json({ recurringTask: toApiShape(row as Record<string, unknown>) }, 201);
});

recurringTasks.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const existing = await c.env.DB.prepare("SELECT id FROM recurring_tasks WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first();
  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  const body = await c.req.json<RecurringTaskBody>().catch(() => null);
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
  if (body.estimatedMinutes !== undefined) {
    updates.push("estimated_minutes = ?");
    values.push(body.estimatedMinutes);
  }
  if (body.daysOfWeek !== undefined) {
    if (!validateDaysOfWeek(body.daysOfWeek)) {
      return c.json({ error: "daysOfWeek must be a non-empty array of unique integers 0-6" }, 400);
    }
    updates.push("days_of_week = ?");
    values.push(daysOfWeekToMask(body.daysOfWeek));
  }
  if (body.startDate !== undefined) {
    if (!isValidDateString(body.startDate)) return c.json({ error: "startDate must be an ISO date" }, 400);
    updates.push("start_date = ?");
    values.push(body.startDate);
  }
  if (body.endDate !== undefined) {
    if (body.endDate != null && !isValidDateString(body.endDate)) {
      return c.json({ error: "endDate must be an ISO date" }, 400);
    }
    updates.push("end_date = ?");
    values.push(body.endDate);
  }
  if (body.active !== undefined) {
    updates.push("active = ?");
    values.push(body.active ? 1 : 0);
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

  if (body.active === false) {
    const today = resolveToday(c);
    if (typeof today !== "string") return c.json(today, 400);
    await clearFutureOpenInstances(c.env.DB, id, today);
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    await c.env.DB.prepare(`UPDATE recurring_tasks SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`)
      .bind(...values, id, userId)
      .run();
  }

  const row = await c.env.DB.prepare(`${SELECT} AND id = ?`).bind(userId, id).first();
  return c.json({ recurringTask: toApiShape(row as Record<string, unknown>) });
});

recurringTasks.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const existing = await c.env.DB.prepare("SELECT id FROM recurring_tasks WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first();
  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  const today = resolveToday(c);
  if (typeof today !== "string") return c.json(today, 400);
  await clearFutureOpenInstances(c.env.DB, id, today);

  // Remaining (past or completed) generated instances keep existing via ON DELETE SET NULL.
  await c.env.DB.prepare("DELETE FROM recurring_tasks WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return c.body(null, 204);
});

export default recurringTasks;
