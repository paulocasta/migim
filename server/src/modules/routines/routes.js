const { Router } = require('express');
const ctrl = require('./controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');

const auth = authenticate;
const staff = requireRole('admin', 'profesor');

// /api/block-types
const blockTypesRouter = Router();
blockTypesRouter.get('/', auth, ctrl.listBlockTypes);

// /api/routines
const routinesRouter = Router();
routinesRouter.get('/', auth, ctrl.list);
routinesRouter.post('/', auth, staff, ctrl.create);
routinesRouter.get('/:id', auth, ctrl.getTree);
routinesRouter.put('/:id', auth, staff, ctrl.update);
routinesRouter.delete('/:id', auth, staff, ctrl.remove);
routinesRouter.post('/:routineId/days', auth, staff, ctrl.createDay);

// /api/routine-days
const daysRouter = Router();
daysRouter.put('/:dayId', auth, staff, ctrl.updateDay);
daysRouter.delete('/:dayId', auth, staff, ctrl.removeDay);
daysRouter.post('/:dayId/blocks', auth, staff, ctrl.createBlock);

// /api/routine-blocks
const blocksRouter = Router();
blocksRouter.delete('/:blockId', auth, staff, ctrl.removeBlock);
blocksRouter.post('/:blockId/exercises', auth, staff, ctrl.addExercise);

// /api/routine-exercises
const reRouter = Router();
reRouter.delete('/:reId', auth, staff, ctrl.removeExercise);
reRouter.post('/:reId/sets', auth, staff, ctrl.addSet);

// /api/prescribed-sets
const setsRouter = Router();
setsRouter.put('/:setId', auth, staff, ctrl.updateSet);
setsRouter.delete('/:setId', auth, staff, ctrl.removeSet);

module.exports = { blockTypesRouter, routinesRouter, daysRouter, blocksRouter, reRouter, setsRouter };
