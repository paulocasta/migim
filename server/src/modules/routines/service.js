const db = require('../../db/connection');

// ── Helpers ───────────────────────────────────────────────────────────────────

function notFound(msg) {
  return Object.assign(new Error(msg), { status: 404 });
}

function forbidden(msg) {
  return Object.assign(new Error(msg), { status: 403 });
}

function badRequest(msg) {
  return Object.assign(new Error(msg), { status: 400 });
}

// routine_days.fecha / routines.start_date vuelven de pg como Date (medianoche local),
// no como string — hay que normalizar antes de usarlos con addDays/mondayOf (que operan sobre 'YYYY-MM-DD')
function toDateStr(value) {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// 'YYYY-MM-DD' + n días → 'YYYY-MM-DD' (aritmética en UTC, sin corrimientos por huso horario)
function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// 'YYYY-MM-DD' → 'YYYY-MM-DD' del lunes de esa semana (semana ISO: lunes a domingo)
function mondayOf(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay(); // 0=domingo..6=sábado
  const offset = day === 0 ? 6 : day - 1;
  return addDays(dateStr, -offset);
}

// Genera Lunes..Domingo × numWeeks, con fecha real, arrancando en startMonday
function buildWeekDays(startMonday, numWeeks) {
  const days = [];
  for (let w = 0; w < numWeeks; w++) {
    const weekMonday = addDays(startMonday, w * 7);
    WEEKDAY_LABELS.forEach((etiqueta, i) => {
      days.push({
        etiqueta,
        fecha: addDays(weekMonday, i),
        orden: w * 7 + i,
      });
    });
  }
  return days;
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
              e.requiere_peso, c.nombre AS category_nombre
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
  const isPersonalizada = period_type === 'personalizada';
  const effectiveStartDate = isPersonalizada ? start_date : mondayOf(start_date);

  const { rows } = await db.query(
    `INSERT INTO routines(alumno_id, nombre, period_type, start_date, created_by)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [alumno_id, nombre, period_type, effectiveStartDate, createdBy]
  );
  const routine = rows[0];

  if (!isPersonalizada) {
    const weekDays = buildWeekDays(effectiveStartDate, period_type === 'mensual' ? 4 : 1);
    const values = [];
    const params = [];
    weekDays.forEach(({ etiqueta, fecha, orden }, i) => {
      const base = i * 4;
      values.push(`($${base + 1},$${base + 2},$${base + 3},$${base + 4})`);
      params.push(routine.id, etiqueta, fecha, orden);
    });
    await db.query(
      `INSERT INTO routine_days(routine_id, etiqueta, fecha, orden) VALUES ${values.join(',')}`,
      params
    );
  }

  return routine;
}

async function update(id, { nombre, period_type, start_date, activo }, { requesterId, requesterRole }) {
  const { rows: [existing] } = await db.query('SELECT id, created_by FROM routines WHERE id=$1', [id]);
  if (!existing) throw notFound('Rutina no encontrada');
  if (requesterRole !== 'admin' && existing.created_by !== requesterId) {
    throw forbidden('No tenés permiso para editar esta rutina');
  }
  const { rows } = await db.query(
    `UPDATE routines SET nombre=$1, period_type=$2, start_date=$3, activo=$4
     WHERE id=$5 RETURNING *`,
    [nombre, period_type, start_date, activo, id]
  );
  return rows[0];
}

async function remove(id, { requesterId, requesterRole }) {
  const { rows: [routine] } = await db.query('SELECT id, created_by FROM routines WHERE id=$1', [id]);
  if (!routine) throw notFound('Rutina no encontrada');
  if (requesterRole !== 'admin' && routine.created_by !== requesterId) {
    throw forbidden('No tenés permiso para eliminar esta rutina');
  }
  await db.query('DELETE FROM routines WHERE id=$1', [id]);
}

async function copyRoutine(sourceId, { nombre, start_date }, { requesterId, requesterRole }) {
  const source = await getTree(sourceId); // throws notFound si no existe
  if (requesterRole !== 'admin' && source.created_by !== requesterId) {
    throw forbidden('No tenés permiso para copiar esta rutina');
  }

  const isPersonalizada = source.period_type === 'personalizada';
  const newAnchor = isPersonalizada ? start_date : mondayOf(start_date);
  const sourceAnchor = toDateStr(source.start_date);
  if (newAnchor === sourceAnchor) {
    throw badRequest('Elegí una fecha distinta a la de la rutina original');
  }
  const deltaDays = Math.round(
    (new Date(`${newAnchor}T00:00:00Z`) - new Date(`${sourceAnchor}T00:00:00Z`)) / 86400000
  );

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [routine] } = await client.query(
      `INSERT INTO routines(alumno_id, nombre, period_type, start_date, created_by, activo)
       VALUES($1,$2,$3,$4,$5,true) RETURNING *`,
      [source.alumno_id, nombre || `${source.nombre} (copia)`, source.period_type, newAnchor, requesterId]
    );

    for (const day of source.days) {
      const newFecha = day.fecha == null ? null : addDays(toDateStr(day.fecha), deltaDays);
      const { rows: [newDay] } = await client.query(
        'INSERT INTO routine_days(routine_id, etiqueta, fecha, orden) VALUES($1,$2,$3,$4) RETURNING id',
        [routine.id, day.etiqueta, newFecha, day.orden]
      );

      for (const block of day.blocks) {
        const { rows: [newBlock] } = await client.query(
          'INSERT INTO routine_blocks(routine_day_id, block_type_id, orden) VALUES($1,$2,$3) RETURNING id',
          [newDay.id, block.block_type_id, block.orden]
        );

        for (const ex of block.exercises) {
          const { rows: [newEx] } = await client.query(
            'INSERT INTO routine_exercises(routine_block_id, exercise_id, orden, notas) VALUES($1,$2,$3,$4) RETURNING id',
            [newBlock.id, ex.exercise_id, ex.orden, ex.notas]
          );

          for (const set of ex.sets) {
            await client.query(
              'INSERT INTO prescribed_sets(routine_exercise_id, orden, sets_count, reps) VALUES($1,$2,$3,$4)',
              [newEx.id, set.orden, set.sets_count, set.reps]
            );
          }
        }
      }
    }

    await client.query('COMMIT');
    return routine;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function copyDayTo(sourceDayId, targetDayIds) {
  const { rows: [sourceDay] } = await db.query(
    'SELECT id, routine_id FROM routine_days WHERE id=$1',
    [sourceDayId]
  );
  if (!sourceDay) throw notFound('Día no encontrado');

  const { rows: blocks } = await db.query(
    `SELECT rb.* FROM routine_blocks rb WHERE rb.routine_day_id = $1 ORDER BY rb.orden, rb.id`,
    [sourceDayId]
  );

  let exercises = [];
  let sets = [];
  if (blocks.length) {
    const blockIds = blocks.map((b) => b.id);
    const { rows: exRows } = await db.query(
      'SELECT * FROM routine_exercises WHERE routine_block_id = ANY($1) ORDER BY routine_block_id, orden, id',
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

  const exByBlock = {};
  exercises.forEach((e) => (exByBlock[e.routine_block_id] ||= []).push(e));
  const setsByEx = {};
  sets.forEach((s) => (setsByEx[s.routine_exercise_id] ||= []).push(s));

  const targetIds = [...new Set(targetDayIds)].filter((id) => id !== sourceDayId);
  if (!targetIds.length) throw badRequest('Elegí al menos un día destino distinto del día origen');

  const { rows: targetDays } = await db.query(
    'SELECT id FROM routine_days WHERE id = ANY($1) AND routine_id = $2',
    [targetIds, sourceDay.routine_id]
  );
  if (targetDays.length !== targetIds.length) {
    throw badRequest('Los días destino deben pertenecer a la misma rutina');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    for (const targetDayId of targetIds) {
      await client.query('DELETE FROM routine_blocks WHERE routine_day_id=$1', [targetDayId]);

      for (const block of blocks) {
        const { rows: [newBlock] } = await client.query(
          'INSERT INTO routine_blocks(routine_day_id, block_type_id, orden) VALUES($1,$2,$3) RETURNING id',
          [targetDayId, block.block_type_id, block.orden]
        );

        for (const ex of exByBlock[block.id] || []) {
          const { rows: [newEx] } = await client.query(
            'INSERT INTO routine_exercises(routine_block_id, exercise_id, orden, notas) VALUES($1,$2,$3,$4) RETURNING id',
            [newBlock.id, ex.exercise_id, ex.orden, ex.notas]
          );

          for (const set of setsByEx[ex.id] || []) {
            await client.query(
              'INSERT INTO prescribed_sets(routine_exercise_id, orden, sets_count, reps) VALUES($1,$2,$3,$4)',
              [newEx.id, set.orden, set.sets_count, set.reps]
            );
          }
        }
      }
    }

    await client.query('COMMIT');
    return { updated_day_ids: targetIds };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Days ──────────────────────────────────────────────────────────────────────

async function createDay(routineId, { etiqueta, orden, fecha }) {
  const { rows } = await db.query(
    'INSERT INTO routine_days(routine_id, etiqueta, orden, fecha) VALUES($1,$2,$3,$4) RETURNING *',
    [routineId, etiqueta, orden ?? 0, fecha ?? null]
  );
  return rows[0];
}

async function updateDay(id, { etiqueta, orden, fecha }) {
  const { rows } = await db.query(
    'UPDATE routine_days SET etiqueta=$1, orden=$2, fecha=$3 WHERE id=$4 RETURNING *',
    [etiqueta, orden ?? 0, fecha ?? null, id]
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
  listForAlumno, list, getTree, create, update, remove, copyRoutine,
  createDay, updateDay, removeDay, copyDayTo,
  createBlock, removeBlock,
  addExercise, removeExercise,
  addSet, updateSet, removeSet,
};
