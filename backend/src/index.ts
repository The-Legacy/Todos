import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppVariables } from "./types/env";
import auth from "./routes/auth";
import categories from "./routes/categories";
import tasks from "./routes/tasks";
import week from "./routes/week";
import today from "./routes/today";

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

app.route("/api/categories", categories);
app.route("/api/tasks", tasks);
app.route("/api/week", week);
app.route("/api/today", today);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
