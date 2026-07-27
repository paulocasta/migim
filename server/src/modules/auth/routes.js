const { Router } = require('express');
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');

const router = Router();

router.post('/login', controller.login);
router.get('/me', authenticate, controller.me);
router.post('/logout', authenticate, (_req, res) => res.json({ ok: true }));

module.exports = router;
