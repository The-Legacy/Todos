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

const MON = "2026-08-24";
const TUE = "2026-08-25";
const WED = "2026-08-26";

describe("workouts", () => {
  it("creates a cardio workout with duration and distance", async () => {
    const { token } = await signup("wo-a@example.com");
    const res = await authed(token, "/api/workouts", {
      method: "POST",
      body: JSON.stringify({ type: "run", date: MON, durationMinutes: 30, distanceMiles: 3.1 }),
    });
    expect(res.status).toBe(201);
    const { workout } = await res.json<any>();
    expect(workout.type).toBe("run");
    expect(workout.distanceMiles).toBe(3.1);
    expect(workout.muscleGroup).toBeNull();
  });

  it("creates a weights workout with a muscle group and no distance", async () => {
    const { token } = await signup("wo-b@example.com");
    const res = await authed(token, "/api/workouts", {
      method: "POST",
      body: JSON.stringify({ type: "weights", date: MON, muscleGroup: "push", durationMinutes: 45 }),
    });
    expect(res.status).toBe(201);
    const { workout } = await res.json<any>();
    expect(workout.muscleGroup).toBe("push");
    expect(workout.distanceMiles).toBeNull();
  });

  it("requires a muscleGroup for weights workouts", async () => {
    const { token } = await signup("wo-c@example.com");
    const res = await authed(token, "/api/workouts", {
      method: "POST",
      body: JSON.stringify({ type: "weights", date: MON }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects distanceMiles on a weights workout", async () => {
    const { token } = await signup("wo-d@example.com");
    const res = await authed(token, "/api/workouts", {
      method: "POST",
      body: JSON.stringify({ type: "weights", date: MON, muscleGroup: "legs", distanceMiles: 2 }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects a muscleGroup on a cardio workout", async () => {
    const { token } = await signup("wo-e@example.com");
    const res = await authed(token, "/api/workouts", {
      method: "POST",
      body: JSON.stringify({ type: "walk", date: MON, muscleGroup: "legs" }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid type or malformed date", async () => {
    const { token } = await signup("wo-f@example.com");
    const badType = await authed(token, "/api/workouts", {
      method: "POST",
      body: JSON.stringify({ type: "swim", date: MON }),
    });
    expect(badType.status).toBe(400);

    const badDate = await authed(token, "/api/workouts", {
      method: "POST",
      body: JSON.stringify({ type: "walk", date: "soon" }),
    });
    expect(badDate.status).toBe(400);
  });

  it("logs an 'other' workout with just duration and notes", async () => {
    const { token } = await signup("wo-g@example.com");
    const res = await authed(token, "/api/workouts", {
      method: "POST",
      body: JSON.stringify({ type: "other", date: MON, durationMinutes: 60, notes: "Yoga class" }),
    });
    expect(res.status).toBe(201);
    const { workout } = await res.json<any>();
    expect(workout.notes).toBe("Yoga class");
  });

  it("filters by date and by date range", async () => {
    const { token } = await signup("wo-h@example.com");
    await authed(token, "/api/workouts", { method: "POST", body: JSON.stringify({ type: "walk", date: MON }) });
    await authed(token, "/api/workouts", { method: "POST", body: JSON.stringify({ type: "run", date: TUE }) });
    await authed(token, "/api/workouts", { method: "POST", body: JSON.stringify({ type: "bike", date: WED }) });

    const single = await (await authed(token, `/api/workouts?date=${TUE}`)).json<any>();
    expect(single.workouts).toHaveLength(1);
    expect(single.workouts[0].type).toBe("run");

    const range = await (await authed(token, `/api/workouts?from=${TUE}&to=${WED}`)).json<any>();
    expect(range.workouts.map((w: any) => w.type).sort()).toEqual(["bike", "run"]);
  });

  it("updates a workout, clearing fields that no longer apply when the type changes", async () => {
    const { token } = await signup("wo-i@example.com");
    const created = await (
      await authed(token, "/api/workouts", {
        method: "POST",
        body: JSON.stringify({ type: "run", date: MON, distanceMiles: 5 }),
      })
    ).json<any>();

    const patched = await authed(token, `/api/workouts/${created.workout.id}`, {
      method: "PATCH",
      body: JSON.stringify({ type: "weights", muscleGroup: "back" }),
    });
    expect(patched.status).toBe(200);
    const { workout } = await patched.json<any>();
    expect(workout.type).toBe("weights");
    expect(workout.muscleGroup).toBe("back");
    expect(workout.distanceMiles).toBeNull();
  });

  it("deletes a workout", async () => {
    const { token } = await signup("wo-j@example.com");
    const created = await (
      await authed(token, "/api/workouts", { method: "POST", body: JSON.stringify({ type: "walk", date: MON }) })
    ).json<any>();

    const del = await authed(token, `/api/workouts/${created.workout.id}`, { method: "DELETE" });
    expect(del.status).toBe(204);

    const list = await (await authed(token, "/api/workouts")).json<any>();
    expect(list.workouts).toHaveLength(0);
  });

  it("does not let one user read, modify, or delete another user's workout", async () => {
    const alice = await signup("wo-k1@example.com");
    const bob = await signup("wo-k2@example.com");

    const created = await (
      await authed(alice.token, "/api/workouts", {
        method: "POST",
        body: JSON.stringify({ type: "walk", date: MON }),
      })
    ).json<any>();

    const patch = await authed(bob.token, `/api/workouts/${created.workout.id}`, {
      method: "PATCH",
      body: JSON.stringify({ durationMinutes: 10 }),
    });
    expect(patch.status).toBe(404);

    const del = await authed(bob.token, `/api/workouts/${created.workout.id}`, { method: "DELETE" });
    expect(del.status).toBe(404);

    const list = await authed(bob.token, "/api/workouts");
    const { workouts } = await list.json<any>();
    expect(workouts).toHaveLength(0);
  });
});
