const { z } = require('zod');
const svc = require('./service');

const upsertSchema = z.object({
  prescribed_set_id: z.number().int().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha debe ser YYYY-MM-DD'),
  peso: z.number().positive('peso debe ser positivo'),
  nota: z.string().optional(),
});

async function list(req, res, next) {
  try {
    const entries = await svc.list(req.user.id, { fecha: req.query.fecha });
    res.json({ entries });
  } catch (err) { next(err); }
}

async function upsert(req, res, next) {
  try {
    const body = { ...req.body, prescribed_set_id: Number(req.body.prescribed_set_id), peso: Number(req.body.peso) };
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message } });
    }
    const entry = await svc.upsert(parsed.data, req.user.id);
    res.json({ entry });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await svc.remove(Number(req.params.id), req.user.id);
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { list, upsert, remove };
