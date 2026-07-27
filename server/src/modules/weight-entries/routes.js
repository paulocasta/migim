const { Router } = require('express');
const ctrl = require('./controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');

const router = Router();

router.use(authenticate, requireRole('alumno'));

router.get('/', ctrl.list);
router.post('/', ctrl.upsert);
router.delete('/:id', ctrl.remove);

module.exports = router;
