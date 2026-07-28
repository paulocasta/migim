const db = require('../../db/connection');

async function list(alumnoId, { fecha } = {}) {
  const params = [alumnoId];
  const conds = ['we.alumno_id = $1'];
  if (fecha) { params.push(fecha); conds.push(`we.fecha = $${params.length}`); }

  const { rows } = await db.query(
    `SELECT we.*, ps.sets_count, ps.reps, ps.routine_exercise_id,
            e.nombre AS exercise_nombre
     FROM weight_entries we
     JOIN prescribed_sets ps ON we.prescribed_set_id = ps.id
     JOIN routine_exercises re ON ps.routine_exercise_id = re.id
     JOIN exercises e ON re.exercise_id = e.id
     WHERE ${conds.join(' AND ')}
     ORDER BY we.fecha DESC, we.created_at DESC`,
    params
  );
  return rows;
}

async function upsert({ prescribed_set_id, fecha, peso, nota }, alumnoId) {
  const { rows } = await db.query(
    `INSERT INTO weight_entries(prescribed_set_id, alumno_id, fecha, peso, nota)
     VALUES($1, $2, $3, $4, $5)
     ON CONFLICT (prescribed_set_id, alumno_id, fecha)
     DO UPDATE SET peso = EXCLUDED.peso, nota = EXCLUDED.nota
     RETURNING *`,
    [prescribed_set_id, alumnoId, fecha, peso ?? null, nota || null]
  );
  return rows[0];
}

async function remove(id, alumnoId) {
  const { rows } = await db.query(
    'DELETE FROM weight_entries WHERE id=$1 AND alumno_id=$2 RETURNING id',
    [id, alumnoId]
  );
  if (!rows[0]) throw Object.assign(new Error('Registro no encontrado o sin permiso'), { status: 404 });
}

module.exports = { list, upsert, remove };
