import { Hono } from "hono";
import type { AppVariables } from "../types/env";
import { newId } from "../db/ids";
import { requireAuth } from "../middleware/requireAuth";
import type { TaskPriority } from "@todos/shared";

const taskTemplates = new Hono<{ Bindings: Env; Variables: AppVariables }>();
taskTemplates.use("*", requireAuth);

const SELECT = `
  SELECT id, user_id as userId, category_id as categoryId, project_id as projectId, title, description,
    priority, estimated_minutes as estimatedMinutes, created_at as createdAt, updated_at as updatedAt
  FROM task_templates WHERE user_id = ?
`;

const VALID_PRIORITIES: TaskPriority[] = ["low", "medium", "high"];

interface TaskTemplateBody {
  title?: string;
  description?: string | null;
  categoryId?: string | null;
  projectId?: string | null;
  priority?: TaskPriority;
  estimatedMinutes?: number | null;
}

taskTemplates.get("/", async (c) => {
  const userId = c.get("userId");
  const { results } = await c.env.DB.prepare(`${SELECT} ORDER BY created_at ASC`).bind(userId).all();
  return c.json({ taskTemplates: results });
});

taskTemplates.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<TaskTemplateBody>().catch(() => null);

  const title = body?.title?.trim();
  if (!title) {
    return c.json({ error: "Title is required" }, 400);
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
    `INSERT INTO task_templates (id, user_id, category_id, project_id, title, description, priority, estimated_minutes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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
    )
    .run();

  const row = await c.env.DB.prepare(`${SELECT} AND id = ?`).bind(userId, id).first();
  return c.json({ taskTemplate: row }, 201);
});

taskTemplates.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const existing = await c.env.DB.prepare("SELECT id FROM task_templates WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first();
  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  const body = await c.req.json<TaskTemplateBody>().catch(() => null);
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
    await c.env.DB.prepare(`UPDATE task_templates SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`)
      .bind(...values, id, userId)
      .run();
  }

  const row = await c.env.DB.prepare(`${SELECT} AND id = ?`).bind(userId, id).first();
  return c.json({ taskTemplate: row });
});

taskTemplates.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const existing = await c.env.DB.prepare("SELECT id FROM task_templates WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first();
  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  await c.env.DB.prepare("DELETE FROM task_templates WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return c.body(null, 204);
});

export default taskTemplates;
