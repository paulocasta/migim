const { Router } = require('express');
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');

const router = Router();

router.get('/', authenticate, controller.list);

router.post('/', authenticate, requireRole('admin', 'profesor'), controller.create);
router.put('/:id', authenticate, requireRole('admin', 'profesor'), controller.update);
router.delete('/:id', authenticate, requireRole('admin', 'profesor'), controller.remove);

module.exports = router;
