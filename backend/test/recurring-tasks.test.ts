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

// 2026-08-24 is a Monday.
const MON = "2026-08-24";
const TUE = "2026-08-25";
const WED = "2026-08-26";
const FRI = "2026-08-28";

describe("recurring tasks CRUD", () => {
  it("creates a recurring task and round-trips daysOfWeek", async () => {
    const { token } = await signup("rec-a@example.com");
    const res = await authed(token, "/api/recurring-tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Gym", daysOfWeek: [1, 3, 5], startDate: MON }),
    });
    expect(res.status).toBe(201);
    const { recurringTask } = await res.json<any>();
    expect(recurringTask.daysOfWeek.sort()).toEqual([1, 3, 5]);
    expect(recurringTask.active).toBe(true);
  });

  it("rejects an empty or out-of-range daysOfWeek", async () => {
    const { token } = await signup("rec-b@example.com");
    const empty = await authed(token, "/api/recurring-tasks", {
      method: "POST",
      body: JSON.stringify({ title: "X", daysOfWeek: [], startDate: MON }),
    });
    expect(empty.status).toBe(400);

    const outOfRange = await authed(token, "/api/recurring-tasks", {
      method: "POST",
      body: JSON.stringify({ title: "X", daysOfWeek: [7], startDate: MON }),
    });
    expect(outOfRange.status).toBe(400);
  });

  it("rejects a missing or malformed startDate", async () => {
    const { token } = await signup("rec-c@example.com");
    const res = await authed(token, "/api/recurring-tasks", {
      method: "POST",
      body: JSON.stringify({ title: "X", daysOfWeek: [1], startDate: "soon" }),
    });
    expect(res.status).toBe(400);
  });

  it("updates active flag, days, and can be deleted while preserving generated instances", async () => {
    const { token } = await signup("rec-d@example.com");
    const created = await (
      await authed(token, "/api/recurring-tasks", {
        method: "POST",
        body: JSON.stringify({ title: "Trash night", daysOfWeek: [0], startDate: MON }),
      })
    ).json<any>();

    const patched = await authed(token, `/api/recurring-tasks/${created.recurringTask.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: false }),
    });
    expect(patched.status).toBe(200);
    const { recurringTask: updated } = await patched.json<any>();
    expect(updated.active).toBe(false);

    // Materialize an instance while still active isn't possible now that it's inactive, so
    // re-activate briefly to generate one, then delete the rule.
    await authed(token, `/api/recurring-tasks/${created.recurringTask.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: true }),
    });
    await authed(token, `/api/week/${MON}`); // triggers materialization

    const del = await authed(token, `/api/recurring-tasks/${created.recurringTask.id}`, { method: "DELETE" });
    expect(del.status).toBe(204);

    const tasksRes = await authed(token, "/api/tasks");
    const { tasks } = await tasksRes.json<any>();
    const generated = tasks.find((t: any) => t.title === "Trash night");
    expect(generated).toBeTruthy();
    expect(generated.recurringTaskId).toBeNull();
  });

  it("does not let one user read, modify, or delete another user's recurring task", async () => {
    const alice = await signup("rec-e1@example.com");
    const bob = await signup("rec-e2@example.com");

    const created = await (
      await authed(alice.token, "/api/recurring-tasks", {
        method: "POST",
        body: JSON.stringify({ title: "Alice's", daysOfWeek: [1], startDate: MON }),
      })
    ).json<any>();

    const patch = await authed(bob.token, `/api/recurring-tasks/${created.recurringTask.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: false }),
    });
    expect(patch.status).toBe(404);

    const del = await authed(bob.token, `/api/recurring-tasks/${created.recurringTask.id}`, { method: "DELETE" });
    expect(del.status).toBe(404);

    const list = await authed(bob.token, "/api/recurring-tasks");
    const { recurringTasks } = await list.json<any>();
    expect(recurringTasks).toHaveLength(0);
  });
});

describe("recurring task materialization", () => {
  it("generates instances on the matching weekdays when viewing a week", async () => {
    const { token } = await signup("rec-f@example.com");
    await authed(token, "/api/recurring-tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Gym", daysOfWeek: [1, 3, 5], startDate: MON, priority: "high" }),
    });

    const week = await (await authed(token, `/api/week/${MON}`)).json<any>();
    expect(week.days[MON].map((t: any) => t.title)).toEqual(["Gym"]);
    expect(week.days[TUE]).toHaveLength(0);
    expect(week.days[WED].map((t: any) => t.title)).toEqual(["Gym"]);
    expect(week.days[FRI].map((t: any) => t.title)).toEqual(["Gym"]);
    expect(week.days[MON][0].priority).toBe("high");
    expect(week.days[MON][0].recurringTaskId).toBeTruthy();
  });

  it("is idempotent: viewing the same week twice does not duplicate instances", async () => {
    const { token } = await signup("rec-g@example.com");
    await authed(token, "/api/recurring-tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Daily standup", daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startDate: MON }),
    });

    await authed(token, `/api/week/${MON}`);
    const secondView = await (await authed(token, `/api/week/${MON}`)).json<any>();
    expect(secondView.days[MON]).toHaveLength(1);
    expect(secondView.days[TUE]).toHaveLength(1);
  });

  it("does not generate instances before startDate or after endDate", async () => {
    const { token } = await signup("rec-h@example.com");
    await authed(token, "/api/recurring-tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Limited run", daysOfWeek: [1, 2, 3], startDate: TUE, endDate: TUE }),
    });

    const week = await (await authed(token, `/api/week/${MON}`)).json<any>();
    expect(week.days[MON]).toHaveLength(0); // before startDate
    expect(week.days[TUE].map((t: any) => t.title)).toEqual(["Limited run"]); // within range
    expect(week.days[WED]).toHaveLength(0); // after endDate
  });

  it("does not generate instances for an inactive recurring task", async () => {
    const { token } = await signup("rec-i@example.com");
    const created = await (
      await authed(token, "/api/recurring-tasks", {
        method: "POST",
        body: JSON.stringify({ title: "Paused", daysOfWeek: [1], startDate: MON }),
      })
    ).json<any>();
    await authed(token, `/api/recurring-tasks/${created.recurringTask.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: false }),
    });

    const week = await (await authed(token, `/api/week/${MON}`)).json<any>();
    expect(week.days[MON]).toHaveLength(0);
  });

  it("does not regenerate a duplicate on the original day after the instance is dragged elsewhere", async () => {
    const { token } = await signup("rec-j@example.com");
    await authed(token, "/api/recurring-tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Weekly planning", daysOfWeek: [1], startDate: MON }),
    });

    const firstView = await (await authed(token, `/api/week/${MON}`)).json<any>();
    const instance = firstView.days[MON][0];

    // Drag it to Wednesday: scheduled_date changes, recurrence_date (and thus the identity
    // the uniqueness constraint keys on) does not.
    await authed(token, `/api/tasks/${instance.id}`, {
      method: "PATCH",
      body: JSON.stringify({ scheduledDate: WED }),
    });

    const secondView = await (await authed(token, `/api/week/${MON}`)).json<any>();
    expect(secondView.days[MON]).toHaveLength(0);
    expect(secondView.days[WED].map((t: any) => t.title)).toEqual(["Weekly planning"]);
  });

  it("surfaces an un-viewed recurring instance from earlier this week as overdue on /today", async () => {
    const { token } = await signup("rec-k@example.com");
    await authed(token, "/api/recurring-tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Monday check-in", daysOfWeek: [1], startDate: MON }),
    });

    // Never viewed /week for MON — go straight to /today on Wednesday.
    const res = await authed(token, `/api/today?date=${WED}`);
    const body = await res.json<any>();
    expect(body.overdue.map((t: any) => t.title)).toEqual(["Monday check-in"]);
  });

  it("keeps recurring instances isolated between users", async () => {
    const alice = await signup("rec-l1@example.com");
    const bob = await signup("rec-l2@example.com");

    await authed(alice.token, "/api/recurring-tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Alice's routine", daysOfWeek: [1], startDate: MON }),
    });

    const bobWeek = await (await authed(bob.token, `/api/week/${MON}`)).json<any>();
    expect(bobWeek.days[MON]).toHaveLength(0);
  });
});
