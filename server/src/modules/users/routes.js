const { Router } = require('express');
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');

const router = Router();

router.use(authenticate, requireRole('admin', 'profesor'));

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.patch('/:id/activo', controller.setActivo);

module.exports = router;
