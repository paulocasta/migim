CREATE TABLE IF NOT EXISTS weight_entries (
  id SERIAL PRIMARY KEY,
  prescribed_set_id INT NOT NULL REFERENCES prescribed_sets(id) ON DELETE CASCADE,
  alumno_id INT NOT NULL REFERENCES users(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  peso NUMERIC(6,2) NOT NULL,
  nota TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_weight_entry UNIQUE (prescribed_set_id, alumno_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_weight_entries_set_fecha ON weight_entries(prescribed_set_id, fecha);
CREATE INDEX IF NOT EXISTS idx_weight_entries_alumno_fecha ON weight_entries(alumno_id, fecha);
