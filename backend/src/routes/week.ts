import { Hono } from "hono";
import type { AppVariables } from "../types/env";
import { requireAuth } from "../middleware/requireAuth";
import { getWeekDates, isValidDateString } from "@todos/shared";
import { materializeRecurringTasks } from "../db/materialize";

const week = new Hono<{ Bindings: Env; Variables: AppVariables }>();
week.use("*", requireAuth);

const TASK_COLUMNS = `
  id, user_id as userId, project_id as projectId, category_id as categoryId,
  title, description, status, priority, due_date as dueDate,
  scheduled_date as scheduledDate, week_start as weekStart,
  estimated_minutes as estimatedMinutes, position, completed_at as completedAt,
  recurring_task_id as recurringTaskId, recurrence_date as recurrenceDate,
  created_at as createdAt, updated_at as updatedAt
`;

week.get("/:weekStart", async (c) => {
  const userId = c.get("userId");
  const weekStart = c.req.param("weekStart");

  if (!isValidDateString(weekStart)) {
    return c.json({ error: "weekStart must be an ISO date (YYYY-MM-DD)" }, 400);
  }

  const dates = getWeekDates(weekStart);
  const weekEnd = dates[dates.length - 1];

  await materializeRecurringTasks(c.env.DB, userId, dates);

  const [scheduledResult, backlogResult] = await Promise.all([
    c.env.DB.prepare(
      `SELECT ${TASK_COLUMNS} FROM tasks
       WHERE user_id = ? AND scheduled_date BETWEEN ? AND ?
       ORDER BY position ASC, created_at ASC`,
    )
      .bind(userId, weekStart, weekEnd)
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

  const days: Record<string, unknown[]> = {};
  for (const date of dates) days[date] = [];
  for (const task of scheduledResult.results as Array<{ scheduledDate: string }>) {
    days[task.scheduledDate]?.push(task);
  }

  return c.json({ weekStart, weekEnd, days, backlog: backlogResult.results });
});

export default week;
