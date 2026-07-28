const svc = require('./service');

function resolveAlumnoId(req, res) {
  if (req.user.role === 'alumno') return req.user.id;
  const id = Number(req.query.alumnoId);
  if (!id) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'alumnoId requerido para staff' } });
    return null;
  }
  return id;
}

async function loggedExercises(req, res, next) {
  try {
    const alumnoId = resolveAlumnoId(req, res);
    if (!alumnoId) return;
    res.json({ exercises: await svc.loggedExercises(alumnoId) });
  } catch (err) { next(err); }
}

async function progress(req, res, next) {
  try {
    const alumnoId = resolveAlumnoId(req, res);
    if (!alumnoId) return;
    const exerciseId = Number(req.query.exerciseId);
    if (!exerciseId) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'exerciseId requerido' } });
    res.json({ data: await svc.progress(alumnoId, exerciseId, req.query.from, req.query.to) });
  } catch (err) { next(err); }
}

async function volume(req, res, next) {
  try {
    const alumnoId = resolveAlumnoId(req, res);
    if (!alumnoId) return;
    const groupBy = req.query.groupBy === 'week' ? 'week' : 'session';
    res.json({ data: await svc.volume(alumnoId, groupBy, req.query.from, req.query.to) });
  } catch (err) { next(err); }
}

async function prs(req, res, next) {
  try {
    const alumnoId = resolveAlumnoId(req, res);
    if (!alumnoId) return;
    res.json({ data: await svc.prs(alumnoId, req.query.from, req.query.to) });
  } catch (err) { next(err); }
}

async function attendance(req, res, next) {
  try {
    const alumnoId = resolveAlumnoId(req, res);
    if (!alumnoId) return;
    res.json({ data: await svc.attendance(alumnoId, req.query.from, req.query.to) });
  } catch (err) { next(err); }
}

module.exports = { loggedExercises, progress, volume, prs, attendance };
