const db = require('../../db/connection');

// ── Helpers ───────────────────────────────────────────────────────────────────

function notFound(msg) {
  return Object.assign(new Error(msg), { status: 404 });
}

// ── Block types ───────────────────────────────────────────────────────────────

async function listBlockTypes() {
  const { rows } = await db.query('SELECT * FROM block_types ORDER BY orden');
  return rows;
}

// ── Routines ──────────────────────────────────────────────────────────────────

async function listForAlumno(alumnoId) {
  const { rows } = await db.query(
    `SELECT r.*, cb.nombre AS created_by_nombre
     FROM routines r
     JOIN users cb ON r.created_by = cb.id
     WHERE r.alumno_id = $1 AND r.activo = true
     ORDER BY r.start_date DESC`,
    [alumnoId]
  );
  return rows;
}

async function list({ alumnoId, requesterRole, requesterId }) {
  const params = [];
  const conds = [];

  if (requesterRole === 'profesor') {
    conds.push(`r.created_by = $${params.push(requesterId)}`);
  }
  if (alumnoId) {
    conds.push(`r.alumno_id = $${params.push(alumnoId)}`);
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const { rows } = await db.query(
    `SELECT r.*, u.nombre AS alumno_nombre, cb.nombre AS created_by_nombre
     FROM routines r
     JOIN users u ON r.alumno_id = u.id
     JOIN users cb ON r.created_by = cb.id
     ${where}
     ORDER BY r.created_at DESC`,
    params
  );
  return rows;
}

async function getTree(id) {
  const { rows: [routine] } = await db.query(
    `SELECT r.*, u.nombre AS alumno_nombre, u.email AS alumno_email,
            cb.nombre AS created_by_nombre
     FROM routines r
     JOIN users u ON r.alumno_id = u.id
     JOIN users cb ON r.created_by = cb.id
     WHERE r.id = $1`,
    [id]
  );
  if (!routine) throw notFound('Rutina no encontrada');

  const { rows: days } = await db.query(
    'SELECT * FROM routine_days WHERE routine_id=$1 ORDER BY orden, id',
    [id]
  );
  if (!days.length) return { ...routine, days: [] };

  const dayIds = days.map((d) => d.id);
  const { rows: blocks } = await db.query(
    `SELECT rb.*, bt.nombre AS block_type_nombre
     FROM routine_blocks rb
     JOIN block_types bt ON rb.block_type_id = bt.id
     WHERE rb.routine_day_id = ANY($1)
     ORDER BY rb.routine_day_id, rb.orden, rb.id`,
    [dayIds]
  );

  let exercises = [];
  let sets = [];

  if (blocks.length) {
    const blockIds = blocks.map((b) => b.id);
    const { rows: exRows } = await db.query(
      `SELECT re.*, e.nombre AS exercise_nombre, e.video_url, e.video_file_path,
              c.nombre AS category_nombre
       FROM routine_exercises re
       JOIN exercises e ON re.exercise_id = e.id
       JOIN categories c ON e.category_id = c.id
       WHERE re.routine_block_id = ANY($1)
       ORDER BY re.routine_block_id, re.orden, re.id`,
      [blockIds]
    );
    exercises = exRows;

    if (exercises.length) {
      const reIds = exercises.map((e) => e.id);
      const { rows: setRows } = await db.query(
        'SELECT * FROM prescribed_sets WHERE routine_exercise_id = ANY($1) ORDER BY routine_exercise_id, orden, id',
        [reIds]
      );
      sets = setRows;
    }
  }

  // Assemble tree bottom-up
  const setsMap = {};
  sets.forEach((s) => {
    (setsMap[s.routine_exercise_id] ||= []).push(s);
  });

  const exMap = {};
  exercises.forEach((e) => {
    (exMap[e.routine_block_id] ||= []).push({ ...e, sets: setsMap[e.id] || [] });
  });

  const blocksMap = {};
  blocks.forEach((b) => {
    (blocksMap[b.routine_day_id] ||= []).push({ ...b, exercises: exMap[b.id] || [] });
  });

  return {
    ...routine,
    days: days.map((d) => ({ ...d, blocks: blocksMap[d.id] || [] })),
  };
}

async function create({ alumno_id, nombre, period_type, start_date }, createdBy) {
  const { rows } = await db.query(
    `INSERT INTO routines(alumno_id, nombre, period_type, start_date, created_by)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [alumno_id, nombre, period_type, start_date, createdBy]
  );
  return rows[0];
}

async function update(id, { nombre, period_type, start_date, activo }) {
  const { rows } = await db.query(
    `UPDATE routines SET nombre=$1, period_type=$2, start_date=$3, activo=$4
     WHERE id=$5 RETURNING *`,
    [nombre, period_type, start_date, activo, id]
  );
  if (!rows[0]) throw notFound('Rutina no encontrada');
  return rows[0];
}

async function remove(id) {
  const { rows } = await db.query('DELETE FROM routines WHERE id=$1 RETURNING id', [id]);
  if (!rows[0]) throw notFound('Rutina no encontrada');
}

// ── Days ──────────────────────────────────────────────────────────────────────

async function createDay(routineId, { etiqueta, orden }) {
  const { rows } = await db.query(
    'INSERT INTO routine_days(routine_id, etiqueta, orden) VALUES($1,$2,$3) RETURNING *',
    [routineId, etiqueta, orden ?? 0]
  );
  return rows[0];
}

async function updateDay(id, { etiqueta, orden }) {
  const { rows } = await db.query(
    'UPDATE routine_days SET etiqueta=$1, orden=$2 WHERE id=$3 RETURNING *',
    [etiqueta, orden ?? 0, id]
  );
  if (!rows[0]) throw notFound('Día no encontrado');
  return rows[0];
}

async function removeDay(id) {
  const { rows } = await db.query('DELETE FROM routine_days WHERE id=$1 RETURNING id', [id]);
  if (!rows[0]) throw notFound('Día no encontrado');
}

// ── Blocks ────────────────────────────────────────────────────────────────────

async function createBlock(dayId, { block_type_id, orden }) {
  const { rows } = await db.query(
    'INSERT INTO routine_blocks(routine_day_id, block_type_id, orden) VALUES($1,$2,$3) RETURNING *',
    [dayId, block_type_id, orden ?? 0]
  );
  return rows[0];
}

async function removeBlock(id) {
  const { rows } = await db.query('DELETE FROM routine_blocks WHERE id=$1 RETURNING id', [id]);
  if (!rows[0]) throw notFound('Bloque no encontrado');
}

// ── Exercises in routine ──────────────────────────────────────────────────────

async function addExercise(blockId, { exercise_id, orden, notas }) {
  const { rows } = await db.query(
    'INSERT INTO routine_exercises(routine_block_id, exercise_id, orden, notas) VALUES($1,$2,$3,$4) RETURNING *',
    [blockId, exercise_id, orden ?? 0, notas || null]
  );
  return rows[0];
}

async function removeExercise(id) {
  const { rows } = await db.query('DELETE FROM routine_exercises WHERE id=$1 RETURNING id', [id]);
  if (!rows[0]) throw notFound('Ejercicio no encontrado en la rutina');
}

// ── Prescribed sets ───────────────────────────────────────────────────────────

async function addSet(reId, { sets_count, reps, orden }) {
  const { rows } = await db.query(
    'INSERT INTO prescribed_sets(routine_exercise_id, sets_count, reps, orden) VALUES($1,$2,$3,$4) RETURNING *',
    [reId, sets_count, reps, orden ?? 0]
  );
  return rows[0];
}

async function updateSet(id, { sets_count, reps }) {
  const { rows } = await db.query(
    'UPDATE prescribed_sets SET sets_count=$1, reps=$2 WHERE id=$3 RETURNING *',
    [sets_count, reps, id]
  );
  if (!rows[0]) throw notFound('Serie no encontrada');
  return rows[0];
}

async function removeSet(id) {
  const { rows } = await db.query('DELETE FROM prescribed_sets WHERE id=$1 RETURNING id', [id]);
  if (!rows[0]) throw notFound('Serie no encontrada');
}

module.exports = {
  listBlockTypes,
  listForAlumno, list, getTree, create, update, remove,
  createDay, updateDay, removeDay,
  createBlock, removeBlock,
  addExercise, removeExercise,
  addSet, updateSet, removeSet,
};
