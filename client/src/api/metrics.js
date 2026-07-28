import api from './client';

const p = (alumnoId) => (alumnoId ? { alumnoId } : {});

export const metricsApi = {
  loggedExercises: (alumnoId) =>
    api.get('/metrics/exercises', { params: p(alumnoId) }).then((r) => r.data.exercises),
  progress: (exerciseId, alumnoId, from, to) =>
    api.get('/metrics/progress', { params: { exerciseId, from, to, ...p(alumnoId) } }).then((r) => r.data.data),
  volume: (groupBy, alumnoId, from, to) =>
    api.get('/metrics/volume', { params: { groupBy, from, to, ...p(alumnoId) } }).then((r) => r.data.data),
  prs: (alumnoId, from, to) =>
    api.get('/metrics/prs', { params: { from, to, ...p(alumnoId) } }).then((r) => r.data.data),
  attendance: (from, to, alumnoId) =>
    api.get('/metrics/attendance', { params: { from, to, ...p(alumnoId) } }).then((r) => r.data.data),
};
