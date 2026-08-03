ALTER TABLE routines DROP CONSTRAINT IF EXISTS routines_period_type_check;
ALTER TABLE routines ADD CONSTRAINT routines_period_type_check CHECK (period_type IN ('semanal', 'mensual', 'personalizada'));
