import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppVariables } from "./types/env";
import auth from "./routes/auth";
import { requireAuth } from "./middleware/requireAuth";

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.use(
  "*",
  cors({
    origin: (origin) => origin ?? "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.get("/api/health", (c) => c.json({ ok: true }));

app.route("/api/auth", auth);

app.get("/api/categories", requireAuth, async (c) => {
  const userId = c.get("userId");
  const { results } = await c.env.DB.prepare(
    "SELECT id, user_id as userId, name, color, created_at as createdAt FROM categories WHERE user_id = ? ORDER BY created_at ASC",
  )
    .bind(userId)
    .all();
  return c.json({ categories: results });
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
