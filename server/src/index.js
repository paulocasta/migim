const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// estáticos: videos subidos
app.use('/uploads', express.static(path.join(__dirname, '..', config.uploadsDir)));

// rutas
app.use('/api/auth', require('./modules/auth/routes'));
app.use('/api/users', require('./modules/users/routes'));
app.use('/api/categories', require('./modules/categories/routes'));
app.use('/api/exercises', require('./modules/exercises/routes'));

const routineRoutes = require('./modules/routines/routes');
app.use('/api/block-types', routineRoutes.blockTypesRouter);
app.use('/api/routines', routineRoutes.routinesRouter);
app.use('/api/routine-days', routineRoutes.daysRouter);
app.use('/api/routine-blocks', routineRoutes.blocksRouter);
app.use('/api/routine-exercises', routineRoutes.reRouter);
app.use('/api/prescribed-sets', routineRoutes.setsRouter);

// health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// 404
app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } }));

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Migim API corriendo en http://localhost:${config.port}`);
});
