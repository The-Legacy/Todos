-- Workout log: a per-day fitness entry, separate from tasks. Cardio types (walk/run/bike) carry
-- duration + distance; weights carries a muscle-group label instead of distance; other is a
-- free-form catch-all with just duration + notes.

CREATE TABLE workouts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('walk', 'run', 'bike', 'weights', 'other')),
  date TEXT NOT NULL,
  duration_minutes INTEGER,
  distance_miles REAL,
  muscle_group TEXT CHECK (
    muscle_group IN ('push', 'pull', 'legs', 'arms', 'shoulders', 'chest', 'back', 'core', 'full_body')
  ),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_workouts_user_date ON workouts(user_id, date);
