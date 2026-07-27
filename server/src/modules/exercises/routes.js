const { Router } = require('express');
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');
const upload = require('../../middleware/upload');

const router = Router();

const staff = requireRole('admin', 'profesor');

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, controller.getById);

router.post('/', authenticate, staff, controller.create);
router.put('/:id', authenticate, staff, controller.update);
router.delete('/:id', authenticate, staff, controller.remove);

router.post('/:id/video', authenticate, staff, upload.single('video'), controller.uploadVideo);
router.delete('/:id/video', authenticate, staff, controller.clearVideo);

module.exports = router;
