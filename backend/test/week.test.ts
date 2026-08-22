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

const MONDAY = "2026-08-24";

describe("week", () => {
  it("groups scheduled tasks by day and unscheduled tasks under backlog", async () => {
    const { token } = await signup("week-a@example.com");

    await authed(token, "/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "EECS homework", scheduledDate: MONDAY }),
    });
    await authed(token, "/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Gym", scheduledDate: "2026-08-25" }),
    });
    await authed(token, "/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Practice guitar", weekStart: MONDAY }),
    });

    const res = await authed(token, `/api/week/${MONDAY}`);
    expect(res.status).toBe(200);
    const body = await res.json<any>();

    expect(body.weekStart).toBe(MONDAY);
    expect(body.weekEnd).toBe("2026-08-30");
    expect(Object.keys(body.days)).toHaveLength(7);
    expect(body.days[MONDAY].map((t: any) => t.title)).toEqual(["EECS homework"]);
    expect(body.days["2026-08-25"].map((t: any) => t.title)).toEqual(["Gym"]);
    expect(body.backlog.map((t: any) => t.title)).toEqual(["Practice guitar"]);
  });

  it("rejects a malformed weekStart", async () => {
    const { token } = await signup("week-b@example.com");
    const res = await authed(token, "/api/week/not-a-date");
    expect(res.status).toBe(400);
  });

  it("does not leak another user's week", async () => {
    const alice = await signup("week-c1@example.com");
    const bob = await signup("week-c2@example.com");

    await authed(alice.token, "/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Alice's task", scheduledDate: MONDAY }),
    });

    const res = await authed(bob.token, `/api/week/${MONDAY}`);
    const body = await res.json<any>();
    expect(body.days[MONDAY]).toHaveLength(0);
  });
});

describe("today", () => {
  it("splits into today, overdue, and this week's backlog", async () => {
    const { token } = await signup("today-a@example.com");

    await authed(token, "/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Due today", scheduledDate: "2026-08-25" }),
    });
    await authed(token, "/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Missed yesterday", scheduledDate: "2026-08-24" }),
    });
    await authed(token, "/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Backlog item", weekStart: MONDAY }),
    });

    const res = await authed(token, "/api/today?date=2026-08-25");
    expect(res.status).toBe(200);
    const body = await res.json<any>();

    expect(body.today.map((t: any) => t.title)).toEqual(["Due today"]);
    expect(body.overdue.map((t: any) => t.title)).toEqual(["Missed yesterday"]);
    expect(body.backlog.map((t: any) => t.title)).toEqual(["Backlog item"]);
  });

  it("does not count a completed task as overdue", async () => {
    const { token } = await signup("today-b@example.com");
    const created = await authed(token, "/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Done early", scheduledDate: "2026-08-24" }),
    });
    const { task } = await created.json<any>();
    await authed(token, `/api/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" }),
    });

    const res = await authed(token, "/api/today?date=2026-08-25");
    const body = await res.json<any>();
    expect(body.overdue).toHaveLength(0);
  });
});

describe("reorder", () => {
  it("reorders a batch of tasks and can move one into a new day", async () => {
    const { token } = await signup("reorder-a@example.com");

    const a = await (
      await authed(token, "/api/tasks", { method: "POST", body: JSON.stringify({ title: "A", weekStart: MONDAY }) })
    ).json<any>();
    const b = await (
      await authed(token, "/api/tasks", { method: "POST", body: JSON.stringify({ title: "B", weekStart: MONDAY }) })
    ).json<any>();

    const res = await authed(token, "/api/tasks/reorder", {
      method: "POST",
      body: JSON.stringify({
        updates: [
          { id: b.task.id, position: 0 },
          { id: a.task.id, position: 1, status: "scheduled", scheduledDate: "2026-08-26", weekStart: null },
        ],
      }),
    });
    expect(res.status).toBe(200);

    const week = await (await authed(token, `/api/week/${MONDAY}`)).json<any>();
    expect(week.backlog.map((t: any) => t.title)).toEqual(["B"]);
    expect(week.days["2026-08-26"].map((t: any) => t.title)).toEqual(["A"]);
  });

  it("rejects reordering a task that belongs to another user", async () => {
    const alice = await signup("reorder-b1@example.com");
    const bob = await signup("reorder-b2@example.com");

    const created = await (
      await authed(alice.token, "/api/tasks", { method: "POST", body: JSON.stringify({ title: "Alice's" }) })
    ).json<any>();

    const res = await authed(bob.token, "/api/tasks/reorder", {
      method: "POST",
      body: JSON.stringify({ updates: [{ id: created.task.id, position: 0 }] }),
    });
    expect(res.status).toBe(404);
  });
});
