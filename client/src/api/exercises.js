import api from './client';

export const exercisesApi = {
  list: (categoryId) =>
    api.get('/exercises', { params: categoryId ? { categoryId } : {} }).then((r) => r.data.exercises),
  getById: (id) => api.get(`/exercises/${id}`).then((r) => r.data.exercise),
  create: (data) => api.post('/exercises', data).then((r) => r.data.exercise),
  update: (id, data) => api.put(`/exercises/${id}`, data).then((r) => r.data.exercise),
  remove: (id) => api.delete(`/exercises/${id}`),
  uploadVideo: (id, file) => {
    const fd = new FormData();
    fd.append('video', file);
    return api.post(`/exercises/${id}/video`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.exercise);
  },
  clearVideo: (id) => api.delete(`/exercises/${id}/video`).then((r) => r.data.exercise),
};
