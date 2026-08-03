import api from './client';

export const blockTypesApi = {
  list: () => api.get('/block-types').then((r) => r.data.block_types),
};

export const routinesApi = {
  mine: () => api.get('/routines/mine').then((r) => r.data.routines),
  list: (alumnoId) =>
    api.get('/routines', { params: alumnoId ? { alumnoId } : {} }).then((r) => r.data.routines),
  getTree: (id) => api.get(`/routines/${id}`).then((r) => r.data.routine),
  create: (data) => api.post('/routines', data).then((r) => r.data.routine),
  update: (id, data) => api.put(`/routines/${id}`, data).then((r) => r.data.routine),
  remove: (id) => api.delete(`/routines/${id}`),
  copy: (id, data) => api.post(`/routines/${id}/copy`, data).then((r) => r.data.routine),

  createDay: (routineId, data) =>
    api.post(`/routines/${routineId}/days`, data).then((r) => r.data.day),
  updateDay: (dayId, data) =>
    api.put(`/routine-days/${dayId}`, data).then((r) => r.data.day),
  removeDay: (dayId) => api.delete(`/routine-days/${dayId}`),

  createBlock: (dayId, data) =>
    api.post(`/routine-days/${dayId}/blocks`, data).then((r) => r.data.block),
  removeBlock: (blockId) => api.delete(`/routine-blocks/${blockId}`),

  addExercise: (blockId, data) =>
    api.post(`/routine-blocks/${blockId}/exercises`, data).then((r) => r.data.exercise),
  removeExercise: (reId) => api.delete(`/routine-exercises/${reId}`),

  addSet: (reId, data) =>
    api.post(`/routine-exercises/${reId}/sets`, data).then((r) => r.data.set),
  updateSet: (setId, data) =>
    api.put(`/prescribed-sets/${setId}`, data).then((r) => r.data.set),
  removeSet: (setId) => api.delete(`/prescribed-sets/${setId}`),
};
