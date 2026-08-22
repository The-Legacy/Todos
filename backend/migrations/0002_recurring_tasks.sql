-- Recurring task definitions + the link from generated task instances back to them.

CREATE TABLE recurring_tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  estimated_minutes INTEGER,
  -- Bitmask of weekdays this recurs on: bit 0 = Sunday .. bit 6 = Saturday (matches Date#getUTCDay()).
  -- All 7 bits set = daily, exactly one bit = weekly, anything else = custom days.
  days_of_week INTEGER NOT NULL CHECK (days_of_week BETWEEN 1 AND 127),
  start_date TEXT NOT NULL,
  end_date TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_recurring_tasks_user_id ON recurring_tasks(user_id);

ALTER TABLE tasks ADD COLUMN recurring_task_id TEXT REFERENCES recurring_tasks(id) ON DELETE SET NULL;

-- The calendar date this instance was generated for. Distinct from scheduled_date so that
-- dragging a generated instance to a different day doesn't cause it to be regenerated
-- (and duplicated) on its original day the next time that week is viewed.
ALTER TABLE tasks ADD COLUMN recurrence_date TEXT;

CREATE UNIQUE INDEX idx_tasks_recurring_instance ON tasks(recurring_task_id, recurrence_date)
  WHERE recurring_task_id IS NOT NULL;
