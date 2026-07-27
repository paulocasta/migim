CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  category_id INT NOT NULL REFERENCES categories(id),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  video_url TEXT,
  video_file_path TEXT,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category_id);
