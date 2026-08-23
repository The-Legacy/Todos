import { Hono } from "hono";
import type { AppVariables } from "../types/env";
import { requireAuth } from "../middleware/requireAuth";
import { getWeekDates, getWeekStart, isValidDateString, type WeekStartDay } from "@todos/shared";
import { materializeRecurringTasks } from "../db/materialize";

const today = new Hono<{ Bindings: Env; Variables: AppVariables }>();
today.use("*", requireAuth);

const TASK_COLUMNS = `
  id, user_id as userId, project_id as projectId, category_id as categoryId,
  title, description, status, priority, due_date as dueDate,
  scheduled_date as scheduledDate, week_start as weekStart,
  estimated_minutes as estimatedMinutes, position, completed_at as completedAt,
  recurring_task_id as recurringTaskId, recurrence_date as recurrenceDate,
  created_at as createdAt, updated_at as updatedAt
`;

today.get("/", async (c) => {
  const userId = c.get("userId");
  const date = c.req.query("date") ?? new Date().toISOString().slice(0, 10);

  if (!isValidDateString(date)) {
    return c.json({ error: "date must be an ISO date (YYYY-MM-DD)" }, 400);
  }

  const weekStartsOnParam = c.req.query("weekStartsOn");
  const weekStartsOn: WeekStartDay = weekStartsOnParam === "0" ? 0 : 1;
  const weekStart = getWeekStart(date, weekStartsOn);

  // Materialize the whole week-to-date, not just `date`, so a recurring task from earlier this
  // week that was never viewed still shows up (correctly flagged overdue) instead of silently
  // never having been generated.
  const datesToMaterialize = getWeekDates(weekStart).filter((d) => d <= date);
  await materializeRecurringTasks(c.env.DB, userId, datesToMaterialize);

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
    // The backlog is global, not tied to any one week — an unscheduled task should keep showing
    // up here every week until it's scheduled or completed, not just the week it was created in.
    c.env.DB.prepare(
      `SELECT ${TASK_COLUMNS} FROM tasks
       WHERE user_id = ? AND status = 'backlog'
       ORDER BY position ASC, created_at ASC`,
    )
      .bind(userId)
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
