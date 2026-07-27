CREATE TABLE IF NOT EXISTS routines (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  alumno_id INT NOT NULL REFERENCES users(id),
  created_by INT NOT NULL REFERENCES users(id),
  period_type TEXT NOT NULL CHECK (period_type IN ('semanal', 'mensual')),
  start_date DATE NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routines_alumno ON routines(alumno_id);
