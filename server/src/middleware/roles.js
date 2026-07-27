function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Rol insuficiente' } });
    }
    next();
  };
}

function requireOwnerOrRole(getResourceOwnerId, ...roles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } });
    }
    if (roles.includes(req.user.role)) return next();
    try {
      const ownerId = await getResourceOwnerId(req);
      if (ownerId === req.user.id) return next();
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Sin acceso a este recurso' } });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireRole, requireOwnerOrRole };
