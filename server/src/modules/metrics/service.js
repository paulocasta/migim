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

// Progreso: fecha → peso_max / peso_avg por ejercicio
async function progress(alumnoId, exerciseId) {
  const { rows } = await db.query(
    `SELECT
       we.fecha,
       MAX(we.peso)::numeric(6,2) AS peso_max,
       ROUND(AVG(we.peso), 2)::numeric(6,2) AS peso_avg
     FROM weight_entries we
     JOIN prescribed_sets ps ON we.prescribed_set_id = ps.id
     JOIN routine_exercises re ON ps.routine_exercise_id = re.id
     WHERE we.alumno_id = $1 AND re.exercise_id = $2
     GROUP BY we.fecha
     ORDER BY we.fecha ASC`,
    [alumnoId, exerciseId]
  );
  return rows;
}

// Volumen: sets_count × reps × peso — por sesión o por semana
async function volume(alumnoId, groupBy = 'session') {
  const trunc = groupBy === 'week' ? `DATE_TRUNC('week', we.fecha)` : 'we.fecha';
  const { rows } = await db.query(
    `SELECT
       ${trunc} AS fecha,
       ROUND(SUM(ps.sets_count * ps.reps * we.peso), 1)::numeric AS volumen
     FROM weight_entries we
     JOIN prescribed_sets ps ON we.prescribed_set_id = ps.id
     WHERE we.alumno_id = $1
     GROUP BY 1
     ORDER BY 1 ASC`,
    [alumnoId]
  );
  return rows;
}

// PRs: peso máximo por ejercicio con su fecha
async function prs(alumnoId) {
  const { rows } = await db.query(
    `SELECT DISTINCT ON (e.id)
       e.id AS exercise_id,
       e.nombre AS exercise_nombre,
       c.nombre AS category_nombre,
       we.peso AS peso_max,
       we.fecha AS fecha_pr
     FROM weight_entries we
     JOIN prescribed_sets ps ON we.prescribed_set_id = ps.id
     JOIN routine_exercises re ON ps.routine_exercise_id = re.id
     JOIN exercises e ON re.exercise_id = e.id
     JOIN categories c ON e.category_id = c.id
     WHERE we.alumno_id = $1
     ORDER BY e.id, we.peso DESC, we.fecha DESC`,
    [alumnoId]
  );
  return rows;
}

// Asistencia: días entrenados en rango + cálculo de racha
async function attendance(alumnoId, from, to) {
  const params = [alumnoId];
  const conds = ['we.alumno_id = $1'];
  if (from) { params.push(from); conds.push(`we.fecha >= $${params.length}`); }
  if (to)   { params.push(to);   conds.push(`we.fecha <= $${params.length}`); }

  const { rows } = await db.query(
    `SELECT we.fecha, COUNT(DISTINCT we.id) AS entries
     FROM weight_entries we
     WHERE ${conds.join(' AND ')}
     GROUP BY we.fecha
     ORDER BY we.fecha ASC`,
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
