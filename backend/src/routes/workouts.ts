import { Hono } from "hono";
import type { AppVariables } from "../types/env";
import { newId } from "../db/ids";
import { requireAuth } from "../middleware/requireAuth";
import type { MuscleGroup, WorkoutType } from "@todos/shared";
import { isValidDateString, MUSCLE_GROUPS } from "@todos/shared";

const workouts = new Hono<{ Bindings: Env; Variables: AppVariables }>();
workouts.use("*", requireAuth);

const SELECT = `
  SELECT id, user_id as userId, type, date, duration_minutes as durationMinutes,
    distance_miles as distanceMiles, muscle_group as muscleGroup, notes,
    created_at as createdAt, updated_at as updatedAt
  FROM workouts WHERE user_id = ?
`;

const VALID_TYPES: WorkoutType[] = ["walk", "run", "bike", "weights", "other"];
const CARDIO_TYPES: WorkoutType[] = ["walk", "run", "bike"];

interface WorkoutBody {
  type?: WorkoutType;
  date?: string;
  durationMinutes?: number | null;
  distanceMiles?: number | null;
  muscleGroup?: MuscleGroup | null;
  notes?: string | null;
}

function validatePositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** Shared field validation for create/update. Returns an error message, or null if the (partial)
 * fields given are all valid together with `type` (the effective type after applying updates). */
function validateFields(type: WorkoutType, body: WorkoutBody): string | null {
  if (body.durationMinutes != null && !validatePositiveNumber(body.durationMinutes)) {
    return "durationMinutes must be a non-negative number";
  }
  if (body.distanceMiles != null && !validatePositiveNumber(body.distanceMiles)) {
    return "distanceMiles must be a non-negative number";
  }
  if (body.distanceMiles != null && !CARDIO_TYPES.includes(type)) {
    return "distanceMiles only applies to walk, run, or bike workouts";
  }
  if (body.muscleGroup != null) {
    if (type !== "weights") return "muscleGroup only applies to weights workouts";
    if (!MUSCLE_GROUPS.includes(body.muscleGroup)) return "Invalid muscleGroup";
  }
  if (body.notes != null && typeof body.notes !== "string") {
    return "notes must be a string";
  }
  return null;
}

workouts.get("/", async (c) => {
  const userId = c.get("userId");
  const { date, from, to, type } = c.req.query();

  const clauses: string[] = [];
  const values: unknown[] = [];

  if (date) {
    if (!isValidDateString(date)) return c.json({ error: "date must be an ISO date (YYYY-MM-DD)" }, 400);
    clauses.push("date = ?");
    values.push(date);
  }
  if (from) {
    if (!isValidDateString(from)) return c.json({ error: "from must be an ISO date (YYYY-MM-DD)" }, 400);
    clauses.push("date >= ?");
    values.push(from);
  }
  if (to) {
    if (!isValidDateString(to)) return c.json({ error: "to must be an ISO date (YYYY-MM-DD)" }, 400);
    clauses.push("date <= ?");
    values.push(to);
  }
  if (type) {
    if (!VALID_TYPES.includes(type as WorkoutType)) return c.json({ error: "Invalid type" }, 400);
    clauses.push("type = ?");
    values.push(type);
  }

  const where = clauses.length > 0 ? ` AND ${clauses.join(" AND ")}` : "";
  const { results } = await c.env.DB.prepare(`${SELECT}${where} ORDER BY date DESC, created_at DESC`)
    .bind(userId, ...values)
    .all();

  return c.json({ workouts: results });
});

workouts.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<WorkoutBody>().catch(() => null);

  const type = body?.type;
  if (!type || !VALID_TYPES.includes(type)) {
    return c.json({ error: "type must be one of walk, run, bike, weights, other" }, 400);
  }
  const date = body?.date;
  if (!date || !isValidDateString(date)) {
    return c.json({ error: "date must be an ISO date (YYYY-MM-DD)" }, 400);
  }
  if (type === "weights" && !body?.muscleGroup) {
    return c.json({ error: "muscleGroup is required for weights workouts" }, 400);
  }

  const fieldError = validateFields(type, body ?? {});
  if (fieldError) return c.json({ error: fieldError }, 400);

  const id = newId();
  await c.env.DB.prepare(
    `INSERT INTO workouts (
      id, user_id, type, date, duration_minutes, distance_miles, muscle_group, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      userId,
      type,
      date,
      body?.durationMinutes ?? null,
      body?.distanceMiles ?? null,
      body?.muscleGroup ?? null,
      body?.notes ?? null,
    )
    .run();

  const workout = await c.env.DB.prepare(`${SELECT} AND id = ?`).bind(userId, id).first();
  return c.json({ workout }, 201);
});

workouts.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const existing = await c.env.DB.prepare("SELECT type, muscle_group FROM workouts WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<{ type: WorkoutType; muscle_group: MuscleGroup | null }>();
  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  const body = await c.req.json<WorkoutBody>().catch(() => null);
  if (!body) {
    return c.json({ error: "Invalid request body" }, 400);
  }

  if (body.type !== undefined && !VALID_TYPES.includes(body.type)) {
    return c.json({ error: "type must be one of walk, run, bike, weights, other" }, 400);
  }
  const effectiveType = body.type ?? existing.type;

  const fieldError = validateFields(effectiveType, body);
  if (fieldError) return c.json({ error: fieldError }, 400);

  if (effectiveType === "weights" && body.muscleGroup === undefined && !existing.muscle_group) {
    return c.json({ error: "muscleGroup is required for weights workouts" }, 400);
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.type !== undefined) {
    updates.push("type = ?");
    values.push(body.type);
    // Switching away from a type clears fields that no longer apply.
    if (!CARDIO_TYPES.includes(body.type) && body.distanceMiles === undefined) {
      updates.push("distance_miles = ?");
      values.push(null);
    }
    if (body.type !== "weights" && body.muscleGroup === undefined) {
      updates.push("muscle_group = ?");
      values.push(null);
    }
  }
  if (body.date !== undefined) {
    if (!isValidDateString(body.date)) return c.json({ error: "date must be an ISO date (YYYY-MM-DD)" }, 400);
    updates.push("date = ?");
    values.push(body.date);
  }
  if (body.durationMinutes !== undefined) {
    updates.push("duration_minutes = ?");
    values.push(body.durationMinutes);
  }
  if (body.distanceMiles !== undefined) {
    updates.push("distance_miles = ?");
    values.push(body.distanceMiles);
  }
  if (body.muscleGroup !== undefined) {
    updates.push("muscle_group = ?");
    values.push(body.muscleGroup);
  }
  if (body.notes !== undefined) {
    updates.push("notes = ?");
    values.push(body.notes);
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    await c.env.DB.prepare(`UPDATE workouts SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`)
      .bind(...values, id, userId)
      .run();
  }

  const workout = await c.env.DB.prepare(`${SELECT} AND id = ?`).bind(userId, id).first();
  return c.json({ workout });
});

workouts.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const existing = await c.env.DB.prepare("SELECT id FROM workouts WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first();
  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  await c.env.DB.prepare("DELETE FROM workouts WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return c.body(null, 204);
});

export default workouts;
