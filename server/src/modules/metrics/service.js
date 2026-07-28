const db = require('../../db/connection');

// Ejercicios con al menos un weight_entry del alumno
async function loggedExercises(alumnoId) {
  const { rows } = await db.query(
    `SELECT DISTINCT e.id, e.nombre, c.nombre AS category_nombre
     FROM weight_entries we
     JOIN prescribed_sets ps ON we.prescribed_set_id = ps.id
     JOIN routine_exercises re ON ps.routine_exercise_id = re.id
     JOIN exercises e ON re.exercise_id = e.id
     JOIN categories c ON e.category_id = c.id
     WHERE we.alumno_id = $1
     ORDER BY c.nombre, e.nombre`,
    [alumnoId]
  );
  return rows;
}

// Progreso: fecha (inicio de rutina) → peso_max / peso_avg por ejercicio
async function progress(alumnoId, exerciseId) {
  const { rows } = await db.query(
    `SELECT
       r.start_date AS fecha,
       ps.sets_count,
       ps.reps,
       we.peso::numeric(6,2) AS peso
     FROM weight_entries we
     JOIN prescribed_sets ps ON we.prescribed_set_id = ps.id
     JOIN routine_exercises re ON ps.routine_exercise_id = re.id
     JOIN routine_blocks rb ON re.routine_block_id = rb.id
     JOIN routine_days rd ON rb.routine_day_id = rd.id
     JOIN routines r ON rd.routine_id = r.id
     WHERE we.alumno_id = $1 AND re.exercise_id = $2
     ORDER BY r.start_date ASC, ps.reps DESC, ps.sets_count DESC`,
    [alumnoId, exerciseId]
  );
  return rows;
}

// Volumen: sets_count × reps × peso — por sesión (rutina) o por semana, según fecha de inicio de rutina
async function volume(alumnoId, groupBy = 'session') {
  const trunc = groupBy === 'week' ? `DATE_TRUNC('week', r.start_date)` : 'r.start_date';
  const { rows } = await db.query(
    `SELECT
       ${trunc} AS fecha,
       ROUND(SUM(we.peso), 1)::numeric AS volumen
     FROM weight_entries we
     JOIN prescribed_sets ps ON we.prescribed_set_id = ps.id
     JOIN routine_exercises re ON ps.routine_exercise_id = re.id
     JOIN routine_blocks rb ON re.routine_block_id = rb.id
     JOIN routine_days rd ON rb.routine_day_id = rd.id
     JOIN routines r ON rd.routine_id = r.id
     WHERE we.alumno_id = $1
     GROUP BY 1
     ORDER BY 1 ASC`,
    [alumnoId]
  );
  return rows;
}

// PRs: peso máximo por ejercicio, con la fecha de inicio de la rutina donde se logró
async function prs(alumnoId) {
  const { rows } = await db.query(
    `SELECT DISTINCT ON (e.id)
       e.id AS exercise_id,
       e.nombre AS exercise_nombre,
       c.nombre AS category_nombre,
       we.peso AS peso_max,
       r.start_date AS fecha_pr
     FROM weight_entries we
     JOIN prescribed_sets ps ON we.prescribed_set_id = ps.id
     JOIN routine_exercises re ON ps.routine_exercise_id = re.id
     JOIN routine_blocks rb ON re.routine_block_id = rb.id
     JOIN routine_days rd ON rb.routine_day_id = rd.id
     JOIN routines r ON rd.routine_id = r.id
     JOIN exercises e ON re.exercise_id = e.id
     JOIN categories c ON e.category_id = c.id
     WHERE we.alumno_id = $1
     ORDER BY e.id, we.peso DESC, r.start_date DESC`,
    [alumnoId]
  );
  return rows;
}

// Asistencia: rutinas "entrenadas" en rango (por fecha de inicio) + cálculo de racha
async function attendance(alumnoId, from, to) {
  const params = [alumnoId];
  const conds = ['we.alumno_id = $1'];
  if (from) { params.push(from); conds.push(`r.start_date >= $${params.length}`); }
  if (to)   { params.push(to);   conds.push(`r.start_date <= $${params.length}`); }

  const { rows } = await db.query(
    `SELECT r.start_date AS fecha, COUNT(DISTINCT we.id) AS entries
     FROM weight_entries we
     JOIN prescribed_sets ps ON we.prescribed_set_id = ps.id
     JOIN routine_exercises re ON ps.routine_exercise_id = re.id
     JOIN routine_blocks rb ON re.routine_block_id = rb.id
     JOIN routine_days rd ON rb.routine_day_id = rd.id
     JOIN routines r ON rd.routine_id = r.id
     WHERE ${conds.join(' AND ')}
     GROUP BY r.start_date
     ORDER BY r.start_date ASC`,
    params
  );

  const fechas = rows.map((r) => r.fecha.toISOString().slice(0, 10));
  const streak = computeStreak(fechas);

  return { days: rows, totalDays: rows.length, streak };
}

function computeStreak(fechas) {
  if (!fechas.length) return 0;
  const sorted = [...fechas].sort();
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (let i = sorted.length - 1; i >= 0; i--) {
    const d = new Date(sorted[i]);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((cursor - d) / 86400000);
    if (diff === 0 || diff === 1) { streak++; cursor = d; }
    else break;
  }
  return streak;
}

module.exports = { loggedExercises, progress, volume, prs, attendance };
