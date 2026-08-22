import { Hono } from "hono";
import type { AppVariables } from "../types/env";
import { requireAuth } from "../middleware/requireAuth";
import { getWeekStart, isValidDateString } from "@todos/shared";

const today = new Hono<{ Bindings: Env; Variables: AppVariables }>();
today.use("*", requireAuth);

const TASK_COLUMNS = `
  id, user_id as userId, project_id as projectId, category_id as categoryId,
  title, description, status, priority, due_date as dueDate,
  scheduled_date as scheduledDate, week_start as weekStart,
  estimated_minutes as estimatedMinutes, position, completed_at as completedAt,
  created_at as createdAt, updated_at as updatedAt
`;

today.get("/", async (c) => {
  const userId = c.get("userId");
  const date = c.req.query("date") ?? new Date().toISOString().slice(0, 10);

  if (!isValidDateString(date)) {
    return c.json({ error: "date must be an ISO date (YYYY-MM-DD)" }, 400);
  }

  const weekStart = getWeekStart(date);

  const [todayResult, overdueResult, backlogResult] = await Promise.all([
    c.env.DB.prepare(
      `SELECT ${TASK_COLUMNS} FROM tasks WHERE user_id = ? AND scheduled_date = ? ORDER BY position ASC, created_at ASC`,
    )
      .bind(userId, date)
      .all(),
    c.env.DB.prepare(
      `SELECT ${TASK_COLUMNS} FROM tasks
       WHERE user_id = ? AND status = 'scheduled' AND scheduled_date < ?
       ORDER BY scheduled_date ASC, position ASC`,
    )
      .bind(userId, date)
      .all(),
    c.env.DB.prepare(
      `SELECT ${TASK_COLUMNS} FROM tasks
       WHERE user_id = ? AND status = 'backlog' AND week_start = ?
       ORDER BY position ASC, created_at ASC`,
    )
      .bind(userId, weekStart)
      .all(),
  ]);

  return c.json({
    date,
    weekStart,
    today: todayResult.results,
    overdue: overdueResult.results,
    backlog: backlogResult.results,
  });
});

export default today;
