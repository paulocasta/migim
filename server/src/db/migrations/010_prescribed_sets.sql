CREATE TABLE IF NOT EXISTS prescribed_sets (
  id SERIAL PRIMARY KEY,
  routine_exercise_id INT NOT NULL REFERENCES routine_exercises(id) ON DELETE CASCADE,
  orden INT NOT NULL DEFAULT 0,
  sets_count INT NOT NULL,
  reps INT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prescribed_sets_re ON prescribed_sets(routine_exercise_id);
