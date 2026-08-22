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

describe("projects", () => {
  it("creates a project with sensible defaults", async () => {
    const { token } = await signup("proj-a@example.com");
    const res = await authed(token, "/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "Learn Guitar Theory" }),
    });
    expect(res.status).toBe(201);
    const { project } = await res.json<any>();
    expect(project.status).toBe("active");
    expect(project.progress).toBe(0);
    expect(project.taskCounts).toEqual({ total: 0, completed: 0, remaining: 0 });
  });

  it("rejects a project with no name", async () => {
    const { token } = await signup("proj-b@example.com");
    const res = await authed(token, "/api/projects", { method: "POST", body: JSON.stringify({ name: "  " }) });
    expect(res.status).toBe(400);
  });

  it("computes progress from associated tasks, excluding cancelled ones", async () => {
    const { token } = await signup("proj-c@example.com");
    const { project } = await (
      await authed(token, "/api/projects", { method: "POST", body: JSON.stringify({ name: "Portfolio" }) })
    ).json<any>();

    const t1 = await (
      await authed(token, "/api/tasks", { method: "POST", body: JSON.stringify({ title: "Design", projectId: project.id }) })
    ).json<any>();
    await authed(token, "/api/tasks", { method: "POST", body: JSON.stringify({ title: "Build", projectId: project.id }) });
    const t3 = await (
      await authed(token, "/api/tasks", { method: "POST", body: JSON.stringify({ title: "Skip me", projectId: project.id }) })
    ).json<any>();

    await authed(token, `/api/tasks/${t1.task.id}`, { method: "PATCH", body: JSON.stringify({ status: "completed" }) });
    await authed(token, `/api/tasks/${t3.task.id}`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) });

    const res = await authed(token, `/api/projects/${project.id}`);
    const body = await res.json<any>();
    expect(body.project.taskCounts).toEqual({ total: 2, completed: 1, remaining: 1 });
    expect(body.project.progress).toBe(0.5);
    expect(body.tasks).toHaveLength(3);
  });

  it("preserves tasks when their project is deleted", async () => {
    const { token } = await signup("proj-d@example.com");
    const { project } = await (
      await authed(token, "/api/projects", { method: "POST", body: JSON.stringify({ name: "Temp project" }) })
    ).json<any>();
    const { task } = await (
      await authed(token, "/api/tasks", { method: "POST", body: JSON.stringify({ title: "Orphan me", projectId: project.id }) })
    ).json<any>();

    const del = await authed(token, `/api/projects/${project.id}`, { method: "DELETE" });
    expect(del.status).toBe(204);

    const tasksRes = await authed(token, "/api/tasks");
    const { tasks } = await tasksRes.json<any>();
    const preserved = tasks.find((t: any) => t.id === task.id);
    expect(preserved).toBeTruthy();
    expect(preserved.projectId).toBeNull();
  });

  it("updates status and target date", async () => {
    const { token } = await signup("proj-e@example.com");
    const { project } = await (
      await authed(token, "/api/projects", { method: "POST", body: JSON.stringify({ name: "CS Minor" }) })
    ).json<any>();

    const patched = await authed(token, `/api/projects/${project.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed", targetDate: "2026-12-01" }),
    });
    expect(patched.status).toBe(200);
    const { project: updated } = await patched.json<any>();
    expect(updated.status).toBe("completed");
    expect(updated.targetDate).toBe("2026-12-01");
  });

  it("rejects an invalid status or malformed target date", async () => {
    const { token } = await signup("proj-f@example.com");
    const { project } = await (
      await authed(token, "/api/projects", { method: "POST", body: JSON.stringify({ name: "X" }) })
    ).json<any>();

    const badStatus = await authed(token, `/api/projects/${project.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "in_progress" }),
    });
    expect(badStatus.status).toBe(400);

    const badDate = await authed(token, `/api/projects/${project.id}`, {
      method: "PATCH",
      body: JSON.stringify({ targetDate: "next month" }),
    });
    expect(badDate.status).toBe(400);
  });

  it("does not let one user read, modify, delete, or assign tasks to another user's project", async () => {
    const alice = await signup("proj-g1@example.com");
    const bob = await signup("proj-g2@example.com");

    const { project } = await (
      await authed(alice.token, "/api/projects", { method: "POST", body: JSON.stringify({ name: "Alice's project" }) })
    ).json<any>();

    const bobGet = await authed(bob.token, `/api/projects/${project.id}`);
    expect(bobGet.status).toBe(404);

    const bobPatch = await authed(bob.token, `/api/projects/${project.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Hijacked" }),
    });
    expect(bobPatch.status).toBe(404);

    const bobDelete = await authed(bob.token, `/api/projects/${project.id}`, { method: "DELETE" });
    expect(bobDelete.status).toBe(404);

    const bobTask = await authed(bob.token, "/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Sneaky", projectId: project.id }),
    });
    expect(bobTask.status).toBe(404);
  });

  it("does not include another user's projects in the list", async () => {
    const alice = await signup("proj-h1@example.com");
    const bob = await signup("proj-h2@example.com");

    await authed(alice.token, "/api/projects", { method: "POST", body: JSON.stringify({ name: "Alice's" }) });

    const res = await authed(bob.token, "/api/projects");
    const { projects } = await res.json<any>();
    expect(projects).toHaveLength(0);
  });
});
