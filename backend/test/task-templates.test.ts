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
  return worker.fetch(
    req(path, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } }),
    env,
  );
}

describe("task templates CRUD", () => {
  it("creates and lists a task template", async () => {
    const { token } = await signup("tmpl-a@example.com");
    const create = await authed(token, "/api/task-templates", {
      method: "POST",
      body: JSON.stringify({ title: "Deep work", priority: "high", estimatedMinutes: 120 }),
    });
    expect(create.status).toBe(201);
    const { taskTemplate } = await create.json<any>();
    expect(taskTemplate.title).toBe("Deep work");
    expect(taskTemplate.estimatedMinutes).toBe(120);

    const list = await authed(token, "/api/task-templates");
    const { taskTemplates } = await list.json<any>();
    expect(taskTemplates).toHaveLength(1);
  });

  it("rejects an empty title", async () => {
    const { token } = await signup("tmpl-b@example.com");
    const res = await authed(token, "/api/task-templates", {
      method: "POST",
      body: JSON.stringify({ title: "   " }),
    });
    expect(res.status).toBe(400);
  });

  it("updates and deletes a template", async () => {
    const { token } = await signup("tmpl-c@example.com");
    const create = await authed(token, "/api/task-templates", {
      method: "POST",
      body: JSON.stringify({ title: "Work block" }),
    });
    const { taskTemplate } = await create.json<any>();

    const update = await authed(token, `/api/task-templates/${taskTemplate.id}`, {
      method: "PATCH",
      body: JSON.stringify({ estimatedMinutes: 90 }),
    });
    expect(update.status).toBe(200);
    const { taskTemplate: updated } = await update.json<any>();
    expect(updated.estimatedMinutes).toBe(90);

    const del = await authed(token, `/api/task-templates/${taskTemplate.id}`, { method: "DELETE" });
    expect(del.status).toBe(204);

    const list = await authed(token, "/api/task-templates");
    const { taskTemplates } = await list.json<any>();
    expect(taskTemplates).toHaveLength(0);
  });

  it("isolates templates between users", async () => {
    const a = await signup("tmpl-d@example.com");
    const b = await signup("tmpl-e@example.com");
    await authed(a.token, "/api/task-templates", { method: "POST", body: JSON.stringify({ title: "A's task" }) });

    const listB = await authed(b.token, "/api/task-templates");
    const { taskTemplates } = await listB.json<any>();
    expect(taskTemplates).toHaveLength(0);
  });
});
