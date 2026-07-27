CREATE TABLE IF NOT EXISTS routine_exercises (
  id SERIAL PRIMARY KEY,
  routine_block_id INT NOT NULL REFERENCES routine_blocks(id) ON DELETE CASCADE,
  exercise_id INT NOT NULL REFERENCES exercises(id),
  orden INT NOT NULL DEFAULT 0,
  notas TEXT
);

CREATE INDEX IF NOT EXISTS idx_routine_exercises_block ON routine_exercises(routine_block_id);
