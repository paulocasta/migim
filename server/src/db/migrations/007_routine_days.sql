CREATE TABLE IF NOT EXISTS routine_days (
  id SERIAL PRIMARY KEY,
  routine_id INT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  etiqueta TEXT NOT NULL,
  orden INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_routine_days_routine ON routine_days(routine_id);
