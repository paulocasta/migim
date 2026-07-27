const { z } = require('zod');
const svc = require('./service');

function bad(res, msg) {
  return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: msg } });
}

// ── Block types ───────────────────────────────────────────────────────────────
async function listBlockTypes(_req, res, next) {
  try { res.json({ block_types: await svc.listBlockTypes() }); }
  catch (err) { next(err); }
}

// ── Routines ──────────────────────────────────────────────────────────────────
async function list(req, res, next) {
  try {
    const routines = await svc.list({
      alumnoId: req.query.alumnoId ? Number(req.query.alumnoId) : null,
      requesterRole: req.user.role,
      requesterId: req.user.id,
    });
    res.json({ routines });
  } catch (err) { next(err); }
}

async function getTree(req, res, next) {
  try { res.json({ routine: await svc.getTree(Number(req.params.id)) }); }
  catch (err) { next(err); }
}

const createSchema = z.object({
  alumno_id: z.number().int().positive(),
  nombre: z.string().min(2),
  period_type: z.enum(['semanal', 'mensual']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe ser YYYY-MM-DD'),
});

async function create(req, res, next) {
  try {
    const parsed = createSchema.safeParse({ ...req.body, alumno_id: Number(req.body.alumno_id) });
    if (!parsed.success) return bad(res, parsed.error.errors[0].message);
    res.status(201).json({ routine: await svc.create(parsed.data, req.user.id) });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { nombre, period_type, start_date, activo } = req.body;
    if (!nombre) return bad(res, 'nombre requerido');
    res.json({ routine: await svc.update(Number(req.params.id), { nombre, period_type, start_date, activo }) });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try { await svc.remove(Number(req.params.id)); res.status(204).end(); }
  catch (err) { next(err); }
}

// ── Days ──────────────────────────────────────────────────────────────────────
async function createDay(req, res, next) {
  try {
    const { etiqueta, orden } = req.body;
    if (!etiqueta) return bad(res, 'etiqueta requerida');
    res.status(201).json({ day: await svc.createDay(Number(req.params.routineId), { etiqueta, orden }) });
  } catch (err) { next(err); }
}

async function updateDay(req, res, next) {
  try {
    const { etiqueta, orden } = req.body;
    if (!etiqueta) return bad(res, 'etiqueta requerida');
    res.json({ day: await svc.updateDay(Number(req.params.dayId), { etiqueta, orden }) });
  } catch (err) { next(err); }
}

async function removeDay(req, res, next) {
  try { await svc.removeDay(Number(req.params.dayId)); res.status(204).end(); }
  catch (err) { next(err); }
}

// ── Blocks ────────────────────────────────────────────────────────────────────
async function createBlock(req, res, next) {
  try {
    const { block_type_id, orden } = req.body;
    if (!block_type_id) return bad(res, 'block_type_id requerido');
    res.status(201).json({ block: await svc.createBlock(Number(req.params.dayId), { block_type_id: Number(block_type_id), orden }) });
  } catch (err) { next(err); }
}

async function removeBlock(req, res, next) {
  try { await svc.removeBlock(Number(req.params.blockId)); res.status(204).end(); }
  catch (err) { next(err); }
}

// ── Exercises ─────────────────────────────────────────────────────────────────
async function addExercise(req, res, next) {
  try {
    const { exercise_id, orden, notas } = req.body;
    if (!exercise_id) return bad(res, 'exercise_id requerido');
    res.status(201).json({ exercise: await svc.addExercise(Number(req.params.blockId), { exercise_id: Number(exercise_id), orden, notas }) });
  } catch (err) { next(err); }
}

async function removeExercise(req, res, next) {
  try { await svc.removeExercise(Number(req.params.reId)); res.status(204).end(); }
  catch (err) { next(err); }
}

// ── Sets ──────────────────────────────────────────────────────────────────────
async function addSet(req, res, next) {
  try {
    const { sets_count, reps, orden } = req.body;
    if (!sets_count || !reps) return bad(res, 'sets_count y reps requeridos');
    res.status(201).json({ set: await svc.addSet(Number(req.params.reId), { sets_count: Number(sets_count), reps: Number(reps), orden }) });
  } catch (err) { next(err); }
}

async function updateSet(req, res, next) {
  try {
    const { sets_count, reps } = req.body;
    if (!sets_count || !reps) return bad(res, 'sets_count y reps requeridos');
    res.json({ set: await svc.updateSet(Number(req.params.setId), { sets_count: Number(sets_count), reps: Number(reps) }) });
  } catch (err) { next(err); }
}

async function removeSet(req, res, next) {
  try { await svc.removeSet(Number(req.params.setId)); res.status(204).end(); }
  catch (err) { next(err); }
}

module.exports = {
  listBlockTypes,
  list, getTree, create, update, remove,
  createDay, updateDay, removeDay,
  createBlock, removeBlock,
  addExercise, removeExercise,
  addSet, updateSet, removeSet,
};
