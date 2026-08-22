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

describe("tasks", () => {
  it("creates a backlog task by default", async () => {
    const { token } = await signup("task-a@example.com");
    const res = await authed(token, "/api/tasks", { method: "POST", body: JSON.stringify({ title: "Read chapter 4" }) });
    expect(res.status).toBe(201);
    const { task } = await res.json<any>();
    expect(task.status).toBe("backlog");
    expect(task.priority).toBe("medium");
  });

  it("rejects a task with no title", async () => {
    const { token } = await signup("task-b@example.com");
    const res = await authed(token, "/api/tasks", { method: "POST", body: JSON.stringify({ title: "  " }) });
    expect(res.status).toBe(400);
  });

  it("defaults to scheduled status when a scheduledDate is given", async () => {
    const { token } = await signup("task-c@example.com");
    const res = await authed(token, "/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Gym", scheduledDate: "2026-08-24" }),
    });
    const { task } = await res.json<any>();
    expect(task.status).toBe("scheduled");
    expect(task.scheduledDate).toBe("2026-08-24");
  });

  it("rejects malformed dates", async () => {
    const { token } = await signup("task-d@example.com");
    const res = await authed(token, "/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Gym", scheduledDate: "next tuesday" }),
    });
    expect(res.status).toBe(400);
  });

  it("completes a task and stamps completedAt", async () => {
    const { token } = await signup("task-e@example.com");
    const created = await authed(token, "/api/tasks", { method: "POST", body: JSON.stringify({ title: "Homework" }) });
    const { task } = await created.json<any>();

    const patched = await authed(token, `/api/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" }),
    });
    expect(patched.status).toBe(200);
    const { task: completed } = await patched.json<any>();
    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toBeTruthy();
  });

  it("moves a task between backlog and a scheduled day", async () => {
    const { token } = await signup("task-f@example.com");
    const created = await authed(token, "/api/tasks", { method: "POST", body: JSON.stringify({ title: "Guitar" }) });
    const { task } = await created.json<any>();
    expect(task.status).toBe("backlog");

    const scheduled = await authed(token, `/api/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "scheduled", scheduledDate: "2026-08-25" }),
    });
    const { task: onDay } = await scheduled.json<any>();
    expect(onDay.status).toBe("scheduled");
    expect(onDay.scheduledDate).toBe("2026-08-25");

    const backToBacklog = await authed(token, `/api/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "backlog", scheduledDate: null }),
    });
    const { task: backlogAgain } = await backToBacklog.json<any>();
    expect(backlogAgain.status).toBe("backlog");
    expect(backlogAgain.scheduledDate).toBeNull();
  });

  it("deletes a task", async () => {
    const { token } = await signup("task-g@example.com");
    const created = await authed(token, "/api/tasks", { method: "POST", body: JSON.stringify({ title: "Throwaway" }) });
    const { task } = await created.json<any>();

    const del = await authed(token, `/api/tasks/${task.id}`, { method: "DELETE" });
    expect(del.status).toBe(204);

    const list = await authed(token, "/api/tasks");
    const { tasks } = await list.json<any>();
    expect(tasks.find((t: any) => t.id === task.id)).toBeUndefined();
  });

  it("filters tasks by status and category", async () => {
    const { token } = await signup("task-h@example.com");
    const catRes = await authed(token, "/api/categories", {
      method: "POST",
      body: JSON.stringify({ name: "Fitness", color: "#112233" }),
    });
    const { category } = await catRes.json<any>();

    await authed(token, "/api/tasks", { method: "POST", body: JSON.stringify({ title: "Run", categoryId: category.id }) });
    await authed(token, "/api/tasks", { method: "POST", body: JSON.stringify({ title: "Read" }) });

    const filtered = await authed(token, `/api/tasks?categoryId=${category.id}`);
    const { tasks } = await filtered.json<any>();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Run");
  });

  it("does not allow one user to read, modify, or delete another user's task", async () => {
    const alice = await signup("task-i1@example.com");
    const bob = await signup("task-i2@example.com");

    const created = await authed(alice.token, "/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Alice secret task" }),
    });
    const { task } = await created.json<any>();

    const bobList = await authed(bob.token, "/api/tasks");
    const { tasks: bobTasks } = await bobList.json<any>();
    expect(bobTasks.find((t: any) => t.id === task.id)).toBeUndefined();

    const bobPatch = await authed(bob.token, `/api/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title: "Hijacked" }),
    });
    expect(bobPatch.status).toBe(404);

    const bobDelete = await authed(bob.token, `/api/tasks/${task.id}`, { method: "DELETE" });
    expect(bobDelete.status).toBe(404);
  });

  it("rejects assigning a task to another user's category", async () => {
    const alice = await signup("task-j1@example.com");
    const bob = await signup("task-j2@example.com");

    const aliceCat = await authed(alice.token, "/api/categories", {
      method: "POST",
      body: JSON.stringify({ name: "Alice Cat", color: "#112233" }),
    });
    const { category } = await aliceCat.json<any>();

    const res = await authed(bob.token, "/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Sneaky", categoryId: category.id }),
    });
    expect(res.status).toBe(404);
  });
});
