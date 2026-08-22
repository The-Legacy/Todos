import { Hono } from "hono";
import type { AppVariables } from "../types/env";
import { hashPassword, verifyPassword } from "../auth/password";
import { createSession, deleteSession } from "../auth/session";
import { newId } from "../db/ids";
import { DEFAULT_CATEGORIES } from "@todos/shared";
import { requireAuth } from "../middleware/requireAuth";

const auth = new Hono<{ Bindings: Env; Variables: AppVariables }>();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

auth.post("/signup", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>().catch(() => null);
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;

  if (!email || !isValidEmail(email)) {
    return c.json({ error: "A valid email is required" }, 400);
  }
  if (!password || password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }

  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) {
    return c.json({ error: "An account with that email already exists" }, 409);
  }

  const userId = newId();
  const { hash, salt } = await hashPassword(password);
  await c.env.DB.prepare("INSERT INTO users (id, email, password_hash, password_salt) VALUES (?, ?, ?, ?)")
    .bind(userId, email, hash, salt)
    .run();

  const categoryInserts = DEFAULT_CATEGORIES.map((cat) =>
    c.env.DB.prepare("INSERT INTO categories (id, user_id, name, color) VALUES (?, ?, ?, ?)").bind(
      newId(),
      userId,
      cat.name,
      cat.color,
    ),
  );
  await c.env.DB.batch(categoryInserts);

  const { token } = await createSession(c.env.DB, userId);
  return c.json({ token, user: { id: userId, email, createdAt: new Date().toISOString() } }, 201);
});

auth.post("/login", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>().catch(() => null);
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;

  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  const user = await c.env.DB.prepare(
    "SELECT id, email, password_hash as passwordHash, password_salt as passwordSalt, created_at as createdAt FROM users WHERE email = ?",
  )
    .bind(email)
    .first<{ id: string; email: string; passwordHash: string; passwordSalt: string; createdAt: string }>();

  if (!user) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const valid = await verifyPassword(password, user.passwordSalt, user.passwordHash);
  if (!valid) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const { token } = await createSession(c.env.DB, user.id);
  return c.json({ token, user: { id: user.id, email: user.email, createdAt: user.createdAt } });
});

auth.post("/logout", async (c) => {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (token) {
    await deleteSession(c.env.DB, token);
  }
  return c.json({ ok: true });
});

auth.get("/me", requireAuth, async (c) => {
  const userId = c.get("userId");
  const user = await c.env.DB.prepare("SELECT id, email, created_at as createdAt FROM users WHERE id = ?")
    .bind(userId)
    .first<{ id: string; email: string; createdAt: string }>();
  if (!user) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.json({ user });
});

export default auth;
