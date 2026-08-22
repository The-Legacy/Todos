import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../src/index";

function req(path: string, init: RequestInit = {}) {
  return new Request(`https://example.com${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

async function signup(email: string) {
  const res = await worker.fetch(
    req("/api/auth/signup", { method: "POST", body: JSON.stringify({ email, password: "password123" }) }),
    env,
  );
  return res.json<any>();
}

function authed(token: string, path: string, init: RequestInit = {}) {
  return worker.fetch(req(path, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } }), env);
}

describe("categories", () => {
  it("creates a category and rejects an invalid color", async () => {
    const { token } = await signup("cat-a@example.com");

    const bad = await authed(token, "/api/categories", {
      method: "POST",
      body: JSON.stringify({ name: "Music", color: "not-a-color" }),
    });
    expect(bad.status).toBe(400);

    const good = await authed(token, "/api/categories", {
      method: "POST",
      body: JSON.stringify({ name: "Music", color: "#112233" }),
    });
    expect(good.status).toBe(201);
    const body = await good.json<any>();
    expect(body.category.name).toBe("Music");
  });

  it("renames and re-colors a category", async () => {
    const { token } = await signup("cat-b@example.com");
    const created = await authed(token, "/api/categories", {
      method: "POST",
      body: JSON.stringify({ name: "Old", color: "#112233" }),
    });
    const { category } = await created.json<any>();

    const patched = await authed(token, `/api/categories/${category.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "New", color: "#445566" }),
    });
    expect(patched.status).toBe(200);
    const { category: updated } = await patched.json<any>();
    expect(updated.name).toBe("New");
    expect(updated.color).toBe("#445566");
  });

  it("preserves tasks when their category is deleted", async () => {
    const { token } = await signup("cat-c@example.com");
    const catRes = await authed(token, "/api/categories", {
      method: "POST",
      body: JSON.stringify({ name: "Temp", color: "#112233" }),
    });
    const { category } = await catRes.json<any>();

    const taskRes = await authed(token, "/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Do the thing", categoryId: category.id }),
    });
    const { task } = await taskRes.json<any>();
    expect(task.categoryId).toBe(category.id);

    const del = await authed(token, `/api/categories/${category.id}`, { method: "DELETE" });
    expect(del.status).toBe(204);

    const tasksRes = await authed(token, "/api/tasks");
    const { tasks } = await tasksRes.json<any>();
    const preserved = tasks.find((t: any) => t.id === task.id);
    expect(preserved).toBeTruthy();
    expect(preserved.categoryId).toBeNull();
  });

  it("does not let one user modify or delete another user's category", async () => {
    const alice = await signup("cat-d1@example.com");
    const bob = await signup("cat-d2@example.com");

    const created = await authed(alice.token, "/api/categories", {
      method: "POST",
      body: JSON.stringify({ name: "Alice Only", color: "#112233" }),
    });
    const { category } = await created.json<any>();

    const patch = await authed(bob.token, `/api/categories/${category.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Hijacked" }),
    });
    expect(patch.status).toBe(404);

    const del = await authed(bob.token, `/api/categories/${category.id}`, { method: "DELETE" });
    expect(del.status).toBe(404);
  });
});
