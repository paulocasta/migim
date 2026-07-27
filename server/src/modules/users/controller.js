const { z } = require('zod');
const service = require('./service');

const createSchema = z.object({
  nombre: z.string().min(2, 'Nombre mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña mínimo 6 caracteres'),
  role: z.enum(['alumno', 'profesor', 'admin']),
});

const updateSchema = z.object({
  nombre: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional().or(z.literal('')),
});

function badRequest(res, message) {
  return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message } });
}

async function list(req, res, next) {
  try {
    const users = await service.list({
      filterRole: req.query.role || null,
      requesterRole: req.user.role,
    });
    res.json({ users });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const user = await service.getById(Number(req.params.id));
    res.json({ user });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.errors[0].message);

    const { role } = parsed.data;
    if (req.user.role === 'profesor' && role !== 'alumno') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Profe solo puede crear alumnos' } });
    }
    if (role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Solo admin puede crear admins' } });
    }

    const user = await service.create(parsed.data, req.user.id);
    res.status(201).json({ user });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.errors[0].message);
    const user = await service.update(Number(req.params.id), parsed.data);
    res.json({ user });
  } catch (err) { next(err); }
}

async function setActivo(req, res, next) {
  try {
    const { activo } = req.body;
    if (typeof activo !== 'boolean') return badRequest(res, 'activo debe ser boolean');
    const user = await service.setActivo(Number(req.params.id), activo);
    res.json({ user });
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, setActivo };
