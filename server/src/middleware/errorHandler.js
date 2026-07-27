function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.type === 'validation') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.message, details: err.details } });
  }
  if (err.code === '23505') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'Ya existe un registro con esos datos' } });
  }
  const status = err.status || 500;
  res.status(status).json({ error: { code: 'INTERNAL_ERROR', message: err.message || 'Error interno del servidor' } });
}

module.exports = { errorHandler };
