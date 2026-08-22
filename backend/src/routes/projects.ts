import { Hono } from "hono";
import type { AppVariables } from "../types/env";
import { newId } from "../db/ids";
import { requireAuth } from "../middleware/requireAuth";
import type { ProjectStatus } from "@todos/shared";
import { isValidDateString } from "@todos/shared";

const projects = new Hono<{ Bindings: Env; Variables: AppVariables }>();
projects.use("*", requireAuth);

const PROJECT_SELECT = `
  SELECT id, user_id as userId, name, description, status, target_date as targetDate,
    created_at as createdAt, updated_at as updatedAt
  FROM projects WHERE user_id = ?
`;

const TASK_COLUMNS = `
  id, user_id as userId, project_id as projectId, category_id as categoryId,
  title, description, status, priority, due_date as dueDate,
  scheduled_date as scheduledDate, week_start as weekStart,
  estimated_minutes as estimatedMinutes, position, completed_at as completedAt,
  recurring_task_id as recurringTaskId, recurrence_date as recurrenceDate,
  created_at as createdAt, updated_at as updatedAt
`;

const VALID_STATUSES: ProjectStatus[] = ["active", "completed", "archived"];

async function taskCountsByProject(db: D1Database, userId: string): Promise<Map<string, { total: number; completed: number }>> {
  const { results } = await db
    .prepare(
      `SELECT project_id as projectId,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
       FROM tasks
       WHERE user_id = ? AND project_id IS NOT NULL AND status != 'cancelled'
       GROUP BY project_id`,
    )
    .bind(userId)
    .all<{ projectId: string; total: number; completed: number }>();

  const map = new Map<string, { total: number; completed: number }>();
  for (const row of results) map.set(row.projectId, { total: row.total, completed: row.completed });
  return map;
}

function withProgress(project: Record<string, unknown>, counts?: { total: number; completed: number }) {
  const total = counts?.total ?? 0;
  const completed = counts?.completed ?? 0;
  return {
    ...project,
    taskCounts: { total, completed, remaining: total - completed },
    progress: total > 0 ? completed / total : 0,
  };
}

projects.get("/", async (c) => {
  const userId = c.get("userId");
  const [{ results }, counts] = await Promise.all([
    c.env.DB.prepare(`${PROJECT_SELECT} ORDER BY created_at ASC`).bind(userId).all(),
    taskCountsByProject(c.env.DB, userId),
  ]);

  const projectsWithProgress = (results as Array<Record<string, unknown>>).map((p) =>
    withProgress(p, counts.get(p.id as string)),
  );
  return c.json({ projects: projectsWithProgress });
});

projects.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c
    .req.json<{ name?: string; description?: string | null; status?: ProjectStatus; targetDate?: string | null }>()
    .catch(() => null);

  const name = body?.name?.trim();
  if (!name) {
    return c.json({ error: "Name is required" }, 400);
  }

  const status = body?.status ?? "active";
  if (!VALID_STATUSES.includes(status)) {
    return c.json({ error: "Invalid status" }, 400);
  }
  if (body?.targetDate != null && !isValidDateString(body.targetDate)) {
    return c.json({ error: "targetDate must be an ISO date (YYYY-MM-DD)" }, 400);
  }

  const id = newId();
  await c.env.DB.prepare(
    "INSERT INTO projects (id, user_id, name, description, status, target_date) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(id, userId, name, body?.description ?? null, status, body?.targetDate ?? null)
    .run();

  const project = await c.env.DB.prepare(`${PROJECT_SELECT} AND id = ?`).bind(userId, id).first();
  return c.json({ project: withProgress(project as Record<string, unknown>) }, 201);
});

projects.get("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const project = await c.env.DB.prepare(`${PROJECT_SELECT} AND id = ?`).bind(userId, id).first();
  if (!project) {
    return c.json({ error: "Not found" }, 404);
  }

  const [{ results: tasks }, counts] = await Promise.all([
    c.env.DB.prepare(
      `SELECT ${TASK_COLUMNS} FROM tasks WHERE user_id = ? AND project_id = ? ORDER BY position ASC, created_at ASC`,
    )
      .bind(userId, id)
      .all(),
    taskCountsByProject(c.env.DB, userId),
  ]);

  return c.json({ project: withProgress(project as Record<string, unknown>, counts.get(id)), tasks });
});

projects.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const existing = await c.env.DB.prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first();
  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  const body = await c
    .req.json<{ name?: string; description?: string | null; status?: ProjectStatus; targetDate?: string | null }>()
    .catch(() => null);
  if (!body) {
    return c.json({ error: "Invalid request body" }, 400);
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return c.json({ error: "Name cannot be empty" }, 400);
    updates.push("name = ?");
    values.push(name);
  }
  if (body.description !== undefined) {
    updates.push("description = ?");
    values.push(body.description);
  }
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) return c.json({ error: "Invalid status" }, 400);
    updates.push("status = ?");
    values.push(body.status);
  }
  if (body.targetDate !== undefined) {
    if (body.targetDate != null && !isValidDateString(body.targetDate)) {
      return c.json({ error: "targetDate must be an ISO date (YYYY-MM-DD)" }, 400);
    }
    updates.push("target_date = ?");
    values.push(body.targetDate);
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    await c.env.DB.prepare(`UPDATE projects SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`)
      .bind(...values, id, userId)
      .run();
  }

  const [project, counts] = await Promise.all([
    c.env.DB.prepare(`${PROJECT_SELECT} AND id = ?`).bind(userId, id).first(),
    taskCountsByProject(c.env.DB, userId),
  ]);
  return c.json({ project: withProgress(project as Record<string, unknown>, counts.get(id)) });
});

projects.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const existing = await c.env.DB.prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first();
  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  // Tasks referencing this project keep existing via ON DELETE SET NULL.
  await c.env.DB.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return c.body(null, 204);
});

export default projects;
