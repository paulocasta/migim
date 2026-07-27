CREATE TABLE IF NOT EXISTS routine_blocks (
  id SERIAL PRIMARY KEY,
  routine_day_id INT NOT NULL REFERENCES routine_days(id) ON DELETE CASCADE,
  block_type_id INT NOT NULL REFERENCES block_types(id),
  orden INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_routine_blocks_day ON routine_blocks(routine_day_id);
