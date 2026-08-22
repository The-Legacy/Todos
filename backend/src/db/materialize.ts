import { dateMatchesDaysOfWeekMask } from "@todos/shared";
import { newId } from "./ids";

interface RecurringTaskRow {
  id: string;
  categoryId: string | null;
  projectId: string | null;
  title: string;
  description: string | null;
  priority: string;
  estimatedMinutes: number | null;
  daysOfWeek: number;
  startDate: string;
  endDate: string | null;
}

/**
 * Ensures a concrete task instance exists for each active recurring task that falls on one of
 * `dates`, for `userId`. Safe to call on every /week and /today request: instances are keyed by
 * (recurring_task_id, recurrence_date), so this is idempotent even if the generated task was
 * later dragged to a different day (its recurrence_date stays put; only scheduled_date moves).
 */
export async function materializeRecurringTasks(db: D1Database, userId: string, dates: string[]): Promise<void> {
  if (dates.length === 0) return;

  const minDate = dates.reduce((a, b) => (a < b ? a : b));
  const maxDate = dates.reduce((a, b) => (a > b ? a : b));

  const { results: recurring } = await db
    .prepare(
      `SELECT id, category_id as categoryId, project_id as projectId, title, description, priority,
        estimated_minutes as estimatedMinutes, days_of_week as daysOfWeek, start_date as startDate, end_date as endDate
       FROM recurring_tasks
       WHERE user_id = ? AND active = 1 AND start_date <= ? AND (end_date IS NULL OR end_date >= ?)`,
    )
    .bind(userId, maxDate, minDate)
    .all<RecurringTaskRow>();

  if (recurring.length === 0) return;

  const candidates: Array<{ recurringTaskId: string; date: string }> = [];
  for (const rule of recurring) {
    for (const date of dates) {
      if (date < rule.startDate) continue;
      if (rule.endDate && date > rule.endDate) continue;
      if (!dateMatchesDaysOfWeekMask(date, rule.daysOfWeek)) continue;
      candidates.push({ recurringTaskId: rule.id, date });
    }
  }
  if (candidates.length === 0) return;

  const placeholders = candidates.map(() => "(?, ?)").join(", ");
  const { results: existing } = await db
    .prepare(
      `SELECT recurring_task_id as recurringTaskId, recurrence_date as recurrenceDate
       FROM tasks WHERE (recurring_task_id, recurrence_date) IN (${placeholders})`,
    )
    .bind(...candidates.flatMap((c) => [c.recurringTaskId, c.date]))
    .all<{ recurringTaskId: string; recurrenceDate: string }>();

  const existingKeys = new Set(existing.map((e) => `${e.recurringTaskId}|${e.recurrenceDate}`));
  const missing = candidates.filter((c) => !existingKeys.has(`${c.recurringTaskId}|${c.date}`));
  if (missing.length === 0) return;

  const rulesById = new Map(recurring.map((r) => [r.id, r]));
  const statements = missing.map(({ recurringTaskId, date }) => {
    const rule = rulesById.get(recurringTaskId)!;
    return db
      .prepare(
        `INSERT INTO tasks (
          id, user_id, project_id, category_id, title, description, status, priority,
          scheduled_date, estimated_minutes, position, recurring_task_id, recurrence_date
        ) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, 0, ?, ?)
        ON CONFLICT (recurring_task_id, recurrence_date) WHERE recurring_task_id IS NOT NULL DO NOTHING`,
      )
      .bind(
        newId(),
        userId,
        rule.projectId,
        rule.categoryId,
        rule.title,
        rule.description,
        rule.priority,
        date,
        rule.estimatedMinutes,
        recurringTaskId,
        date,
      );
  });

  await db.batch(statements);
}
