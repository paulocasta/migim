const { z } = require('zod');
const service = require('./service');

const schema = z.object({
  nombre: z.string().min(2, 'Nombre mínimo 2 caracteres'),
  orden: z.number().int().optional(),
});

async function list(_req, res, next) {
  try {
    res.json({ categories: await service.list() });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message } });
    }
    res.status(201).json({ category: await service.create(parsed.data) });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message } });
    }
    res.json({ category: await service.update(Number(req.params.id), parsed.data) });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await service.remove(Number(req.params.id));
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove };
