import { Hono } from "hono";
import type { AppVariables } from "../types/env";
import { newId } from "../db/ids";
import { requireAuth } from "../middleware/requireAuth";

const categories = new Hono<{ Bindings: Env; Variables: AppVariables }>();
categories.use("*", requireAuth);

const CATEGORY_SELECT =
  "SELECT id, user_id as userId, name, color, created_at as createdAt FROM categories WHERE user_id = ?";

categories.get("/", async (c) => {
  const userId = c.get("userId");
  const { results } = await c.env.DB.prepare(`${CATEGORY_SELECT} ORDER BY created_at ASC`).bind(userId).all();
  return c.json({ categories: results });
});

categories.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ name?: string; color?: string }>().catch(() => null);
  const name = body?.name?.trim();
  const color = body?.color?.trim();

  if (!name) {
    return c.json({ error: "Name is required" }, 400);
  }
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return c.json({ error: "Color must be a hex value like #6366f1" }, 400);
  }

  const id = newId();
  await c.env.DB.prepare("INSERT INTO categories (id, user_id, name, color) VALUES (?, ?, ?, ?)")
    .bind(id, userId, name, color)
    .run();

  const category = await c.env.DB.prepare(`${CATEGORY_SELECT} AND id = ?`).bind(userId, id).first();
  return c.json({ category }, 201);
});

categories.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json<{ name?: string; color?: string }>().catch(() => null);

  const existing = await c.env.DB.prepare("SELECT id FROM categories WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first();
  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body?.name !== undefined) {
    const name = body.name.trim();
    if (!name) return c.json({ error: "Name cannot be empty" }, 400);
    updates.push("name = ?");
    values.push(name);
  }
  if (body?.color !== undefined) {
    if (!/^#[0-9a-fA-F]{6}$/.test(body.color)) {
      return c.json({ error: "Color must be a hex value like #6366f1" }, 400);
    }
    updates.push("color = ?");
    values.push(body.color);
  }

  if (updates.length > 0) {
    await c.env.DB.prepare(`UPDATE categories SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`)
      .bind(...values, id, userId)
      .run();
  }

  const category = await c.env.DB.prepare(`${CATEGORY_SELECT} AND id = ?`).bind(userId, id).first();
  return c.json({ category });
});

categories.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const existing = await c.env.DB.prepare("SELECT id FROM categories WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first();
  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  // Tasks referencing this category keep existing via ON DELETE SET NULL.
  await c.env.DB.prepare("DELETE FROM categories WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return c.body(null, 204);
});

export default categories;
