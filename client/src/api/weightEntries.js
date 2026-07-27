import api from './client';

export const weightEntriesApi = {
  list: (fecha) =>
    api.get('/weight-entries', { params: fecha ? { fecha } : {} }).then((r) => r.data.entries),
  upsert: (data) =>
    api.post('/weight-entries', data).then((r) => r.data.entry),
  remove: (id) => api.delete(`/weight-entries/${id}`),
};
