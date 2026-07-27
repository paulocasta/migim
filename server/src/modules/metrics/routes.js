const { Router } = require('express');
const ctrl = require('./controller');
const { authenticate } = require('../../middleware/auth');

const router = Router();

router.use(authenticate);

router.get('/exercises', ctrl.loggedExercises);
router.get('/progress', ctrl.progress);
router.get('/volume', ctrl.volume);
router.get('/prs', ctrl.prs);
router.get('/attendance', ctrl.attendance);

module.exports = router;
