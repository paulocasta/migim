const { z } = require('zod');
const path = require('path');
const service = require('./service');

const exerciseSchema = z.object({
  category_id: z.number().int().positive(),
  nombre: z.string().min(2, 'Nombre mínimo 2 caracteres'),
  descripcion: z.string().optional(),
  video_url: z.string().url().optional().or(z.literal('')),
});

function badRequest(res, message) {
  return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message } });
}

async function list(req, res, next) {
  try {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    res.json({ exercises: await service.list({ categoryId }) });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    res.json({ exercise: await service.getById(Number(req.params.id)) });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const body = { ...req.body, category_id: Number(req.body.category_id) };
    const parsed = exerciseSchema.safeParse(body);
    if (!parsed.success) return badRequest(res, parsed.error.errors[0].message);
    res.status(201).json({ exercise: await service.create(parsed.data, req.user.id) });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const body = { ...req.body, category_id: Number(req.body.category_id) };
    const parsed = exerciseSchema.safeParse(body);
    if (!parsed.success) return badRequest(res, parsed.error.errors[0].message);
    res.json({ exercise: await service.update(Number(req.params.id), parsed.data) });
  } catch (err) { next(err); }
}

async function uploadVideo(req, res, next) {
  try {
    if (!req.file) return badRequest(res, 'No se recibió archivo de video');
    const filename = path.basename(req.file.filename);
    res.json({ exercise: await service.setVideoFile(Number(req.params.id), filename) });
  } catch (err) { next(err); }
}

async function clearVideo(req, res, next) {
  try {
    res.json({ exercise: await service.clearVideoFile(Number(req.params.id)) });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await service.remove(Number(req.params.id));
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, uploadVideo, clearVideo, remove };
