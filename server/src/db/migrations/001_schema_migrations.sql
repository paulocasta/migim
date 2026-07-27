CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  run_at TIMESTAMPTZ DEFAULT now()
);
